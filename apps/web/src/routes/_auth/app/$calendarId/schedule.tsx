import type { CourseScheduleEvent } from "@repo/db/schema";
import { Button } from "@repo/ui/components/button";
import { useMutation } from "@tanstack/react-query";
import { ClientOnly, createFileRoute, useRouter } from "@tanstack/react-router";
import { addDays, addWeeks, format, getISOWeek, startOfWeek } from "date-fns";
import { CalendarX, ClipboardList } from "lucide-react";
import { useState } from "react";

import { CurrentTimeIndicator } from "#/components/current-time-indicator";
import { scheduleEventColorStyle, ScheduleEventContent } from "#/components/schedule-event-content";
import { positionEvents } from "#/lib/calendar-layout";
import { includeCourseEvent } from "#/lib/course-event-filter";
import { updateExcludedSeriesMutationOptions } from "#/lib/mutations";
import { calendarCoursesQueryOptions } from "#/lib/queries/courses";
import { scheduleQueryOptions } from "#/lib/queries/schedule";
import { calendarSubmissionsQueryOptions } from "#/lib/queries/submissions";

const HOUR_HEIGHT = 64;
type CalendarEvent = CourseScheduleEvent & { courseId: string; term: number };
type Deadline = {
  id: string;
  courseId: string;
  term: number;
  title: string;
  dueAt: number;
};

