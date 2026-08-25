import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";

import { calendarsQueryOptions } from "#/lib/queries/calendars";

export const Route = createFileRoute("/_auth/app/$calendarId")({
  beforeLoad: async ({ params, context }) => {
    const calendars = await context.queryClient.ensureQueryData({
      ...calendarsQueryOptions(),
      revalidateIfStale: true,
    });
    const calendar = calendars.find((item) => item.id === params.calendarId);
    if (!calendar) throw notFound();
    return { calendar };
  },
  component: Outlet,
});
