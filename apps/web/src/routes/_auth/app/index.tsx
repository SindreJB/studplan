import type { CourseScheduleEvent } from "@repo/db/schema";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { addDays, addWeeks, format, startOfWeek } from "date-fns";
import { Trash2Icon } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { positionEvents } from "#/lib/calendar-layout.ts";
import {
  $addCalendarCourse,
  $createCalendar,
  $createDemoCalendar,
  $createCalendarEvent,
  $deleteCalendar,
  $createCourseEvent,
  $getMySchedule,
  $getPublicOrigin,
  $listAvailableCourses,
  $listCalendarCourses,
  $listCalendars,
  $removeCalendarCourse,
  $updateExcludedSeries,
  $updateGlobalEventsSubscription,
} from "#/lib/course.functions.ts";

type CalendarEvent = CourseScheduleEvent & { courseId: string; term: number };

const eventFormSchema = z
  .object({
    course: z.string().min(1, "Course is required"),
    title: z.string().refine((value) => value.trim().length > 0, "Title is required"),
    startsAt: z.string().min(1, "Start time is required"),
    endsAt: z.string().min(1, "End time is required"),
    location: z.string(),
    link: z.union([z.literal(""), z.url("Enter a valid URL")]),
    description: z.string(),
    publishToGlobal: z.boolean(),
  })
  .refine(({ startsAt, endsAt }) => !startsAt || !endsAt || new Date(startsAt) < new Date(endsAt), {
    path: ["endsAt"],
    message: "End time must be after the start time",
  });

const eventFields = [
  { name: "title", placeholder: "Title", type: undefined },
  { name: "startsAt", placeholder: "Start time", type: "datetime-local" },
  { name: "endsAt", placeholder: "End time", type: "datetime-local" },
  { name: "location", placeholder: "Location (optional)", type: undefined },
  { name: "link", placeholder: "Link (optional)", type: "url" },
  { name: "description", placeholder: "Description (optional)", type: undefined },
] as const;

const HOUR_HEIGHT = 64;

function ValidationMessage({ errors }: { errors: readonly unknown[] }) {
  const error = errors[0];
  const message =
    error && typeof error === "object" && "message" in error && typeof error.message === "string"
      ? error.message
      : null;
  return message ? <p className="text-xs text-destructive">{message}</p> : null;
}

function currentSemester(date = new Date()) {
  return `${String(date.getFullYear()).slice(-2)}${date.getMonth() < 6 ? "v" : "h"}`;
}

function minutesSinceMidnight(timestamp: number) {
  const date = new Date(timestamp);
  return date.getHours() * 60 + date.getMinutes();
}

function courseKey(courseId: string, term: number) {
  return `${courseId}¤${term}`;
}

function courseColors(courses: readonly { id: string; term: number }[]) {
  return new Map(
    courses.map((course, index) => [courseKey(course.id, course.term), (index * 73.0) % 360]),
  );
}

function courseColor(hue: number) {
  return {
    backgroundColor: `color-mix(in oklab, hsl(${hue} 75% 50%) 18%, var(--background))`,
    borderColor: `color-mix(in oklab, hsl(${hue} 75% 50%) 55%, var(--border))`,
  };
}

export const Route = createFileRoute("/_auth/app/")({
  loader: async () => {
    const semester = currentSemester();
    const [calendars, courses, origin] = await Promise.all([
      $listCalendars(),
      $listAvailableCourses({ data: { semester } }),
      $getPublicOrigin(),
    ]);
    const calendarData = await Promise.all(
      calendars.map(async (calendar) => ({
        calendarId: calendar.id,
        events: await $getMySchedule({ data: { calendarId: calendar.id, semester } }),
        courses: await $listCalendarCourses({ data: { calendarId: calendar.id, semester } }),
      })),
    );
    return { semester, calendars, courses, calendarData, origin };
  },
  component: CalendarPage,
});