export const Route = createFileRoute("/_auth/app/$calendarId/schedule")({
  loader: async ({ params, context }) => {
    const data = { calendarId: params.calendarId, semester: context.calendar.semester };
    const [events, courses, submissions] = await Promise.all([
      context.queryClient.fetchQuery(scheduleQueryOptions(data.calendarId, data.semester, true)),
      context.queryClient.fetchQuery(calendarCoursesQueryOptions(data.calendarId, data.semester)),
      context.queryClient.fetchQuery(
        calendarSubmissionsQueryOptions(data.calendarId, data.semester),
      ),
    ]);
    return {
      events,
      submissions,
      semester: data.semester,
      colors: new Map(courses.map((course) => [courseKey(course.id, course.term), course.color])),
      excludedByCourse: new Map(
        courses.map((course) => [courseKey(course.id, course.term), course.excludedSourceIds]),
      ),
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

function SchedulePage() {
  const { calendarId } = Route.useParams();
  const { events, submissions, colors, semester, excludedByCourse } = Route.useLoaderData();
  const router = useRouter();
  const updateExcluded = useMutation(updateExcludedSeriesMutationOptions());
  const [showHiddenEvents, setShowHiddenEvents] = useState(false);
  const [week, setWeek] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  function isHidden(event: CalendarEvent) {
    return !includeCourseEvent(
      event,
      excludedByCourse.get(courseKey(event.courseId, event.term)) ?? [],
    );
  }

  async function toggleEvent(event: CalendarEvent) {
    const key = courseKey(event.courseId, event.term);
    const excludedSourceIds = excludedByCourse.get(key) ?? [];
    const nextExcludedSourceIds = excludedSourceIds.includes(event.sourceId)
      ? excludedSourceIds.filter((sourceId) => sourceId !== event.sourceId)
      : [...excludedSourceIds, event.sourceId];

    await updateExcluded.mutateAsync({
      calendarId,
      semester,
      id: event.courseId,
      term: event.term,
      excludedSourceIds: nextExcludedSourceIds,
    });
    await router.invalidate({ sync: true });
  }

  const weekEnd = addWeeks(week, 1);
  const visible = events.filter(
    (event) =>
      event.startsAt >= week.getTime() &&
      event.startsAt < weekEnd.getTime() &&
      (showHiddenEvents || !isHidden(event)),
  );
  const deadlines = submissions.filter(
    (submission) => submission.dueAt >= week.getTime() && submission.dueAt < weekEnd.getTime(),
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
        <div className="flex flex-wrap items-center justify-end gap-2">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={showHiddenEvents}
              onChange={(event) => setShowHiddenEvents(event.target.checked)}
            />
            Show hidden repeating events
          </label>
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
      {visible.length === 0 && deadlines.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          <CalendarX className="mx-auto mb-3 size-8" />
          <p>No classes this week.</p>
        </div>
      ) : (
        <WeekCalendar
          colors={colors}
          events={visible}
          deadlines={deadlines}
          weekStart={week}
          isHidden={isHidden}
          onToggle={toggleEvent}
        />
      )}
    </div>
  );
}

// react-doctor-disable-next-line react-doctor/no-multi-component-file
function WeekCalendar({
  colors,
  events,
  deadlines,
  weekStart,
  isHidden,
  onToggle,
}: {
  colors: Map<string, string>;
  events: CalendarEvent[];
  deadlines: Deadline[];
  weekStart: Date;
  isHidden: (event: CalendarEvent) => boolean;
  onToggle: (event: CalendarEvent) => Promise<void>;
}) {
  const days = Array.from({ length: 7 }, (_, day) => addDays(weekStart, day));
  const deadlinesOn = (date: Date) =>
    deadlines
      .filter((deadline) => new Date(deadline.dueAt).toDateString() === date.toDateString())
      .sort((left, right) => left.dueAt - right.dueAt);
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
          const dayDeadlines = deadlinesOn(date);
          return (
            <section className="rounded-lg border p-3" key={date.toISOString()}>
              <h2 className="mb-2 text-sm font-semibold">{format(date, "EEEE d MMM")}</h2>
              {dayEvents.length === 0 && dayDeadlines.length === 0 ? (
                <p className="text-xs text-muted-foreground">No classes</p>
              ) : (
                <div className="space-y-2">
                  {dayEvents.map((event) => (
                    <ScheduleEventContent
                      color={colors.get(courseKey(event.courseId, event.term))}
                      event={event}
                      key={event.eventId}
                      hidden={isHidden(event)}
                      onToggle={() => void onToggle(event)}
                    />
                  ))}
                  {dayDeadlines.map((deadline) => (
                    <DeadlineChip
                      color={colors.get(courseKey(deadline.courseId, deadline.term))}
                      deadline={deadline}
                      key={deadline.id}
                    />
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
                          ...scheduleEventColorStyle(
                            colors.get(courseKey(event.courseId, event.term)) ?? "#6366f1",
                          ),
                          top,
                          height: eventHeight,
                          left: `calc(${(column / columns) * 100}% + 2px)`,
                          width: `calc(${100 / columns}% - 4px)`,
                        }}
                      >
                        <ScheduleEventContent
                          event={event}
                          compact
                          hidden={isHidden(event)}
                          onToggle={() => void onToggle(event)}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
          {deadlines.length > 0 && (
            <div className="grid grid-cols-[4rem_repeat(7,minmax(7rem,1fr))] border-t bg-muted/40">
              <div className="px-2 py-2 text-right text-xs text-muted-foreground">Due</div>
              {days.map((date) => (
                <div className="space-y-1 border-l p-1" key={date.toISOString()}>
                  {deadlinesOn(date).map((deadline) => (
                    <DeadlineChip
                      color={colors.get(courseKey(deadline.courseId, deadline.term))}
                      compact
                      deadline={deadline}
                      key={deadline.id}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/** A submission deadline, carrying the colour of the course it belongs to. */
// react-doctor-disable-next-line react-doctor/no-multi-component-file
function DeadlineChip({
  deadline,
  color = "#6366f1",
  compact = false,
}: {
  deadline: Deadline;
  color?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-md border leading-tight ${compact ? "p-1 text-xs" : "p-2 text-sm"}`}
      style={scheduleEventColorStyle(color)}
      title={`${deadline.courseId}: ${deadline.title}`}
    >
      <strong className="flex items-center gap-1">
        <ClipboardList className="size-3 shrink-0" />
        <span className="truncate">{deadline.courseId}</span>
      </strong>
      <span className="block truncate">{deadline.title}</span>
      <span className="block">Due {format(deadline.dueAt, "HH:mm")}</span>
    </div>
  );
}
