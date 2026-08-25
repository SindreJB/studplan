import { db } from "@repo/db";
import { Result } from "better-result";

import { includeCourseEvent } from "./course-event-filter";
import { CourseSyncError } from "./course-sync.server";
import { createIcal } from "./ical";

export type CalendarFeed = "unfiltered" | "filtered" | { courseId: string };

const isCourseFeed = (feed: CalendarFeed): feed is { courseId: string } =>
  feed !== "unfiltered" && feed !== "filtered";

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
                where: isCourseFeed(feed) ? { courseId: feed.courseId } : undefined,
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
