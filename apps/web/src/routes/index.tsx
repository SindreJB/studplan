import { authQueryOptions } from "@repo/auth/tanstack/queries";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, Clock3 } from "lucide-react";

import { scheduleEventColorStyle, ScheduleEventContent } from "#/components/schedule-event-content";
import { ThemeToggle } from "#/components/theme-toggle";

export const Route = createFileRoute("/")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({
      ...authQueryOptions(),
      revalidateIfStale: true,
    }),
  component: HomePage,
});

const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const classes = [
  {
    day: 0,
    start: "08:15",
    end: "10:00",
    title: "Algorithms",
    code: "TDT4120",
    room: "R1",
    top: "2%",
    color: "#8b5cf6",
  },
  {
    day: 0,
    start: "11:15",
    end: "13:00",
    title: "Data structures",
    code: "TDT4160",
    room: "F1",
    top: "32%",
    color: "#06b6d4",
  },
  {
    day: 0,
    start: "14:15",
    end: "16:00",
    title: "Mathematics 3",
    code: "TMA4115",
    room: "S2",
    top: "62%",
    color: "#10b981",
  },
  {
    day: 1,
    start: "09:15",
    end: "11:00",
    title: "Interaction design",
    code: "IT3402",
    room: "A3",
    top: "12%",
    color: "#f59e0b",
  },
  {
    day: 1,
    start: "12:15",
    end: "14:00",
    title: "Algorithms",
    code: "TDT4120",
    room: "R7",
    top: "42%",
    color: "#8b5cf6",
  },
  {
    day: 1,
    start: "15:15",
    end: "17:00",
    title: "Web development",
    code: "IT2805",
    room: "G21",
    top: "72%",
    color: "#ec4899",
  },
  {
    day: 2,
    start: "08:15",
    end: "10:00",
    title: "Data structures",
    code: "TDT4160",
    room: "F1",
    top: "2%",
    color: "#06b6d4",
  },
  {
    day: 2,
    start: "11:15",
    end: "13:00",
    title: "Mathematics 3",
    code: "TMA4115",
    room: "S2",
    top: "32%",
    color: "#10b981",
  },
  {
    day: 2,
    start: "14:15",
    end: "16:00",
    title: "Interaction design",
    code: "IT3402",
    room: "A3",
    top: "62%",
    color: "#f59e0b",
  },
  {
    day: 3,
    start: "09:15",
    end: "11:00",
    title: "Algorithms",
    code: "TDT4120",
    room: "R1",
    top: "12%",
    color: "#8b5cf6",
  },
  {
    day: 3,
    start: "13:15",
    end: "15:00",
    title: "Web development",
    code: "IT2805",
    room: "G21",
    top: "52%",
    color: "#ec4899",
  },
  {
    day: 4,
    start: "10:15",
    end: "12:00",
    title: "Data structures",
    code: "TDT4160",
    room: "F1",
    top: "22%",
    color: "#06b6d4",
  },
  {
    day: 4,
    start: "13:15",
    end: "15:00",
    title: "Mathematics 3",
    code: "TMA4115",
    room: "S2",
    top: "52%",
    color: "#10b981",
  },
];

