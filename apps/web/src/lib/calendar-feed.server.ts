import { db } from "@repo/db";
import { schema } from "@repo/db/schema";
import { Result } from "better-result";
import { and, eq } from "drizzle-orm";

import { includeCourseEvent } from "./course-event-filter.ts";
import { CourseSyncError } from "./course-sync.server.ts";
import { createIcal } from "./ical.ts";

const { calendarCourse, calendarEvent, courseEvent } = schema;

export type CalendarFeed = "unfiltered" | "filtered" | { courseId: string };

export function getCalendarIcal(calendarId: string, feed: CalendarFeed) {
  return Result.gen(async function* () {
    const selectedCalendar = yield* Result.await(
      Result.tryPromise({
        try: () =>
          db.query.calendar.findFirst({
            where: { id: calendarId },
            columns: { name: true },
            with: {
              courses: {
                columns: {
                  semester: true,
                  courseId: true,
                  term: true,
                  excludedSourceIds: true,
                },
                with: {
                  catalog: { columns: { courses: true } },
                  schedule: { columns: { events: true } },
                },
              },
            },
          }),
        catch: (cause) =>
          new CourseSyncError({
            operation: "read",
            message: "Could not read calendar feed",
            cause,
          }),
      }),
    );
    if (!selectedCalendar) return Result.ok(null);

    const rows = selectedCalendar.courses.flatMap((course) => {
      if (!course.catalog || !course.schedule) return [];
      return [{ ...course, catalog: course.catalog.courses, events: course.schedule.events }];
    });

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
