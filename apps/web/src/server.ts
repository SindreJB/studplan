import * as Sentry from "@sentry/cloudflare/nodejs_compat";
import handler from "@tanstack/react-start/server-entry";

import {
  currentSemester,
  syncCourseCatalog,
  syncTrackedCourseSchedules,
} from "./lib/course-sync.server";

const WEEKLY_CATALOG_CRON = "0 4 * * 1";

export default Sentry.withSentry(
  (env: Env) => ({
    dsn: env.SENTRY_DSN,
    tracesSampleRate: 0.1,
  }),
  {
    fetch: (request) => handler.fetch(request),
    scheduled(controller: ScheduledController, _env: Env, context: ExecutionContext) {
      context.waitUntil(
        controller.cron === WEEKLY_CATALOG_CRON
          ? syncCourseCatalog(currentSemester()).then((result) => {
              if (result.isErr()) console.error("Course catalog sync failed", result.error);
            })
          : syncTrackedCourseSchedules().then((result) => {
              if (result.isErr()) {
                console.error("Course schedule sync failed", result.error);
              } else if (result.value.failures.length > 0) {
                console.error("Some course schedules failed to sync", result.value.failures);
              }
            }),
      );
    },
  } satisfies ExportedHandler<Env>,
);
