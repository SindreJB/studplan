import { createFileRoute } from "@tanstack/react-router";

import { CreateCalendarForm } from "#/components/create-calendar-form";

export const Route = createFileRoute("/_auth/app/new")({ component: CreateCalendarForm });
