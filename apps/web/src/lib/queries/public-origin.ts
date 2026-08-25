import { queryOptions } from "@tanstack/react-query";

import { $getPublicOrigin } from "../course.functions";

export const publicOriginQueryOptions = () =>
  queryOptions({
    queryKey: ["public-origin"],
    queryFn: () => $getPublicOrigin(),
  });
