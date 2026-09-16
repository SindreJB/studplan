import { queryOptions } from "@tanstack/react-query";

import { $listCalendarSubmissions } from "../submission.functions";

export const calendarSubmissionsQueryOptions = (calendarId: string, semester: string) =>
  queryOptions({
    queryKey: ["calendar-submissions", calendarId, semester],
    queryFn: () => $listCalendarSubmissions({ data: { calendarId, semester } }),
  });
