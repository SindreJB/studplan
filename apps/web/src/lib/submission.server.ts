import { db } from "@repo/db";
import { schema } from "@repo/db/schema";
import { Result } from "better-result";
import { and, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";

import { CourseSyncError } from "./course-sync.server";

const { calendar, calendarCourse, courseSubmission, user } = schema;

export interface SubmissionInput {
  title: string;
  dueAt: number;
  description: string | null;
  link: string | null;
}

export type CourseSubmissionSelection = { semester: string; courseId: string; term: number };

export interface CalendarSubmission {
  id: string;
  courseId: string;
  term: number;
  title: string;
  dueAt: number;
  description: string | null;
  link: string | null;
  createdBy: string | null;
  createdByName: string | null;
  isMine: boolean;
}

export type CreateSubmissionResult =
  | { created: true; id: string }
  | { created: false; reason: "not-tracked" | "duplicate" };

function databaseError(operation: "read" | "write", cause: unknown) {
  return new CourseSyncError({
    operation,
    message: `Could not ${operation} submission deadlines`,
    cause,
  });
}

function courseKey({ courseId, term }: { courseId: string; term: number }) {
  return `${courseId}\0${term}`;
}

function readCalendarCourses(userId: string, calendarId: string, semester: string) {
  return Result.tryPromise({
    try: () =>
      db
        .select({
          courseId: calendarCourse.courseId,
          term: calendarCourse.term,
          includeSubmissionDates: calendarCourse.includeSubmissionDates,
        })
        .from(calendarCourse)
        .innerJoin(calendar, eq(calendar.id, calendarCourse.calendarId))
        .where(
          and(
            eq(calendar.userId, userId),
            eq(calendar.id, calendarId),
            eq(calendarCourse.semester, semester),
          ),
        ),
    catch: (cause) => databaseError("read", cause),
  });
}

/**
 * Lists every deadline registered for the courses of this calendar. Deadlines are
 * shared between all calendars tracking the same course, so the rows are not
 * filtered by author.
 */
export function listCalendarSubmissions(userId: string, calendarId: string, semester: string) {
  return Result.gen(async function* () {
    const courses = yield* Result.await(readCalendarCourses(userId, calendarId, semester));
    if (courses.length === 0) {
      const none: CalendarSubmission[] = [];
      return Result.ok(none);
    }

    const rows = yield* Result.await(
      Result.tryPromise({
        try: () =>
          db
            .select({
              id: courseSubmission.id,
              courseId: courseSubmission.courseId,
              term: courseSubmission.term,
              title: courseSubmission.title,
              dueAt: courseSubmission.dueAt,
              description: courseSubmission.description,
              link: courseSubmission.link,
              createdBy: courseSubmission.createdBy,
              createdByName: user.name,
            })
            .from(courseSubmission)
            .leftJoin(user, eq(user.id, courseSubmission.createdBy))
            .where(
              and(
                eq(courseSubmission.semester, semester),
                inArray(
                  courseSubmission.courseId,
                  courses.map((course) => course.courseId),
                ),
              ),
            ),
        catch: (cause) => databaseError("read", cause),
      }),
    );

    const tracked = new Set(courses.map(courseKey));
    const submissions: CalendarSubmission[] = rows
      .filter((row) => tracked.has(courseKey(row)))
      .map((row) => ({ ...row, isMine: row.createdBy === userId }))
      .sort((left, right) => left.dueAt - right.dueAt);
    return Result.ok(submissions);
  });
}

function requireTrackedCourse(
  userId: string,
  calendarId: string,
  selection: CourseSubmissionSelection,
) {
  return Result.tryPromise({
    try: async () => {
      const [tracked] = await db
        .select({ calendarId: calendarCourse.calendarId })
        .from(calendarCourse)
        .innerJoin(calendar, eq(calendar.id, calendarCourse.calendarId))
        .where(
          and(
            eq(calendar.userId, userId),
            eq(calendar.id, calendarId),
            eq(calendarCourse.semester, selection.semester),
            eq(calendarCourse.courseId, selection.courseId),
            eq(calendarCourse.term, selection.term),
          ),
        )
        .limit(1);
      return tracked != null;
    },
    catch: (cause) => databaseError("read", cause),
  });
}

/** Creates a deadline for a course the user tracks in this calendar. */
export function createCourseSubmission(
  userId: string,
  calendarId: string,
  selection: CourseSubmissionSelection,
  input: SubmissionInput,
) {
  return Result.gen(async function* () {
    const tracked = yield* Result.await(requireTrackedCourse(userId, calendarId, selection));
    if (!tracked) {
      const notTracked: CreateSubmissionResult = { created: false, reason: "not-tracked" };
      return Result.ok(notTracked);
    }

    const inserted = yield* Result.await(
      Result.tryPromise({
        try: () =>
          db
            .insert(courseSubmission)
            .values({
              id: nanoid(12),
              semester: selection.semester,
              courseId: selection.courseId,
              term: selection.term,
              title: input.title,
              dueAt: input.dueAt,
              description: input.description,
              link: input.link,
              createdBy: userId,
            })
            .onConflictDoNothing()
            .returning({ id: courseSubmission.id }),
        catch: (cause) => databaseError("write", cause),
      }),
    );
    if (!inserted[0]) {
      const duplicate: CreateSubmissionResult = { created: false, reason: "duplicate" };
      return Result.ok(duplicate);
    }

    const created: CreateSubmissionResult = { created: true, id: inserted[0].id };
    return Result.ok(created);
  });
}

function readSubmissionSelection(submissionId: string) {
  return Result.tryPromise({
    try: async () => {
      const [row] = await db
        .select({
          semester: courseSubmission.semester,
          courseId: courseSubmission.courseId,
          term: courseSubmission.term,
        })
        .from(courseSubmission)
        .where(eq(courseSubmission.id, submissionId))
        .limit(1);
      return row ?? null;
    },
    catch: (cause) => databaseError("read", cause),
  });
}

/**
 * Runs a write against a deadline of a course the user tracks in this calendar.
 * Every signed-in user may do this today; when admin roles land, this is the one
 * place that has to require them and send everyone else down the proposal path.
 */
function withManagedSubmission(
  userId: string,
  calendarId: string,
  submissionId: string,
  write: () => Promise<boolean>,
) {
  return Result.gen(async function* () {
    const selection = yield* Result.await(readSubmissionSelection(submissionId));
    if (!selection) return Result.ok(false);

    const tracked = yield* Result.await(requireTrackedCourse(userId, calendarId, selection));
    if (!tracked) return Result.ok(false);

    const written = yield* Result.await(
      Result.tryPromise({ try: write, catch: (cause) => databaseError("write", cause) }),
    );
    return Result.ok(written);
  });
}

/** Updates a shared deadline. See {@link withManagedSubmission} for who may do it. */
export function updateCourseSubmission(
  userId: string,
  calendarId: string,
  submissionId: string,
  input: SubmissionInput,
) {
  return withManagedSubmission(userId, calendarId, submissionId, async () => {
    const updated = await db
      .update(courseSubmission)
      .set({
        title: input.title,
        dueAt: input.dueAt,
        description: input.description,
        link: input.link,
        updatedAt: new Date(),
      })
      .where(eq(courseSubmission.id, submissionId))
      .returning({ id: courseSubmission.id });
    return updated.length > 0;
  });
}

/** Deletes a shared deadline. See {@link withManagedSubmission} for who may do it. */
export function deleteCourseSubmission(userId: string, calendarId: string, submissionId: string) {
  return withManagedSubmission(userId, calendarId, submissionId, async () => {
    const deleted = await db
      .delete(courseSubmission)
      .where(eq(courseSubmission.id, submissionId))
      .returning({ id: courseSubmission.id });
    return deleted.length > 0;
  });
}