function CalendarPage() {
  const { semester, calendars, courses, calendarData, origin } = Route.useLoaderData();
  const router = useRouter();
  const createCalendar = useServerFn($createCalendar);
  const createDemoCalendar = useServerFn($createDemoCalendar);
  const deleteCalendar = useServerFn($deleteCalendar);
  const addCourse = useServerFn($addCalendarCourse);
  const removeCourse = useServerFn($removeCalendarCourse);
  const updateExcludedSeries = useServerFn($updateExcludedSeries);
  const createCalendarEvent = useServerFn($createCalendarEvent);
  const createCourseEvent = useServerFn($createCourseEvent);
  const updateGlobalEventsSubscription = useServerFn($updateGlobalEventsSubscription);
  const [calendarId, setCalendarId] = useState(calendars[0]?.id ?? "");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const activeCalendarId = calendarId || calendars[0]?.id || "";
  const calendarForm = useForm({
    defaultValues: { name: "" },
    onSubmit: async ({ value, formApi }) => {
      await createCalendar({ data: { name: value.name.trim() } });
      formApi.reset();
      await router.invalidate({ sync: true });
    },
  });
  const courseForm = useForm({
    defaultValues: { course: "" },
    onSubmit: async ({ value, formApi }) => {
      const [id, term] = value.course.split("¤");
      if (!activeCalendarId || !id || !term) return;
      await addCourse({
        data: { calendarId: activeCalendarId, semester, id, term: Number(term) },
      });
      formApi.reset();
      await router.invalidate({ sync: true });
    },
  });
  const weekEnd = addWeeks(weekStart, 1);
  const events =
    calendarData
      .find((data) => data.calendarId === activeCalendarId)
      ?.events.filter(
        (event) => event.startsAt >= weekStart.getTime() && event.startsAt < weekEnd.getTime(),
      ) ?? [];

  const addedCourses =
    calendarData.find((data) => data.calendarId === activeCalendarId)?.courses ?? [];
  const colors = courseColors(addedCourses);
  const eventForm = useForm({
    defaultValues: {
      course: addedCourses[0] ? courseKey(addedCourses[0].id, addedCourses[0].term) : "",
      title: "",
      startsAt: "",
      endsAt: "",
      location: "",
      link: "",
      description: "",
      publishToGlobal: false,
    },
    validators: { onChange: eventFormSchema, onSubmit: eventFormSchema },
    onSubmit: async ({ value, formApi }) => {
      const [courseId, term] = value.course.split("¤");
      const data = {
        semester,
        courseId,
        term: Number(term),
        title: value.title.trim(),
        description: value.description.trim() || undefined,
        startsAt: new Date(value.startsAt),
        endsAt: new Date(value.endsAt),
        location: value.location.trim() || undefined,
        link: value.link || undefined,
      };
      if (value.publishToGlobal) {
        await createCourseEvent({ data });
      } else {
        await createCalendarEvent({ data: { ...data, calendarId: activeCalendarId } });
      }
      formApi.reset();
      await router.invalidate({ sync: true });
    },
  });

  async function handleDeleteCalendar() {
    if (!activeCalendarId || !window.confirm("Delete this calendar and all of its events?")) return;
    await deleteCalendar({ data: { calendarId: activeCalendarId } });
    setCalendarId(calendars.find((calendar) => calendar.id !== activeCalendarId)?.id ?? "");
    await router.invalidate({ sync: true });
  }

  async function handleRemoveCourse(id: string, term: number) {
    await removeCourse({ data: { calendarId: activeCalendarId, semester, id, term } });
    await router.invalidate({ sync: true });
  }

  async function handleSeriesChange(course: (typeof addedCourses)[number], sourceId: string) {
    const excludedSourceIds = course.excludedSourceIds.includes(sourceId)
      ? course.excludedSourceIds.filter((id) => id !== sourceId)
      : [...course.excludedSourceIds, sourceId];
    await updateExcludedSeries({
      data: {
        calendarId: activeCalendarId,
        semester,
        id: course.id,
        term: course.term,
        excludedSourceIds,
      },
    });
    await router.invalidate({ sync: true });
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Schedule</h1>
        <p className="text-sm text-muted-foreground">Semester {semester}</p>
      </header>

      <section className="grid gap-4 rounded-lg border p-4 md:grid-cols-2">
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            calendarForm.handleSubmit();
          }}
        >
          <Label htmlFor="calendar-name">New calendar</Label>
          <div className="flex gap-2">
            <calendarForm.Field
              name="name"
              validators={{
                onChange: ({ value }) => (!value.trim() ? "Name is required" : undefined),
              }}
            >
              {(field) => (
                <Input
                  id="calendar-name"
                  name={field.name}
                  placeholder="My semester"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              )}
            </calendarForm.Field>
            <calendarForm.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
              {([canSubmit, isSubmitting]) => (
                <Button type="submit" disabled={!canSubmit || isSubmitting}>
                  Create
                </Button>
              )}
            </calendarForm.Subscribe>
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                await createDemoCalendar({ data: { semester } });
                await router.invalidate({ sync: true });
              }}
            >
              Create demo
            </Button>
          </div>
        </form>

        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            courseForm.handleSubmit();
          }}
        >
          <Label htmlFor="course">Add course</Label>
          <div className="flex gap-2">
            <courseForm.Field
              name="course"
              validators={{ onChange: ({ value }) => (!value ? "Course is required" : undefined) }}
            >
              {(field) => (
                <select
                  className="min-w-0 flex-1 rounded-md border bg-background px-3 text-sm"
                  id="course"
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  disabled={!activeCalendarId}
                >
                  <option value="">Select a course</option>
                  {courses.map((course) => (
                    <option
                      key={`${course.id}-${course.term}`}
                      value={`${course.id}¤${course.term}`}
                    >
                      {course.id} · {course.nameEn ?? course.name ?? course.nameNb} · term{" "}
                      {course.term}
                    </option>
                  ))}
                </select>
              )}
            </courseForm.Field>
            <courseForm.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
              {([canSubmit, isSubmitting]) => (
                <Button type="submit" disabled={!activeCalendarId || !canSubmit || isSubmitting}>
                  Add
                </Button>
              )}
            </courseForm.Subscribe>
          </div>
        </form>
      </section>

      {calendars.length === 0 ? (
        <p className="rounded-lg border p-6 text-center text-muted-foreground">
          Create a calendar to get started.
        </p>
      ) : (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <select
              className="rounded-md border bg-background px-3 py-2 text-sm"
              value={activeCalendarId}
              onChange={(event) => setCalendarId(event.target.value)}
            >
              {calendars.map((calendar) => (
                <option key={calendar.id} value={calendar.id}>
                  {calendar.name}
                </option>
              ))}
            </select>
            <Button
              aria-label="Delete calendar"
              size="icon"
              title="Delete calendar"
              type="button"
              variant="destructive"
              onClick={handleDeleteCalendar}
            >
              <Trash2Icon />
            </Button>
          </div>

          <div className="rounded-lg border p-3">
            <h2 className="mb-2 text-sm font-semibold">Added courses</h2>
            {addedCourses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No courses added yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {addedCourses.map((addedCourse) => {
                  const details = courses.find(
                    (course) => course.id === addedCourse.id && course.term === addedCourse.term,
                  );
                  return (
                    <div
                      className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm"
                      key={`${addedCourse.id}-${addedCourse.term}`}
                      style={courseColor(
                        colors.get(courseKey(addedCourse.id, addedCourse.term)) ?? 0,
                      )}
                    >
                      <div>
                        <span>
                          <strong>{addedCourse.id}</strong> · {details?.nameEn ?? details?.name}
                        </span>
                        <label className="mt-1 flex items-center gap-1 text-xs">
                          <input
                            type="checkbox"
                            checked={addedCourse.globalEventsSubscribed}
                            onChange={async (event) => {
                              await updateGlobalEventsSubscription({
                                data: {
                                  calendarId: activeCalendarId,
                                  semester,
                                  id: addedCourse.id,
                                  term: addedCourse.term,
                                  subscribed: event.target.checked,
                                },
                              });
                              await router.invalidate({ sync: true });
                            }}
                          />
                          Subscribe to shared events
                        </label>
                        {addedCourse.series.length > 0 && (
                          <details className="mt-1 text-xs">
                            <summary className="cursor-pointer">Recurring events</summary>
                            <div className="mt-1 grid gap-1">
                              {addedCourse.series.map((series) => (
                                <label className="flex items-center gap-1" key={series.sourceId}>
                                  <input
                                    type="checkbox"
                                    checked={
                                      !addedCourse.excludedSourceIds.includes(series.sourceId)
                                    }
                                    onChange={() =>
                                      handleSeriesChange(addedCourse, series.sourceId)
                                    }
                                  />
                                  {format(series.startsAt, "EEE HH:mm")}–
                                  {format(series.endsAt, "HH:mm")} · {series.summary ?? "Class"}
                                  {series.room && ` · ${series.room}`}
                                </label>
                              ))}
                            </div>
                          </details>
                        )}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemoveCourse(addedCourse.id, addedCourse.term)}
                      >
                        Remove
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <section className="rounded-lg border p-4">
            <h2 className="mb-3 text-sm font-semibold">Events</h2>
            <form
              className="grid gap-2 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                eventForm.handleSubmit();
              }}
            >
              <eventForm.Field name="course">
                {(field) => (
                  <div className="space-y-1">
                    <select
                      aria-invalid={field.state.meta.errors.length > 0}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                    >
                      <option value="">Select a course</option>
                      {addedCourses.map((course) => (
                        <option
                          key={courseKey(course.id, course.term)}
                          value={courseKey(course.id, course.term)}
                        >
                          {course.id} term {course.term}
                        </option>
                      ))}
                    </select>
                    <ValidationMessage errors={field.state.meta.errors} />
                  </div>
                )}
              </eventForm.Field>
              {eventFields.map((input) => (
                <eventForm.Field key={input.name} name={input.name}>
                  {(field) => (
                    <div className="space-y-1">
                      <Input
                        aria-invalid={field.state.meta.errors.length > 0}
                        name={field.name}
                        type={input.type}
                        placeholder={input.placeholder}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                      />
                      <ValidationMessage errors={field.state.meta.errors} />
                    </div>
                  )}
                </eventForm.Field>
              ))}
              <eventForm.Field name="publishToGlobal">
                {(field) => (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      name={field.name}
                      type="checkbox"
                      checked={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.checked)}
                    />
                    Publish to the course pool
                  </label>
                )}
              </eventForm.Field>
              <eventForm.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
                {([canSubmit, isSubmitting]) => (
                  <Button
                    type="submit"
                    disabled={!addedCourses.length || !canSubmit || isSubmitting}
                  >
                    Add event
                  </Button>
                )}
              </eventForm.Subscribe>
            </form>
          </section>

          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" onClick={() => setWeekStart(addWeeks(weekStart, -1))}>
              Previous
            </Button>
            <span className="min-w-40 text-center text-sm font-medium">
              {format(weekStart, "d MMM")}–{format(addDays(weekEnd, -1), "d MMM yyyy")}
            </span>
            <Button variant="outline" onClick={() => setWeekStart(addWeeks(weekStart, 1))}>
              Next
            </Button>
          </div>

          <WeekCalendar
            colors={colors}
            events={events}
            weekStart={weekStart}
            onExclude={(event) => {
              const course = addedCourses.find(
                (item) => item.id === event.courseId && item.term === event.term,
              );
              if (course) handleSeriesChange(course, event.sourceId);
            }}
          />

          <div className="rounded-lg border p-3">
            <h2 className="mb-2 text-sm font-semibold">Calendar feeds</h2>
            <div className="grid gap-2 font-mono text-xs">
              {[
                `${origin}/calendars/${activeCalendarId}/unfiltered.ics`,
                `${origin}/calendars/${activeCalendarId}/filtered.ics`,
                ...addedCourses.map(
                  (course) =>
                    `${origin}/calendars/${activeCalendarId}/${encodeURIComponent(course.id)}.ics`,
                ),
              ].map((url) => (
                <a className="break-all underline underline-offset-4" href={url} key={url}>
                  {url}
                </a>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              These links are public. Paste one into your calendar application's subscription URL.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}

function WeekCalendar({
  colors,
  events,
  weekStart,
  onExclude,
}: {
  colors: Map<string, number>;
  events: CalendarEvent[];
  weekStart: Date;
  onExclude: (event: CalendarEvent) => void;
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
                    <button
                      className="block w-full text-left"
                      key={event.eventId}
                      onClick={() => onExclude(event)}
                      title="Hide this recurring event"
                      type="button"
                    >
                      <EventContent colors={colors} event={event} />
                    </button>
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
                <div
                  className="relative border-l bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_63px,var(--border)_64px)]"
                  key={date.toISOString()}
                  style={{ height }}
                >
                  {dayEvents.map(({ event, column, columns }) => {
                    const top =
                      ((minutesSinceMidnight(event.startsAt) - startHour * 60) / 60) * HOUR_HEIGHT;
                    const eventHeight = Math.max(
                      24,
                      ((event.endsAt - event.startsAt) / 3_600_000) * HOUR_HEIGHT,
                    );
                    return (
                      <button
                        className="absolute overflow-hidden rounded-md border p-1.5 text-left text-xs shadow-sm"
                        key={event.eventId}
                        style={{
                          ...courseColor(colors.get(courseKey(event.courseId, event.term)) ?? 0),
                          top,
                          height: eventHeight,
                          left: `calc(${(column / columns) * 100}% + 2px)`,
                          width: `calc(${100 / columns}% - 4px)`,
                        }}
                        title={`Hide recurring event: ${event.courseId} ${event.summary ?? event.teachingTitle ?? "Class"}`}
                        type="button"
                        onClick={() => onExclude(event)}
                      >
                        <EventContent colors={colors} event={event} compact />
                      </button>
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

function EventContent({
  colors,
  event,
  compact = false,
}: {
  colors: Map<string, number>;
  event: CalendarEvent;
  compact?: boolean;
}) {
  const room = event.rooms.map((item) => item.roomName).join(", ");
  return (
    <div
      className={compact ? "leading-tight" : "rounded-md border p-2"}
      style={
        compact ? undefined : courseColor(colors.get(courseKey(event.courseId, event.term)) ?? 0)
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
