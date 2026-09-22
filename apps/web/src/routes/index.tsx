import { authQueryOptions } from "@repo/auth/tanstack/queries";
import { Button } from "@repo/ui/components/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Clock3 } from "lucide-react";

import { CatalogMenu } from "#/components/catalog-menu";
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

/** The catalog spine: what the app does, numbered. */
const navigation = [
  { number: "01", label: "Courses", caption: "From the NTNU catalog" },
  { number: "02", label: "Schedule", caption: "Every class, one week" },
  { number: "03", label: "Deadlines", caption: "Submissions, tracked" },
  { number: "04", label: "Exams", caption: "Dates as they land" },
  { number: "05", label: "Feeds", caption: "Subscribe by .ics" },
  { number: "06", label: "Account", caption: "Calendars and settings" },
] as const;

function HomePage() {
  const user = Route.useLoaderData();
  const entry = user ? "/app" : "/login";
  const entryLabel = user ? "Go to dashboard" : "Log in";

  return (
    <div className="catalog-shell bg-background text-foreground">
      <aside className="catalog-sidebar">
        <Link className="catalog-sidebar-brand catalog-display" to="/">
          Studplan,
          <br />
          course calendars
          <br />
          for NTNU
        </Link>

        <nav className="flex-1 overflow-y-auto" aria-label="Sections">
          {navigation.map((item) => (
            <Link className="catalog-nav-item catalog-invert" key={item.number} to={entry}>
              <span className="catalog-nav-number">{item.number}</span>
              <span>
                <span className="catalog-nav-label">{item.label}</span>
                <span className="catalog-nav-caption">{item.caption}</span>
              </span>
            </Link>
          ))}
        </nav>

        <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
          <Link className="catalog-eyebrow catalog-underline" to={entry}>
            {entryLabel}
          </Link>
          <ThemeToggle />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 sm:px-8">
          <span className="catalog-eyebrow hidden md:inline">
            Course schedules, exams and deadlines in one feed
          </span>
          <Link className="catalog-display text-lg md:hidden" to="/">
            Studplan
          </Link>
          <div className="flex items-center gap-3">
            <Link className="catalog-eyebrow catalog-underline hidden md:inline" to={entry}>
              {entryLabel}
            </Link>
            <span className="md:hidden">
              <CatalogMenu
                links={[
                  { label: entryLabel, to: entry },
                  { label: "Sign up", to: "/signup" },
                  { label: "Home", to: "/" },
                ]}
              />
            </span>
            <span className="md:hidden">
              <ThemeToggle />
            </span>
          </div>
        </header>

        <section className="px-5 pt-12 pb-10 sm:px-8 sm:pt-16 lg:pt-20">
          <div className="grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="max-w-4xl">
              <h1 className="catalog-display max-w-3xl text-5xl sm:text-6xl lg:text-7xl">
                Build your calendar from{" "}
                <em className="font-medium italic">NTNU courses.</em>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                Review classes and exams, then subscribe with the calendar app you already use.
              </p>
            </div>
            <Button
              className="justify-self-start lg:justify-self-end"
              size="lg"
              nativeButton={false}
              render={<Link to={entry} />}
            >
              {entryLabel}
              <ArrowRight aria-hidden="true" />
            </Button>
          </div>

          <div className="mt-12 border-y border-border sm:mt-16">
            <div className="flex items-center justify-between gap-4 py-3">
              <span className="catalog-eyebrow">Example week</span>
              <span className="catalog-eyebrow hidden sm:inline">
                Courses, rooms and times shown together
              </span>
              <span className="catalog-eyebrow flex items-center gap-1.5 tabular-nums">
                <Clock3 className="size-3" aria-hidden="true" />
                Week 42
              </span>
            </div>

            <div className="hidden min-h-[30rem] grid-cols-[3.5rem_repeat(5,minmax(0,1fr))] grid-rows-[auto_1fr] border-t border-border md:grid">
              <div className="border-r border-b border-border" aria-hidden="true" />
              {weekdays.map((day) => (
                <div
                  className="catalog-eyebrow border-r border-b border-border px-3 py-3 last:border-r-0"
                  key={day}
                >
                  {day}
                </div>
              ))}

              <div className="relative border-r border-border">
                {["08", "10", "12", "14", "16"].map((hour, index) => (
                  <span
                    className="catalog-eyebrow absolute right-3 -translate-y-1/2 tabular-nums"
                    style={{ top: `${2 + index * 20}%` }}
                    key={hour}
                  >
                    {hour}:00
                  </span>
                ))}
              </div>
              {weekdays.map((day, dayIndex) => (
                <div
                  className="relative border-r border-border bg-[linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[length:100%_20%] last:border-r-0"
                  key={day}
                >
                  {classes
                    .filter((event) => event.day === dayIndex)
                    .map((event, index) => (
                      <article
                        className="landing-event absolute inset-x-2 h-[18%] overflow-hidden border p-2 text-xs"
                        style={{
                          ...scheduleEventColorStyle(event.color),
                          top: event.top,
                          animationDelay: `${120 + (event.day + index) * 70}ms`,
                        }}
                        key={`${event.code}-${event.day}-${event.start}`}
                      >
                        <ScheduleEventContent
                          compact
                          event={{
                            courseId: event.code,
                            startsAt: 0,
                            endsAt: 0,
                            summary: event.title,
                            kind: "teaching",
                            rooms: [{ roomName: event.room, roomUrl: "" }],
                          }}
                          timeLabel={`${event.start}–${event.end}`}
                        />
                      </article>
                    ))}
                </div>
              ))}
            </div>

            <div className="divide-y divide-border border-t border-border md:hidden">
              {classes
                .filter(
                  (event, index) =>
                    classes.findIndex((candidate) => candidate.day === event.day) === index,
                )
                .map((event) => (
                  <article className="landing-event py-3" key={`${event.code}-${event.day}`}>
                    <p className="catalog-eyebrow mb-2">{weekdays[event.day]}</p>
                    <ScheduleEventContent
                      color={event.color}
                      event={{
                        courseId: event.code,
                        startsAt: 0,
                        endsAt: 0,
                        summary: event.title,
                        kind: "teaching",
                        rooms: [{ roomName: event.room, roomUrl: "" }],
                      }}
                      timeLabel={`${event.start}–${event.end}`}
                    />
                  </article>
                ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 py-4">
            <span className="catalog-eyebrow">Studplan · NTNU</span>
            <Link className="catalog-underline text-sm font-bold" to={entry}>
              {entryLabel} →
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
