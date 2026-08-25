import { createFileRoute } from "@tanstack/react-router";

import { getCalendarIcal, type CalendarFeed } from "#/lib/calendar-feed.server";

export const Route = createFileRoute("/calendars/$calendarId/{$feed}.ics")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const feedName = params.feed.toUpperCase();
        if (!/^[A-Z0-9_-]+$/.test(feedName)) {
          return new Response("Invalid calendar feed", { status: 404 });
        }
        const feed: CalendarFeed =
          params.feed === "filtered" || params.feed === "unfiltered"
            ? params.feed
            : { courseId: feedName };
        const result = await getCalendarIcal(params.calendarId, feed);
        if (result.isErr()) return new Response("Could not create calendar", { status: 500 });
        if (result.value === null) return new Response("Calendar not found", { status: 404 });

        return new Response(result.value, {
          headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            "Content-Disposition": `inline; filename="${feedName.toLowerCase()}.ics"`,
            "Cache-Control": "public, max-age=300",
          },
        });
      },
    },
  },
});
