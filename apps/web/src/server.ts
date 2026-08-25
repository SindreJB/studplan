import handler from "@tanstack/react-start/server-entry";

import {
  currentSemester,
  syncCourseCatalog,
  syncTrackedCourseSchedules,
} from "./lib/course-sync.server";

const WEEKLY_CATALOG_CRON = "0 4 * * 1";

async function fetch(request: Request) {
  try {
    return await handler.fetch(request);
  } catch (error) {
    console.error({ message: "Unhandled request error", error });
    return new Response("Internal server error. Check Cloudflare Workers Logs.", { status: 500 });
  }
}

export default {
  fetch,
  scheduled(controller: ScheduledController, _env: Env, context: ExecutionContext) {
    context.waitUntil(
      controller.cron === WEEKLY_CATALOG_CRON
        ? syncCourseCatalog(currentSemester()).then((result) => {
            if (result.isErr()) {
              console.error({ message: "Course catalog sync failed", error: result.error });
            }
          })
        : syncTrackedCourseSchedules().then((result) => {
            if (result.isErr()) {
              console.error({ message: "Course schedule sync failed", error: result.error });
            } else if (result.value.failures.length > 0) {
              console.error({
                message: "Some course schedules failed to sync",
                failures: result.value.failures,
              });
            }
          }),
    );
  },
} satisfies ExportedHandler<Env>;
