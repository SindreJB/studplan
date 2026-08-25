import { queryOptions } from "@tanstack/react-query";

import { $getMySchedule } from "../course.functions";

export const scheduleQueryOptions = (calendarId: string, semester: string) =>
  queryOptions({
    queryKey: ["schedule", calendarId, semester],
    queryFn: () => $getMySchedule({ data: { calendarId, semester } }),
  });
