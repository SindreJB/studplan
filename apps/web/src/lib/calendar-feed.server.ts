import { db } from "@repo/db";
import { schema } from "@repo/db/schema";
import { Result } from "better-result";
import { and, eq, inArray } from "drizzle-orm";

import { includeCourseEvent } from "./course-event-filter";
import { CourseSyncError } from "./course-sync.server";
import { createIcal } from "./ical";

export type CalendarFeed = "unfiltered" | "filtered" | { courseId: string };

const isCourseFeed = (feed: CalendarFeed): feed is { courseId: string } =>
  feed !== "unfiltered" && feed !== "filtered";

const { calendar, calendarCourse, courseCatalog, courseSchedule, courseSubmission } = schema;

/** Deadlines are a point in time; give them a short block so they show up in day views. */
const SUBMISSION_DURATION_MS = 30 * 60 * 1000;

export function getCalendarIcal(calendarId: string, feed: CalendarFeed) {
  return Result.gen(async function* () {
    const selectedCalendar = yield* Result.await(
      Result.tryPromise({
        try: async () => {
          const [calendarRow] = await db
            .select({ name: calendar.name })
            .from(calendar)
            .where(eq(calendar.id, calendarId))
            .limit(1);
          if (!calendarRow) return null;

          const courses = await db
            .select({
              semester: calendarCourse.semester,
              courseId: calendarCourse.courseId,
              term: calendarCourse.term,
              excludedSourceIds: calendarCourse.excludedSourceIds,
              includeExamDates: calendarCourse.includeExamDates,
              includeSubmissionDates: calendarCourse.includeSubmissionDates,
              events: courseSchedule.events,
            })
            .from(calendarCourse)
            .leftJoin(
              courseSchedule,
              and(
                eq(courseSchedule.semester, calendarCourse.semester),
                eq(courseSchedule.courseId, calendarCourse.courseId),
                eq(courseSchedule.term, calendarCourse.term),
              ),
            )
            .where(
              and(
                eq(calendarCourse.calendarId, calendarId),
                isCourseFeed(feed) ? eq(calendarCourse.courseId, feed.courseId) : undefined,
              ),
            );

          const semesters = [...new Set(courses.map(({ semester }) => semester))];
          const [catalogs, submissions] =
            semesters.length === 0
              ? [[], []]
              : await Promise.all([
                  db
                    .select({ semester: courseCatalog.semester, courses: courseCatalog.courses })
                    .from(courseCatalog)
                    .where(inArray(courseCatalog.semester, semesters)),
                  db
                    .select({
                      id: courseSubmission.id,
                      semester: courseSubmission.semester,
                      courseId: courseSubmission.courseId,
                      term: courseSubmission.term,
                      title: courseSubmission.title,
                      dueAt: courseSubmission.dueAt,
                      description: courseSubmission.description,
                      link: courseSubmission.link,
                    })
                    .from(courseSubmission)
                    .where(
                      and(
                        inArray(courseSubmission.semester, semesters),
                        inArray(
                          courseSubmission.courseId,
                          courses.map(({ courseId }) => courseId),
                        ),
                      ),
                    ),
                ]);

          return { ...calendarRow, courses, catalogs, submissions };
        },
        catch: (cause) =>
          new CourseSyncError({
            operation: "read",
            message: "Could not read calendar feed",
            cause,
          }),
      }),
    );
    if (!selectedCalendar) return Result.ok(null);

    const catalogBySemester = new Map(
      selectedCalendar.catalogs.map(({ semester, courses }) => [semester, courses]),
    );
    const rows = selectedCalendar.courses.flatMap((course) => {
      const catalog = catalogBySemester.get(course.semester);
      if (!catalog || !course.events) return [];
      return [{ ...course, catalog, events: course.events }];
    });
    const feedRow = isCourseFeed(feed)
      ? rows.find((row) => row.courseId === feed.courseId)
      : undefined;
    const feedCourse = feedRow?.catalog.find(
      (course) => course.id === feedRow.courseId && course.term === feedRow.term,
    );

    // Deadlines are read off the tracked courses rather than off `rows`, so a course
    // whose timetable has not been synced yet still exports its deadlines. The full
    // feed carries every deadline; the filtered and per-course feeds follow the
    // course's "include submission due dates" choice.
    const submissionEvents = selectedCalendar.courses.flatMap((row) => {
      if (feed !== "unfiltered" && !row.includeSubmissionDates) return [];

      return selectedCalendar.submissions
        .filter(
          (submission) =>
            submission.semester === row.semester &&
            submission.courseId === row.courseId &&
            submission.term === row.term,
        )
        .map((submission) => ({
          uid: `${calendarId}-${row.semester}-submission-${submission.id}@studplan.ahse.dev`,
          startsAt: submission.dueAt,
          endsAt: submission.dueAt + SUBMISSION_DURATION_MS,
          summary: `${row.courseId} · ${submission.title}`,
          description:
            [
              submission.description,
              ...(submission.link ? [`More information: ${submission.link}`] : []),
            ]
              .filter((value) => value != null)
              .join("\n") || undefined,
          url: submission.link ?? undefined,
        }));
    });

    const events = [
      ...rows.flatMap((row) => {
        if (isCourseFeed(feed) && row.courseId !== feed.courseId) return [];

        const course = row.catalog.find(
          (item) => item.id === row.courseId && item.term === row.term,
        );
        const selectedEvents = row.events.filter(
          (event) =>
            (event.kind !== "exam" || row.includeExamDates) &&
            (event.kind === "exam" ||
              feed === "unfiltered" ||
              includeCourseEvent(event, row.excludedSourceIds)),
        );

        return selectedEvents.map((event) => ({
          uid: `${calendarId}-${row.semester}-${event.eventId}@studplan.ahse.dev`,
          startsAt: event.startsAt,
          endsAt: event.endsAt,
          summary: `${row.courseId} · ${event.summary ?? event.teachingTitle ?? course?.name ?? "Class"}`,
          description:
            [
              event.teachingTitle ?? event.teachingMethodName,
              ...event.rooms.flatMap((room) => (room.roomUrl ? [`Map: ${room.roomUrl}`] : [])),
              ...(event.link ? [`More information: ${event.link}`] : []),
            ]
              .filter((value) => value != null)
              .join("\n") || undefined,
          location: event.rooms
            .map((room) => `${room.roomName}${room.buildingName ? `, ${room.buildingName}` : ""}`)
            .join("; "),
          url: event.link,
        }));
      }),
      ...submissionEvents,
    ];

    const name = isCourseFeed(feed)
      ? `${feed.courseId} - ${feedCourse?.nameEn ?? feedCourse?.name ?? feedCourse?.nameNb ?? feedCourse?.nameNn ?? "Course"}`
      : `${selectedCalendar.name} - ${feed}`;
    return Result.ok(createIcal(name, events));
  });
}
