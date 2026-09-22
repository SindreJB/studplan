import { authQueryOptions } from "@repo/auth/tanstack/queries";
import { createFileRoute, Link } from "@tanstack/react-router";

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

/** The six entries of the catalog, in reading order. */
const tiles = [
  { number: "01", title: "Courses", caption: "From the NTNU catalog", face: "tile-serif" },
  { number: "02", title: "Schedule", caption: "Every class, one week", face: "tile-serif-italic" },
  { number: "03", title: "Deadlines", caption: "Submissions, tracked", face: "tile-serif" },
  { number: "04", title: "Exams", caption: "Dates as they land", face: "tile-serif-italic" },
  { number: "05", title: "Feeds", caption: "Subscribe by .ics", face: "tile-sans" },
  { number: "06", title: "Account", caption: "Calendars and settings", face: "tile-sans" },
] as const;

function HomePage() {
  const user = Route.useLoaderData();
  const entry = user ? "/app" : "/login";

  return (
    <main className="catalog-home">
      <header className="catalog-header">
        <div className="catalog-brand catalog-display">
          Studplan,
          <br />
          course calendars
          <br />
          for NTNU
        </div>

        <div className="catalog-intro">
          <p>
            Build a calendar from the courses you actually take — classes, exams and submission
            deadlines together — then subscribe to it from the calendar app you already use.
          </p>
          <em>
            Pick courses · hide the lectures you skip · one .ics feed per course, or all of them at
            once.
          </em>
        </div>

        <div className="catalog-meta">
          <CatalogMenu
            links={[
              { label: user ? "Dashboard" : "Log in", to: entry },
              { label: "Sign up", to: "/signup" },
              { label: "Home", to: "/" },
            ]}
          />
          <ThemeToggle />
        </div>
      </header>

      <div className="catalog-grid">
        {tiles.map((tile) => (
          <Link className="catalog-tile catalog-invert" key={tile.number} to={entry}>
            <span className="catalog-number">{tile.number}</span>
            <span className={`catalog-tile-title ${tile.face}`}>
              {tile.title}
              <small>{tile.caption}</small>
            </span>
          </Link>
        ))}
      </div>

      <section className="mt-12 border-t border-border">
        <div className="flex items-center justify-between gap-4 border-b border-border py-3">
          <span className="catalog-eyebrow">Example week</span>
          <span className="catalog-eyebrow hidden sm:inline">
            Courses, rooms and times, as they arrive
          </span>
          <span className="catalog-eyebrow tabular-nums">Week 42</span>
        </div>

        <div className="hidden min-h-[30rem] grid-cols-[3.5rem_repeat(5,minmax(0,1fr))] grid-rows-[auto_1fr] md:grid">
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

        <div className="divide-y divide-border md:hidden">
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

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border py-4">
          <span className="catalog-eyebrow">Studplan · NTNU</span>
          <Link className="catalog-underline text-sm font-bold" to={entry}>
            {user ? "Go to dashboard" : "Log in"} →
          </Link>
        </div>
      </section>
    </main>
  );
}
