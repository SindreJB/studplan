import handler from "@tanstack/react-start/server-entry";

import {
  currentSemester,
  syncCourseCatalog,
  syncTrackedCourseSchedules,
} from "./lib/course-sync.server.ts";

const WEEKLY_CATALOG_CRON = "0 4 * * 0";

export default {
  fetch: handler.fetch,
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
};
