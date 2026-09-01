import { db } from "@repo/db";
import { schema, type CourseScheduleEvent } from "@repo/db/schema";
import { Result, TaggedError } from "better-result";
import { and, eq, inArray, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

import { includeCourseEvent } from "./course-event-filter";
import { getCourseExams, type NtnuExam } from "./ntnu-exam.server";
import {
  getCourseSchedule,
  getCourses,
  type CourseSelection,
  type Schedule,
  type TpApiError,
} from "./tp.server";

const { calendar, calendarCourse, courseCatalog, courseSchedule } = schema;

const TP_BATCH_SIZE = 20;

export class CourseSyncError extends TaggedError("CourseSyncError")<{
  operation: "read" | "write";
  message: string;
  cause: unknown;
}> {}

class CourseNotFoundError extends TaggedError("CourseNotFoundError")<{
  semester: string;
  courseId: string;
  term: number;
  message: string;
}> {}

export type Selection = CourseSelection & { semester: string };
type SyncFailure = {
  selections: readonly Selection[];
  error: TpApiError | CourseSyncError;
};

function chunks<T>(values: readonly T[], size: number) {
  return Array.from({ length: Math.ceil(values.length / size) }, (_, index) =>
    values.slice(index * size, (index + 1) * size),
  );
}

export function currentSemester(date = new Date()) {
  return `${String(date.getUTCFullYear()).slice(-2)}${date.getUTCMonth() < 6 ? "v" : "h"}`;
}

function databaseError(operation: "read" | "write", cause: unknown) {
  return new CourseSyncError({
    operation,
    message: `Could not ${operation} course data`,
    cause,
  });
}

export function syncCourseCatalog(semester: string) {
  return Result.gen(async function* () {
    const sourceCourses = yield* Result.await(getCourses(semester));
    const courses = sourceCourses.flatMap((item) =>
      item.term.map(({ term }) => ({
        id: item.id,
        term,
        name: item.name,
        nameNb: item.nameNb,
        nameEn: item.nameEn,
        nameNn: item.nameNn,
        campusId: item.campusid,
      })),
    );
    const syncedAt = new Date();

    yield* Result.await(
      Result.tryPromise({
        try: () =>
          db.insert(courseCatalog).values({ semester, courses, syncedAt }).onConflictDoUpdate({
            target: courseCatalog.semester,
            set: { courses, syncedAt },
          }),
        catch: (cause) => databaseError("write", cause),
      }),
    );

    return Result.ok(courses.length);
  });
}

function selectionKey({ semester, id, term }: Selection) {
  return `${semester}\0${id}\0${term}`;
}

function examScheduleEvents(exams: readonly NtnuExam[]): CourseScheduleEvent[] {
  return exams
    .filter((exam) => !exam.deferred)
    .map((exam, index) => ({
      eventId: `exam:${exam.courseCode}:${exam.startsAt}:${index}`,
      sourceId: `exam:${exam.courseCode}:${exam.startsAt}:${index}`,
      week: 0,
      startsAt: exam.startsAt,
      endsAt: exam.endsAt,
      summary: `Exam · ${exam.form}`,
      compulsory: true,
      campusId: null,
      teachingTitle: exam.occasion,
      kind: "exam",
      link: exam.sourceUrl,
      staffs: [],
      rooms: exam.locations.map((location) => ({
        id: `exam-building:${location.buildingNumber}`,
        roomId: location.buildingNumber,
        roomName: location.rooms.join(", ") || location.buildingName,
        roomUrl: location.mazeMapUrl ?? "",
        campusId: "",
        buildingId: location.buildingNumber,
        buildingName: location.rooms.length > 0 ? location.buildingName : "",
        buildingAcronym: "",
      })),
    }));
}

function scheduleRows(
  selections: readonly Selection[],
  schedule: Schedule,
  examEventsByCourse: ReadonlyMap<string, readonly CourseScheduleEvent[]>,
) {
  const events = new Map<string, CourseScheduleEvent[]>(
    selections.map((selection) => [
      selectionKey(selection),
      [...(examEventsByCourse.get(selection.id) ?? [])],
    ]),
  );

  for (const event of schedule.events) {
    const selectionEvents = events.get(
      selectionKey({ semester: event.semesterid, id: event.courseid, term: event.terminnr }),
    );
    if (!selectionEvents) continue;

    selectionEvents.push({
      eventId: event.eventid,
      sourceId: event.id,
      week: event.weeknr,
      startsAt: event.dtstart,
      endsAt: event.dtend,
      summary: event.summary,
      compulsory: event.compulsory,
      campusId: event.campusid,
      teachingMethod: event.teachingMethod,
      teachingMethodName: event.teachingMethodName,
      teachingTitle: event.teachingTitle,
      kind: "teaching",
      staffs: event.staffs,
      rooms: event.room.map((room) => ({
        id: room.id,
        roomId: room.roomid,
        roomName: room.roomname,
        roomUrl: room.roomurl,
        campusId: room.campusid,
        buildingId: room.buildingid,
        buildingName: room.buildingname,
        buildingAcronym: room.buildingacronym,
      })),
    });
  }

  const syncedAt = new Date();
  return selections.map((selection) => ({
    semester: selection.semester,
    courseId: selection.id,
    term: selection.term,
    events: events.get(selectionKey(selection)) ?? [],
    syncedAt,
  }));
}

function persistSchedule(
  selections: readonly Selection[],
  schedule: Schedule,
  examEventsByCourse: ReadonlyMap<string, readonly CourseScheduleEvent[]>,
) {
  const rows = scheduleRows(selections, schedule, examEventsByCourse);
  if (rows.length === 0) return Promise.resolve(Result.ok(0));

  return Result.tryPromise({
    try: async () => {
      await db
        .insert(courseSchedule)
        .values(rows)
        .onConflictDoUpdate({
          target: [courseSchedule.semester, courseSchedule.courseId, courseSchedule.term],
          set: {
            events: sql`excluded.${sql.identifier(courseSchedule.events.name)}`,
            syncedAt: sql`excluded.${sql.identifier(courseSchedule.syncedAt.name)}`,
          },
        });
      return rows.length;
    },
    catch: (cause) => databaseError("write", cause),
  });
}

function syncCourseScheduleBatch(semester: string, selections: readonly Selection[]) {
  return Result.gen(async function* () {
    const schedule = yield* Result.await(getCourseSchedule(semester, selections));
    const examResults = await Promise.all(
      [...new Set(selections.map(({ id }) => id))].map(async (courseId) => ({
        courseId,
        result: await getCourseExams(courseId, semester),
      })),
    );
    const examEventsByCourse = new Map<string, readonly CourseScheduleEvent[]>();
    const failedCourseIds: string[] = [];
    for (const { courseId, result } of examResults) {
      if (result.isErr()) {
        failedCourseIds.push(courseId);
        console.error({ message: "Could not sync NTNU exams", courseId, error: result.error });
      } else {
        examEventsByCourse.set(courseId, examScheduleEvents(result.value));
      }
    }
    if (failedCourseIds.length > 0) {
      const cached = yield* Result.await(
        Result.tryPromise({
          try: () =>
            db
              .select({ courseId: courseSchedule.courseId, events: courseSchedule.events })
              .from(courseSchedule)
              .where(
                and(
                  eq(courseSchedule.semester, semester),
                  inArray(courseSchedule.courseId, failedCourseIds),
                ),
              ),
          catch: (cause) => databaseError("read", cause),
        }),
      );
      for (const row of cached) {
        if (!examEventsByCourse.has(row.courseId)) {
          examEventsByCourse.set(
            row.courseId,
            row.events.filter((event) => event.kind === "exam"),
          );
        }
      }
    }
    yield* Result.await(persistSchedule(selections, schedule, examEventsByCourse));
    return Result.ok(selections.length);
  });
}

async function syncCourseSchedules(selections: readonly Selection[]) {
  const failures: SyncFailure[] = [];
  const bySemester = new Map<string, Selection[]>();
  for (const selection of selections) {
    const semesterSelections = bySemester.get(selection.semester) ?? [];
    semesterSelections.push(selection);
    bySemester.set(selection.semester, semesterSelections);
  }
  let synced = 0;

  for (const [semester, semesterSelections] of bySemester) {
    for (const batch of chunks(semesterSelections, TP_BATCH_SIZE)) {
      // react-doctor-disable-next-line react-doctor/async-await-in-loop -- serialize API batches to avoid rate limits
      const result = await syncCourseScheduleBatch(semester, batch);

      if (result.isErr()) {
        failures.push({ selections: batch, error: result.error });
      } else {
        synced += result.value;
      }
    }
  }

  return { synced, failures };
}

export function syncTrackedCourseSchedules() {
  return Result.gen(async function* () {
    const selections = yield* Result.await(
      Result.tryPromise({
        try: () =>
          db
            .select({
              semester: calendarCourse.semester,
              id: calendarCourse.courseId,
              term: calendarCourse.term,
            })
            .from(calendarCourse)
            .groupBy(calendarCourse.semester, calendarCourse.courseId, calendarCourse.term),
        catch: (cause) => databaseError("read", cause),
      }),
    );

    return Result.ok(await syncCourseSchedules(selections));
  });
}

function readCatalog(semester: string) {
  return Result.tryPromise({
    try: () =>
      db
        .select({ courses: courseCatalog.courses })
        .from(courseCatalog)
        .where(eq(courseCatalog.semester, semester))
        .limit(1),
    catch: (cause) => databaseError("read", cause),
  });
}

export function listAvailableCourses(semester: string) {
  return Result.gen(async function* () {
    const catalog = yield* Result.await(readCatalog(semester));
    if (catalog[0]) return Result.ok(catalog[0].courses);

    yield* Result.await(syncCourseCatalog(semester));
    const refreshed = yield* Result.await(readCatalog(semester));
    return Result.ok(refreshed[0]?.courses ?? []);
  });
}

export function listCalendars(userId: string) {
  return Result.tryPromise({
    try: () =>
      db
        .select({ id: calendar.id, name: calendar.name, semester: calendar.semester })
        .from(calendar)
        .where(eq(calendar.userId, userId)),
    catch: (cause) => databaseError("read", cause),
  });
}

export function listCalendarCourses(userId: string, calendarId: string, semester: string) {
  return Result.gen(async function* () {
    const courses = yield* Result.await(
      Result.tryPromise({
        try: () =>
          db
            .select({
              id: calendarCourse.courseId,
              term: calendarCourse.term,
              color: calendarCourse.color,
              includeExamDates: calendarCourse.includeExamDates,
              excludedSourceIds: calendarCourse.excludedSourceIds,
              events: courseSchedule.events,
            })
            .from(calendarCourse)
            .innerJoin(
              courseSchedule,
              and(
                eq(courseSchedule.semester, calendarCourse.semester),
                eq(courseSchedule.courseId, calendarCourse.courseId),
                eq(courseSchedule.term, calendarCourse.term),
              ),
            )
            .innerJoin(calendar, eq(calendar.id, calendarCourse.calendarId))
            .where(
              and(
                eq(calendar.userId, userId),
                eq(calendar.id, calendarId),
                eq(calendarCourse.semester, semester),
              ),
            ),
        catch: (cause) => databaseError("read", cause),
      }),
    );

    return Result.ok(
      courses.map(({ events, ...course }) => ({
        ...course,
        series: [
          ...new Map(
            events
              .filter((event) => event.kind !== "exam")
              .map((event) => [
                event.sourceId,
                {
                  sourceId: event.sourceId,
                  startsAt: event.startsAt,
                  endsAt: event.endsAt,
                  summary: event.summary,
                  room: event.rooms.map((room) => room.roomName).join(", "),
                },
              ]),
          ).values(),
        ].sort((left, right) => left.startsAt - right.startsAt),
      })),
    );
  });
}

function updateCalendarCourse(
  userId: string,
  calendarId: string,
  selection: Selection,
  values: Partial<
    Pick<typeof calendarCourse.$inferInsert, "color" | "includeExamDates" | "excludedSourceIds">
  >,
) {
  return Result.gen(async function* () {
    const owned = yield* Result.await(
      Result.tryPromise({
        try: () =>
          db
            .select({ id: calendar.id })
            .from(calendar)
            .where(and(eq(calendar.id, calendarId), eq(calendar.userId, userId)))
            .limit(1),
        catch: (cause) => databaseError("read", cause),
      }),
    );
    if (!owned[0]) return Result.ok(false);

    const updated = yield* Result.await(
      Result.tryPromise({
        try: () =>
          db
            .update(calendarCourse)
            .set(values)
            .where(
              and(
                eq(calendarCourse.calendarId, calendarId),
                eq(calendarCourse.semester, selection.semester),
                eq(calendarCourse.courseId, selection.id),
                eq(calendarCourse.term, selection.term),
              ),
            )
            .returning({ calendarId: calendarCourse.calendarId }),
        catch: (cause) => databaseError("write", cause),
      }),
    );
    return Result.ok(updated.length > 0);
  });
}

export function updateExcludedSeries(
  userId: string,
  calendarId: string,
  selection: Selection,
  excludedSourceIds: string[],
) {
  return updateCalendarCourse(userId, calendarId, selection, { excludedSourceIds });
}

export function updateCalendarCourseColor(
  userId: string,
  calendarId: string,
  selection: Selection,
  color: string,
) {
  return updateCalendarCourse(userId, calendarId, selection, { color });
}

export function updateIncludeExamDates(
  userId: string,
  calendarId: string,
  selection: Selection,
  includeExamDates: boolean,
) {
  return updateCalendarCourse(userId, calendarId, selection, { includeExamDates });
}

export function removeCalendarCourse(userId: string, calendarId: string, selection: Selection) {
  return Result.gen(async function* () {
    const owned = yield* Result.await(
      Result.tryPromise({
        try: () =>
          db
            .select({ id: calendar.id })
            .from(calendar)
            .where(and(eq(calendar.id, calendarId), eq(calendar.userId, userId)))
            .limit(1),
        catch: (cause) => databaseError("read", cause),
      }),
    );
    if (!owned[0]) return Result.ok(false);

    const removed = yield* Result.await(
      Result.tryPromise({
        try: () =>
          db
            .delete(calendarCourse)
            .where(
              and(
                eq(calendarCourse.calendarId, calendarId),
                eq(calendarCourse.semester, selection.semester),
                eq(calendarCourse.courseId, selection.id),
                eq(calendarCourse.term, selection.term),
              ),
            )
            .returning({ calendarId: calendarCourse.calendarId }),
        catch: (cause) => databaseError("write", cause),
      }),
    );
    return Result.ok(removed.length > 0);
  });
}

export function deleteCalendar(userId: string, calendarId: string) {
  return Result.tryPromise({
    try: () =>
      db
        .delete(calendar)
        .where(and(eq(calendar.id, calendarId), eq(calendar.userId, userId)))
        .returning({ id: calendar.id }),
    catch: (cause) => databaseError("write", cause),
  });
}

export function createCalendar(userId: string, name: string, semester: string) {
  return Result.tryPromise({
    try: async () => {
      const [created] = await db
        .insert(calendar)
        .values({ id: nanoid(10), userId, name, semester })
        .returning({ id: calendar.id, name: calendar.name, semester: calendar.semester });
      return created;
    },
    catch: (cause) => databaseError("write", cause),
  });
}

export function updateCalendarSemester(userId: string, calendarId: string, semester: string) {
  return Result.tryPromise({
    try: async () => {
      const owned = await db
        .select({ id: calendar.id })
        .from(calendar)
        .where(and(eq(calendar.id, calendarId), eq(calendar.userId, userId)))
        .limit(1);
      if (!owned[0]) return false;

      await db.batch([
        db.delete(calendarCourse).where(eq(calendarCourse.calendarId, calendarId)),
        db
          .update(calendar)
          .set({ semester })
          .where(and(eq(calendar.id, calendarId), eq(calendar.userId, userId))),
      ]);
      return true;
    },
    catch: (cause) => databaseError("write", cause),
  });
}

export function listCalendarSchedule(
  userId: string,
  calendarId: string,
  semester: string,
  includeExcluded = false,
) {
  return Result.gen(async function* () {
    const schedules = yield* Result.await(
      Result.tryPromise({
        try: () =>
          db
            .select({
              courseId: courseSchedule.courseId,
              term: courseSchedule.term,
              excludedSourceIds: calendarCourse.excludedSourceIds,
              includeExamDates: calendarCourse.includeExamDates,
              events: courseSchedule.events,
            })
            .from(courseSchedule)
            .innerJoin(
              calendarCourse,
              and(
                eq(calendarCourse.semester, courseSchedule.semester),
                eq(calendarCourse.courseId, courseSchedule.courseId),
                eq(calendarCourse.term, courseSchedule.term),
              ),
            )
            .innerJoin(calendar, eq(calendar.id, calendarCourse.calendarId))
            .where(
              and(
                eq(calendar.userId, userId),
                eq(calendar.id, calendarId),
                eq(calendarCourse.semester, semester),
              ),
            ),
        catch: (cause) => databaseError("read", cause),
      }),
    );

    const events = new Map<
      string,
      (typeof schedules)[number]["events"][number] & { courseId: string; term: number }
    >();
    for (const schedule of schedules) {
      for (const event of schedule.events) {
        if (event.kind === "exam" && !schedule.includeExamDates) continue;
        if (
          event.kind === "exam" ||
          includeExcluded ||
          includeCourseEvent(event, schedule.excludedSourceIds)
        ) {
          events.set(event.eventId, {
            ...event,
            courseId: schedule.courseId,
            term: schedule.term,
          });
        }
      }
    }
    return Result.ok([...events.values()].sort((left, right) => left.startsAt - right.startsAt));
  });
}

function readCourseState(selection: Selection) {
  return Result.tryPromise({
    try: async () => {
      const [catalog, tracked, cached] = await Promise.all([
        db
          .select({ courses: courseCatalog.courses })
          .from(courseCatalog)
          .where(eq(courseCatalog.semester, selection.semester))
          .limit(1),
        db
          .select({ calendarId: calendarCourse.calendarId })
          .from(calendarCourse)
          .where(
            and(
              eq(calendarCourse.semester, selection.semester),
              eq(calendarCourse.courseId, selection.id),
              eq(calendarCourse.term, selection.term),
            ),
          )
          .limit(1),
        db
          .select({ courseId: courseSchedule.courseId })
          .from(courseSchedule)
          .where(
            and(
              eq(courseSchedule.semester, selection.semester),
              eq(courseSchedule.courseId, selection.id),
              eq(courseSchedule.term, selection.term),
            ),
          )
          .limit(1),
      ]);

      return {
        available: catalog[0]?.courses.some(
          ({ id, term }) => id === selection.id && term === selection.term,
        ),
        needsSync: tracked.length === 0 || cached.length === 0,
      };
    },
    catch: (cause) => databaseError("read", cause),
  });
}

function randomColor() {
  const bytes = crypto.getRandomValues(new Uint8Array(3));
  return `#${[...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function insertCalendarCourse(userId: string, calendarId: string, selection: Selection) {
  return Result.tryPromise({
    try: async () => {
      const owned = await db
        .select({ id: calendar.id })
        .from(calendar)
        .where(and(eq(calendar.id, calendarId), eq(calendar.userId, userId)))
        .limit(1);
      if (!owned[0]) throw new Error("Calendar not found");

      return db
        .insert(calendarCourse)
        .values({
          calendarId,
          semester: selection.semester,
          courseId: selection.id,
          term: selection.term,
          color: randomColor(),
        })
        .onConflictDoNothing()
        .returning({ calendarId: calendarCourse.calendarId });
    },
    catch: (cause) => databaseError("write", cause),
  });
}

export function addCalendarCourse(userId: string, calendarId: string, selection: Selection) {
  return Result.gen(async function* () {
    const state = yield* Result.await(readCourseState(selection));
    if (!state.available) {
      yield* new CourseNotFoundError({
        semester: selection.semester,
        courseId: selection.id,
        term: selection.term,
        message: "Course is not in the available course catalog",
      });
    }

    const inserted = yield* Result.await(insertCalendarCourse(userId, calendarId, selection));

    if (state.needsSync) {
      yield* Result.await(syncCourseScheduleBatch(selection.semester, [selection]));
    }

    return Result.ok({ added: inserted.length > 0, synced: state.needsSync });
  });
}
