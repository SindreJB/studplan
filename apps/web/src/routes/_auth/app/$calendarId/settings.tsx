import { Button } from "@repo/ui/components/button";
import { toast } from "@repo/ui/components/toast";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { Copy, ExternalLink, Trash2 } from "lucide-react";

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
      <header className="border-b border-border pb-5">
        <h1 className="catalog-display text-4xl">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage {calendar?.name ?? "this calendar"}.</p>
      </header>
      <section className="space-y-3 border border-border p-5">
        <div>
          <h2 className="catalog-eyebrow">Semester</h2>
          <p className="text-sm text-muted-foreground">
            Changing semester removes every course from this calendar.
          </p>
        </div>
        <select
          aria-label="Semester"
          className="h-9 w-full max-w-xs border border-input bg-background px-3 text-sm"
          value={calendar.semester}
          onChange={(event) => {
            const semester = event.target.value;
            if (!window.confirm("Change semester and remove all courses from this calendar?")) {
              event.target.value = calendar.semester;
              return;
            }
            updateSemester.mutate({ calendarId, semester }, { onSuccess: () => void refresh() });
          }}
        >
          {semesterOptions().map((semester) => (
            <option key={semester.value} value={semester.value}>
              {semester.label}
            </option>
          ))}
        </select>
      </section>
      <section className="space-y-3 border border-border p-5">
        <div>
          <h2 className="catalog-eyebrow">Calendar feeds</h2>
          <p className="text-sm text-muted-foreground">
            Add one of these subscription URLs to Google Calendar.
          </p>
        </div>
        {feeds.map((feed) => (
          <div className="flex items-center gap-3 border border-border p-3 text-sm" key={feed.url}>
            <a
              href={feed.url}
              className="flex min-w-0 flex-1 items-center justify-between gap-3 hover:text-primary"
            >
              <span>
                <strong className="block">{feed.label}</strong>
                <span className="text-xs break-all text-muted-foreground">{feed.url}</span>
              </span>
              <ExternalLink className="size-4 shrink-0" />
            </a>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label={`Copy ${feed.label} feed URL`}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(feed.url);
                  toast.add({ type: "success", description: "Feed URL copied." });
                } catch {
                  toast.add({ type: "error", description: "Could not copy feed URL." });
                }
              }}
            >
              <Copy />
            </Button>
          </div>
        ))}
      </section>
      <section className="flex items-center justify-between gap-4 border border-destructive p-5">
        <div>
          <h2 className="catalog-eyebrow">Delete calendar</h2>
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
