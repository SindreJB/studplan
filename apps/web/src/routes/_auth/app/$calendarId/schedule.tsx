import type { CourseScheduleEvent } from "@repo/db/schema";
import { Button } from "@repo/ui/components/button";
import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { addDays, addWeeks, format, getISOWeek, startOfWeek } from "date-fns";
import { CalendarX } from "lucide-react";
import { useState } from "react";

import { CurrentTimeIndicator } from "#/components/current-time-indicator";
import { positionEvents } from "#/lib/calendar-layout";
import { calendarCoursesQueryOptions } from "#/lib/queries/courses";
import { scheduleQueryOptions } from "#/lib/queries/schedule";

const HOUR_HEIGHT = 64;
type CalendarEvent = CourseScheduleEvent & { courseId: string; term: number };

export const Route = createFileRoute("/_auth/app/$calendarId/schedule")({
  loader: async ({ params, context }) => {
    const data = { calendarId: params.calendarId, semester: context.calendar.semester };
    const [events, courses] = await Promise.all([
      context.queryClient.ensureQueryData({
        ...scheduleQueryOptions(data.calendarId, data.semester),
        revalidateIfStale: true,
      }),
      context.queryClient.ensureQueryData({
        ...calendarCoursesQueryOptions(data.calendarId, data.semester),
        revalidateIfStale: true,
      }),
    ]);
    return {
      events,
      colors: new Map(courses.map((course) => [courseKey(course.id, course.term), course.color])),
    };
  },
  component: SchedulePage,
});

function minutesSinceMidnight(timestamp: number) {
  const date = new Date(timestamp);
  return date.getHours() * 60 + date.getMinutes();
}

function courseKey(courseId: string, term: number) {
  return `${courseId}¤${term}`;
}

function courseColor(color: string) {
  return {
    backgroundColor: `color-mix(in oklab, ${color} 18%, var(--background))`,
    borderColor: `color-mix(in oklab, ${color} 55%, var(--border))`,
  };
}

function SchedulePage() {
  const { events, colors } = Route.useLoaderData();
  const [week, setWeek] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const weekEnd = addWeeks(week, 1);
  const visible = events.filter(
    (event) => event.startsAt >= week.getTime() && event.startsAt < weekEnd.getTime(),
  );

  return (
    <div className="w-full space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Schedule (Week {getISOWeek(week)})</h1>
          <p className="text-sm text-muted-foreground">
            {format(week, "d MMM")}–{format(addDays(weekEnd, -1), "d MMM yyyy")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setWeek(addWeeks(week, -1))}>
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={() => setWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))}
          >
            Today
          </Button>
          <Button variant="outline" onClick={() => setWeek(addWeeks(week, 1))}>
            Next
          </Button>
        </div>
      </header>
      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          <CalendarX className="mx-auto mb-3 size-8" />
          <p>No classes this week.</p>
        </div>
      ) : (
        <WeekCalendar colors={colors} events={visible} weekStart={week} />
      )}
    </div>
  );
}

// react-doctor-disable-next-line react-doctor/no-multi-component-file
function WeekCalendar({
  colors,
  events,
  weekStart,
}: {
  colors: Map<string, string>;
  events: CalendarEvent[];
  weekStart: Date;
}) {
  const days = Array.from({ length: 7 }, (_, day) => addDays(weekStart, day));
  const startHour = Math.max(
    0,
    Math.min(
      8,
      ...events.map((event) => Math.floor(minutesSinceMidnight(event.startsAt) / 60) - 1),
    ),
  );
  const endHour = Math.min(
    24,
    Math.max(18, ...events.map((event) => Math.ceil(minutesSinceMidnight(event.endsAt) / 60) + 1)),
  );
  const hours = Array.from({ length: endHour - startHour }, (_, index) => startHour + index);
  const height = hours.length * HOUR_HEIGHT;

  return (
    <>
      <div className="space-y-3 md:hidden">
        {days.map((date) => {
          const dayEvents = events.filter(
            (event) => new Date(event.startsAt).toDateString() === date.toDateString(),
          );
          return (
            <section className="rounded-lg border p-3" key={date.toISOString()}>
              <h2 className="mb-2 text-sm font-semibold">{format(date, "EEEE d MMM")}</h2>
              {dayEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground">No classes</p>
              ) : (
                <div className="space-y-2">
                  {dayEvents.map((event) => (
                    <EventContent colors={colors} event={event} key={event.eventId} />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border md:block">
        <div className="min-w-4xl">
          <div className="grid grid-cols-[4rem_repeat(7,minmax(7rem,1fr))] border-b bg-muted/40">
            <div />
            {days.map((date) => (
              <div className="border-l px-2 py-3 text-center" key={date.toISOString()}>
                <div className="text-xs text-muted-foreground">{format(date, "EEE")}</div>
                <div className="font-semibold">{format(date, "d")}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-[4rem_repeat(7,minmax(7rem,1fr))]">
            <div className="relative" style={{ height }}>
              {hours.map((hour) => (
                <span
                  className="absolute right-2 -translate-y-1/2 text-xs text-muted-foreground"
                  key={hour}
                  style={{ top: (hour - startHour) * HOUR_HEIGHT }}
                >
                  {String(hour).padStart(2, "0")}:00
                </span>
              ))}
            </div>
            {days.map((date) => {
              const dayEvents = positionEvents(
                events.filter(
                  (event) => new Date(event.startsAt).toDateString() === date.toDateString(),
                ),
              );
              return (
                <div className="relative border-l" key={date.toISOString()} style={{ height }}>
                  {hours.map((hour) => (
                    <div
                      className="absolute inset-x-0 border-t"
                      key={hour}
                      style={{ top: (hour - startHour) * HOUR_HEIGHT }}
                    />
                  ))}
                  <ClientOnly fallback={null}>
                    <CurrentTimeIndicator date={date} startHour={startHour} height={height} />
                  </ClientOnly>
                  {dayEvents.map(({ event, column, columns }) => {
                    const top =
                      ((minutesSinceMidnight(event.startsAt) - startHour * 60) / 60) * HOUR_HEIGHT;
                    const eventHeight = Math.max(
                      24,
                      ((event.endsAt - event.startsAt) / 3_600_000) * HOUR_HEIGHT,
                    );
                    return (
                      <div
                        className="absolute overflow-hidden rounded-md border p-1.5 text-left text-xs shadow-sm"
                        key={event.eventId}
                        style={{
                          ...courseColor(
                            colors.get(courseKey(event.courseId, event.term)) ?? "#6366f1",
                          ),
                          top,
                          height: eventHeight,
                          left: `calc(${(column / columns) * 100}% + 2px)`,
                          width: `calc(${100 / columns}% - 4px)`,
                        }}
                      >
                        <EventContent colors={colors} event={event} compact />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

// react-doctor-disable-next-line react-doctor/no-multi-component-file
function EventContent({
  colors,
  event,
  compact = false,
}: {
  colors: Map<string, string>;
  event: CalendarEvent;
  compact?: boolean;
}) {
  const room = event.rooms.map((item) => item.roomName).join(", ");
  return (
    <div
      className={compact ? "leading-tight" : "rounded-md border p-2"}
      style={
        compact
          ? undefined
          : courseColor(colors.get(courseKey(event.courseId, event.term)) ?? "#6366f1")
      }
    >
      <strong className="block">{event.courseId}</strong>
      <span className="block">
        {format(event.startsAt, "HH:mm")}–{format(event.endsAt, "HH:mm")}
      </span>
      <span className="block truncate">{event.summary ?? event.teachingTitle}</span>
      {room && <span className="block truncate">{room}</span>}
    </div>
  );
}
