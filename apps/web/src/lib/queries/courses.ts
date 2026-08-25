import { queryOptions } from "@tanstack/react-query";

import { $listAvailableCourses, $listCalendarCourses } from "../course.functions";

export const availableCoursesQueryOptions = (semester: string) =>
  queryOptions({
    queryKey: ["available-courses", semester],
    queryFn: () => $listAvailableCourses({ data: { semester } }),
  });

export const calendarCoursesQueryOptions = (calendarId: string, semester: string) =>
  queryOptions({
    queryKey: ["calendar-courses", calendarId, semester],
    queryFn: () => $listCalendarCourses({ data: { calendarId, semester } }),
  });
