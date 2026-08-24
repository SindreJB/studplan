import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, Clock3 } from "lucide-react";

import { ThemeToggle } from "#/components/theme-toggle";

export const Route = createFileRoute("/")({
  component: HomePage,
});

const classes = [
  ["09:00", "Algorithms", "Room 2.14", "bg-violet-500"],
  ["11:30", "Design systems", "Studio B", "bg-amber-400"],
  ["14:00", "Data structures", "Online", "bg-cyan-500"],
];

function HomePage() {
  return (
    <main className="min-h-svh bg-stone-50 text-slate-950 dark:bg-slate-950 dark:text-stone-50">
      <nav
        className="mx-auto flex max-w-6xl items-center justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800"
        aria-label="Main navigation"
      >
        <Link to="/" className="flex items-center gap-2 font-bold">
          <CalendarDays className="size-5" aria-hidden="true" />
          Studplan
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Log in
          </Link>
          <Link
            to="/signup"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 dark:bg-stone-100 dark:text-slate-950 dark:hover:bg-stone-300"
          >
            Sign up
          </Link>
          <ThemeToggle />
        </div>
      </nav>

      <section className="mx-auto grid max-w-6xl items-center gap-16 px-6 py-16 md:grid-cols-2 md:py-24">
        <div>
          <p className="mb-4 text-sm font-semibold text-violet-700 dark:text-violet-400">
            Course schedule to Google Calendar
          </p>
          <h1 className="max-w-xl text-4xl leading-tight font-bold tracking-tight sm:text-5xl">
            Create a calendar from your course schedule.
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-8 text-slate-600 dark:text-slate-300">
            Add your courses, check the generated schedule, and subscribe to it in Google Calendar.
          </p>
          <Link
            to="/signup"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-violet-700 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-600"
          >
            Create a calendar
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                Monday
              </p>
              <h2 className="mt-1 text-xl font-bold">October 14</h2>
            </div>
            <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              3 classes
            </span>
          </div>
          <div className="space-y-3">
            {classes.map(([time, title, place, color]) => (
              <div key={time} className="grid grid-cols-[3.5rem_1fr] items-center gap-3">
                <span className="text-xs font-medium text-slate-500">{time}</span>
                <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                  <span className={`h-9 w-1 shrink-0 rounded-full ${color}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{place}</p>
                  </div>
                  <Clock3 className="size-4 text-slate-400" aria-hidden="true" />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 border-t border-slate-200 pt-4 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
            Your calendar stays updated when your schedule changes.
          </p>
        </div>
      </section>
    </main>
  );
}
