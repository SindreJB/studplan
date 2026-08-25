import { Button } from "@repo/ui/components/button";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { ExternalLink, Trash2 } from "lucide-react";

import {
  deleteCalendarMutationOptions,
  updateCalendarSemesterMutationOptions,
} from "#/lib/mutations";
import { calendarCoursesQueryOptions } from "#/lib/queries/courses";
import { publicOriginQueryOptions } from "#/lib/queries/public-origin";
import { semesterOptions } from "#/lib/semester";

export const Route = createFileRoute("/_auth/app/$calendarId/settings")({
  loader: async ({ params, context }) => {
    const [origin, courses] = await Promise.all([
      context.queryClient.ensureQueryData({
        ...publicOriginQueryOptions(),
        revalidateIfStale: true,
      }),
      context.queryClient.ensureQueryData({
        ...calendarCoursesQueryOptions(params.calendarId, context.calendar.semester),
        revalidateIfStale: true,
      }),
    ]);
    return { origin, calendar: context.calendar, courses };
  },
  component: SettingsPage,
});

function SettingsPage() {
  const { calendarId } = Route.useParams();
  const { origin, calendar, courses } = Route.useLoaderData();
  const deleteCalendar = useMutation(deleteCalendarMutationOptions());
  const updateSemester = useMutation(updateCalendarSemesterMutationOptions());
  const navigate = useNavigate();
  const router = useRouter();
  const feeds = [
    { label: "Full calendar", url: `${origin}/calendars/${calendarId}/unfiltered.ics` },
    { label: "Filtered calendar", url: `${origin}/calendars/${calendarId}/filtered.ics` },
    ...courses.map((course) => ({
      label: course.id,
      url: `${origin}/calendars/${calendarId}/${encodeURIComponent(course.id)}.ics`,
    })),
  ];

  async function refresh() {
    await router.invalidate({ sync: true });
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage {calendar?.name ?? "this calendar"}.</p>
      </header>
      <section className="space-y-3 rounded-xl border bg-card p-5">
        <div>
          <h2 className="font-medium">Semester</h2>
          <p className="text-sm text-muted-foreground">
            Changing semester removes every course from this calendar.
          </p>
        </div>
        <select
          aria-label="Semester"
          className="h-8 w-full max-w-xs rounded-2xl border border-input bg-background px-3 text-sm"
          value={calendar.semester}
          onChange={async (event) => {
            const semester = event.target.value;
            if (!window.confirm("Change semester and remove all courses from this calendar?")) {
              event.target.value = calendar.semester;
              return;
            }
            await updateSemester.mutateAsync({ calendarId, semester });
            await refresh();
          }}
        >
          {semesterOptions().map((semester) => (
            <option key={semester.value} value={semester.value}>
              {semester.label}
            </option>
          ))}
        </select>
      </section>
      <section className="space-y-3 rounded-xl border bg-card p-5">
        <div>
          <h2 className="font-medium">Calendar feeds</h2>
          <p className="text-sm text-muted-foreground">
            Add one of these subscription URLs to Google Calendar.
          </p>
        </div>
        {feeds.map((feed) => (
          <a
            key={feed.url}
            href={feed.url}
            className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm hover:bg-muted"
          >
            <span>
              <strong className="block">{feed.label}</strong>
              <span className="text-xs break-all text-muted-foreground">{feed.url}</span>
            </span>
            <ExternalLink className="size-4 shrink-0" />
          </a>
        ))}
      </section>
      <section className="flex items-center justify-between gap-4 rounded-xl border border-destructive/30 p-5">
        <div>
          <h2 className="font-medium">Delete calendar</h2>
          <p className="text-sm text-muted-foreground">
            This permanently removes its courses and events.
          </p>
        </div>
        <Button
          variant="destructive"
          onClick={async () => {
            if (!window.confirm(`Delete ${calendar?.name ?? "this calendar"}?`)) return;
            await deleteCalendar.mutateAsync({ calendarId });
            await refresh();
            await navigate({ to: "/app" });
          }}
        >
          <Trash2 /> Delete
        </Button>
      </section>
    </div>
  );
}
