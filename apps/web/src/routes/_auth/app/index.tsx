import { createFileRoute, redirect } from "@tanstack/react-router";

import { CreateCalendarForm } from "#/components/create-calendar-form";
import { calendarsQueryOptions } from "#/lib/queries/calendars";

export const Route = createFileRoute("/_auth/app/")({
  loader: async ({ context }) => {
    const calendars = await context.queryClient.fetchQuery(calendarsQueryOptions());
    if (calendars[0]) {
      throw redirect({ to: "/app/$calendarId", params: { calendarId: calendars[0].id } });
    }
  },
  component: CreateCalendarForm,
});
