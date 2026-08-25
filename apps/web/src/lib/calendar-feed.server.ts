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

const { calendar, calendarCourse, courseCatalog, courseSchedule } = schema;

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
          const catalogs =
            semesters.length === 0
              ? []
              : await db
                  .select({ semester: courseCatalog.semester, courses: courseCatalog.courses })
                  .from(courseCatalog)
                  .where(inArray(courseCatalog.semester, semesters));

          return { ...calendarRow, courses, catalogs };
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

    const events = [
      ...rows.flatMap((row) => {
        if (isCourseFeed(feed) && row.courseId !== feed.courseId) return [];

        const course = row.catalog.find(
          (item) => item.id === row.courseId && item.term === row.term,
        );
        const selectedEvents =
          feed === "unfiltered"
            ? row.events
            : row.events.filter((event) => includeCourseEvent(event, row.excludedSourceIds));

        return selectedEvents.map((event) => ({
          uid: `${calendarId}-${row.semester}-${event.eventId}@studplan.ahse.dev`,
          startsAt: event.startsAt,
          endsAt: event.endsAt,
          summary: `${row.courseId} · ${event.summary ?? event.teachingTitle ?? course?.name ?? "Class"}`,
          description: event.teachingTitle ?? event.teachingMethodName ?? undefined,
          location: event.rooms
            .map((room) => `${room.roomName}${room.buildingName ? `, ${room.buildingName}` : ""}`)
            .join("; "),
        }));
      }),
    ];

    const name = isCourseFeed(feed)
      ? `${feed.courseId} - ${feedCourse?.nameEn ?? feedCourse?.name ?? feedCourse?.nameNb ?? feedCourse?.nameNn ?? "Course"}`
      : `${selectedCalendar.name} - ${feed}`;
    return Result.ok(createIcal(name, events));
  });
}
