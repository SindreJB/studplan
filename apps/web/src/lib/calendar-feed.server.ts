import { db } from "@repo/db";
import {
  calendar,
  calendarCourse,
  calendarEvent,
  courseCatalog,
  courseEvent,
  courseSchedule,
} from "@repo/db/schema";
import { Result } from "better-result";
import { and, eq } from "drizzle-orm";

import { includeCourseEvent } from "./course-event-filter.ts";
import { CourseSyncError } from "./course-sync.server.ts";
import { createIcal } from "./ical.ts";

export type CalendarFeed = "unfiltered" | "filtered" | { courseId: string };

export function getCalendarIcal(calendarId: string, feed: CalendarFeed) {
  return Result.gen(async function* () {
    const [selectedCalendar] = yield* Result.await(
      Result.tryPromise({
        try: () =>
          db
            .select({ name: calendar.name })
            .from(calendar)
            .where(eq(calendar.id, calendarId))
            .limit(1),
        catch: (cause) =>
          new CourseSyncError({
            operation: "read",
            message: "Could not read calendar feed",
            cause,
          }),
      }),
    );
    if (!selectedCalendar) return Result.ok(null);

    const rows = yield* Result.await(
      Result.tryPromise({
        try: () =>
          db
            .select({
              semester: calendarCourse.semester,
              courseId: calendarCourse.courseId,
              term: calendarCourse.term,
              excludedSourceIds: calendarCourse.excludedSourceIds,
              events: courseSchedule.events,
              catalog: courseCatalog.courses,
            })
            .from(calendarCourse)
            .innerJoin(calendar, eq(calendar.id, calendarCourse.calendarId))
            .innerJoin(
              courseSchedule,
              and(
                eq(courseSchedule.semester, calendarCourse.semester),
                eq(courseSchedule.courseId, calendarCourse.courseId),
                eq(courseSchedule.term, calendarCourse.term),
              ),
            )
            .innerJoin(courseCatalog, eq(courseCatalog.semester, calendarCourse.semester))
            .where(eq(calendar.id, calendarId)),
        catch: (cause) =>
          new CourseSyncError({
            operation: "read",
            message: "Could not read calendar feed",
            cause,
          }),
      }),
    );

    const customRows = await Promise.all([
      db
        .select({ event: calendarEvent })
        .from(calendarEvent)
        .where(eq(calendarEvent.calendarId, calendarId)),
      db
        .select({ event: courseEvent })
        .from(courseEvent)
        .innerJoin(
          calendarCourse,
          and(
            eq(calendarCourse.calendarId, calendarId),
            eq(calendarCourse.semester, courseEvent.semester),
            eq(calendarCourse.courseId, courseEvent.courseId),
            eq(calendarCourse.term, courseEvent.term),
            eq(calendarCourse.globalEventsSubscribed, true),
          ),
        ),
    ]);
    const customEvents = [
      ...customRows[0].map(({ event }) => event),
      ...customRows[1].map(({ event }) => event),
    ]
      .filter((event) => typeof feed !== "object" || event.courseId === feed.courseId)
      .filter((event) => event.courseId !== null)
      .map((event) => ({
        uid: `${calendarId}-${event.id}@studplan.ahse.dev`,
        startsAt: event.startsAt.getTime(),
        endsAt: event.endsAt.getTime(),
        summary: `${event.courseId} · ${event.title}`,
        description: event.description ?? undefined,
        location: event.location ?? undefined,
      }));

    const events = [
      ...rows.flatMap((row) => {
        if (typeof feed === "object" && row.courseId !== feed.courseId) return [];

        const course = row.catalog.find(
          (item) => item.id === row.courseId && item.term === row.term,
        );
        const selectedEvents =
          feed === "filtered"
            ? row.events.filter((event) => includeCourseEvent(event, row.excludedSourceIds))
            : row.events;

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
      ...customEvents,
    ];

    const suffix = typeof feed === "object" ? ` · ${feed.courseId}` : ` · ${feed}`;
    return Result.ok(createIcal(`${selectedCalendar.name}${suffix}`, events));
  });
}
