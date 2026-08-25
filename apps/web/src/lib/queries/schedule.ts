import { queryOptions } from "@tanstack/react-query";

import { $getMySchedule } from "../course.functions";

export const scheduleQueryOptions = (
  calendarId: string,
  semester: string,
  includeExcluded = false,
) =>
  queryOptions({
    queryKey: ["schedule", calendarId, semester, includeExcluded],
    queryFn: () => $getMySchedule({ data: { calendarId, semester, includeExcluded } }),
  });
