import { queryOptions } from "@tanstack/react-query";

import { $listCalendars } from "../course.functions";

export const calendarsQueryOptions = () =>
  queryOptions({
    queryKey: ["calendars"],
    queryFn: () => $listCalendars(),
  });
