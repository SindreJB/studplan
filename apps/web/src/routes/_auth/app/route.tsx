import { Separator } from "@repo/ui/components/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@repo/ui/components/sidebar";
import { TooltipProvider } from "@repo/ui/components/tooltip";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

import { AppSidebar } from "#/components/app-sidebar";
import { ThemeToggle } from "#/components/theme-toggle";
import { calendarsQueryOptions } from "#/lib/queries/calendars";

export const Route = createFileRoute("/_auth/app")({
  loader: ({ context }) => context.queryClient.fetchQuery(calendarsQueryOptions()),
  component: AppLayout,
});

function AppLayout() {
  const calendars = Route.useLoaderData();

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar calendars={calendars} />
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="h-4! self-center!" />
            <Link className="catalog-wordmark text-sm catalog-underline" to="/">
              Studplan
            </Link>
            <div className="ml-auto">
              <ThemeToggle />
            </div>
          </header>
          <main className="flex flex-1 flex-col p-4 md:p-8">
            <Outlet />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
