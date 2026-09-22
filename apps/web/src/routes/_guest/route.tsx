import { authQueryOptions } from "@repo/auth/tanstack/queries";
import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";

import { ThemeToggle } from "#/components/theme-toggle";

export const Route = createFileRoute("/_guest")({
  component: RouteComponent,
  beforeLoad: async ({ context }) => {
    // Redirect path when user is already present,
    // or after successful login/signup
    const REDIRECT_URL = "/app";

    const user = await context.queryClient.ensureQueryData({
      ...authQueryOptions(),
      revalidateIfStale: true,
    });
    if (user) {
      throw redirect({ to: REDIRECT_URL });
    }

    return {
      redirectUrl: REDIRECT_URL,
    };
  },
});

function RouteComponent() {
  return (
    <div className="flex min-h-svh flex-col bg-background p-3.5">
      <header className="flex items-start justify-between border-b border-border pb-5">
        <Link className="catalog-display text-xl leading-[1.05]" to="/">
          Studplan,
          <br />
          course calendars
          <br />
          for NTNU
        </Link>
        <ThemeToggle />
      </header>
      <div className="flex flex-1 items-center justify-center py-12">
        <div className="w-full max-w-sm border border-border p-7">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