function HomePage() {
  const user = Route.useLoaderData();

  return (
    <main className="min-h-svh overflow-hidden bg-background text-foreground selection:bg-violet-200 selection:text-violet-950 dark:selection:bg-violet-800 dark:selection:text-violet-50">
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between border-b px-5 py-4 sm:px-8"
        aria-label="Main navigation"
      >
        <Link
          to="/"
          className="group flex items-center gap-2.5 rounded-lg font-semibold tracking-tight outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-foreground text-background transition-transform group-hover:-rotate-3">
            <CalendarDays className="size-4.5" aria-hidden="true" />
          </span>
          Studplan
        </Link>
        <div className="flex items-center gap-1.5">
          <Link
            to={user ? "/app" : "/login"}
            className="rounded-2xl px-3 py-2 text-sm font-medium transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
          >
            {user ? "Go to dashboard" : "Log in"}
          </Link>
          <ThemeToggle />
        </div>
      </nav>

      <section className="mx-auto max-w-7xl px-5 pt-12 sm:px-8 sm:pt-16 lg:pt-20">
        <div className="grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="max-w-4xl">
            <h1 className="max-w-3xl text-4xl leading-[1.05] font-bold tracking-[-0.04em] text-balance sm:text-5xl">
              Build your calendar from{" "}
              <span className="text-violet-700 dark:text-violet-400">NTNU courses.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              Review classes and exams, then subscribe with the calendar app you already use.
            </p>
          </div>
          <Link
            to="/app"
            className="group inline-flex min-h-11 items-center gap-2 justify-self-start rounded-2xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white transition-[background-color,transform] hover:bg-violet-600 focus-visible:ring-3 focus-visible:ring-violet-400/40 focus-visible:outline-none active:translate-y-px lg:justify-self-end"
          >
            Go to dashboard
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        </div>

        <div className="mt-12 border-y sm:mt-16">
          <div className="flex items-center justify-between gap-4 py-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Example week</span>
            <span className="hidden sm:inline">Courses, rooms, and times shown together</span>
            <span className="flex items-center gap-1.5 tabular-nums">
              <Clock3 className="size-3.5" aria-hidden="true" />
              Week 42
            </span>
          </div>

          <div className="hidden min-h-[30rem] grid-cols-[3.5rem_repeat(5,minmax(0,1fr))] grid-rows-[auto_1fr] md:grid">
            <div className="border-r" aria-hidden="true" />
            {weekdays.map((day) => (
              <div className="border-r px-3 py-2.5 text-xs font-medium last:border-r-0" key={day}>
                {day}
              </div>
            ))}

            <div className="relative border-r text-xs text-muted-foreground tabular-nums">
              {["08", "10", "12", "14", "16"].map((hour, index) => (
                <span
                  className="absolute right-3 -translate-y-1/2"
                  style={{ top: `${2 + index * 20}%` }}
                  key={hour}
                >
                  {hour}:00
                </span>
              ))}
            </div>
            {weekdays.map((day, dayIndex) => (
              <div
                className="relative border-r bg-[linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[length:100%_20%] last:border-r-0"
                key={day}
              >
                {classes
                  .filter((entry) => entry.day === dayIndex)
                  .map((entry, index) => (
                    <article
                      className="landing-event absolute inset-x-2 h-[18%] overflow-hidden rounded-md border p-2 text-xs shadow-sm"
                      style={{
                        ...scheduleEventColorStyle(entry.color),
                        top: entry.top,
                        animationDelay: `${120 + (entry.day + index) * 70}ms`,
                      }}
                      key={`${entry.code}-${entry.day}-${entry.start}`}
                    >
                      <ScheduleEventContent
                        compact
                        event={{
                          courseId: entry.code,
                          startsAt: 0,
                          endsAt: 0,
                          summary: entry.title,
                          kind: "teaching",
                          rooms: [{ roomName: entry.room, roomUrl: "" }],
                        }}
                        timeLabel={`${entry.start}–${entry.end}`}
                      />
                    </article>
                  ))}
              </div>
            ))}
          </div>

          <div className="space-y-3 py-3 md:hidden">
            {classes
              .filter(
                (entry, index) =>
                  classes.findIndex((candidate) => candidate.day === entry.day) === index,
              )
              .map((entry) => (
                <article
                  className="landing-event"
                  key={`${entry.code}-${entry.day}-${entry.start}`}
                >
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                    {weekdays[entry.day]}
                  </p>
                  <ScheduleEventContent
                    color={entry.color}
                    event={{
                      courseId: entry.code,
                      startsAt: 0,
                      endsAt: 0,
                      summary: entry.title,
                      kind: "teaching",
                      rooms: [{ roomName: entry.room, roomUrl: "" }],
                    }}
                    timeLabel={`${entry.start}–${entry.end}`}
                  />
                </article>
              ))}
          </div>
        </div>
      </section>
    </main>
  );
}
