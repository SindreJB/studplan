import { mutationOptions } from "@tanstack/react-query";

import {
  $addCalendarCourse,
  $createCalendar,
  $deleteCalendar,
  $removeCalendarCourse,
  $updateCalendarCourseColor,
  $updateCalendarSemester,
  $updateExcludedSeries,
  $updateIncludeExamDates,
  $updateIncludeSubmissionDates,
} from "./course.functions";
import { calendarsQueryOptions } from "./queries/calendars";
import { calendarCoursesQueryOptions } from "./queries/courses";
import { scheduleQueryOptions } from "./queries/schedule";
import { calendarSubmissionsQueryOptions } from "./queries/submissions";
import {
  $createCourseSubmission,
  $deleteCourseSubmission,
  $updateCourseSubmission,
} from "./submission.functions";

type CreateCalendarInput = Parameters<typeof $createCalendar>[0]["data"];
type CalendarSelection = Parameters<typeof $addCalendarCourse>[0]["data"];
type UpdateSemesterInput = Parameters<typeof $updateCalendarSemester>[0]["data"];
type UpdateColorInput = Parameters<typeof $updateCalendarCourseColor>[0]["data"];
type UpdateExcludedSeriesInput = Parameters<typeof $updateExcludedSeries>[0]["data"];
type UpdateIncludeExamDatesInput = Parameters<typeof $updateIncludeExamDates>[0]["data"];
type UpdateIncludeSubmissionDatesInput = Parameters<
  typeof $updateIncludeSubmissionDates
>[0]["data"];
type CreateSubmissionInput = Parameters<typeof $createCourseSubmission>[0]["data"];
type UpdateSubmissionInput = Parameters<typeof $updateCourseSubmission>[0]["data"];
type DeleteSubmissionInput = Parameters<typeof $deleteCourseSubmission>[0]["data"];

export const createCalendarMutationOptions = () =>
  mutationOptions({
    mutationFn: (data: CreateCalendarInput) => $createCalendar({ data }),
    onSuccess: async (_calendar, _data, _onMutateResult, context) => {
      await context.client.invalidateQueries({
        queryKey: calendarsQueryOptions().queryKey,
        refetchType: "all",
      });
    },
  });

export const updateCalendarSemesterMutationOptions = () =>
  mutationOptions({
    mutationFn: (data: UpdateSemesterInput) => $updateCalendarSemester({ data }),
    onSuccess: async (_result, data, _onMutateResult, context) => {
      await Promise.all([
        context.client.invalidateQueries({
          queryKey: calendarsQueryOptions().queryKey,
          refetchType: "all",
        }),
        context.client.invalidateQueries({
          queryKey: ["calendar-courses", data.calendarId],
          refetchType: "all",
        }),
        context.client.invalidateQueries({
          queryKey: ["schedule", data.calendarId],
          refetchType: "all",
        }),
        context.client.invalidateQueries({
          queryKey: ["calendar-submissions", data.calendarId],
          refetchType: "all",
        }),
      ]);
    },
  });

export const deleteCalendarMutationOptions = () =>
  mutationOptions({
    mutationFn: (data: Parameters<typeof $deleteCalendar>[0]["data"]) => $deleteCalendar({ data }),
    onSuccess: async (_result, data, _onMutateResult, context) => {
      await Promise.all([
        context.client.invalidateQueries({
          queryKey: calendarsQueryOptions().queryKey,
          refetchType: "all",
        }),
        context.client.invalidateQueries({
          queryKey: ["calendar-courses", data.calendarId],
          refetchType: "all",
        }),
        context.client.invalidateQueries({
          queryKey: ["schedule", data.calendarId],
          refetchType: "all",
        }),
        context.client.invalidateQueries({
          queryKey: ["calendar-submissions", data.calendarId],
          refetchType: "all",
        }),
      ]);
    },
  });

export const updateCalendarCourseColorMutationOptions = () =>
  mutationOptions({
    mutationFn: (data: UpdateColorInput) => $updateCalendarCourseColor({ data }),
    onSuccess: async (_result, data, _onMutateResult, context) => {
      await context.client.invalidateQueries({
        queryKey: calendarCoursesQueryOptions(data.calendarId, data.semester).queryKey,
      });
    },
  });

export const updateIncludeExamDatesMutationOptions = () =>
  mutationOptions({
    mutationFn: (data: UpdateIncludeExamDatesInput) => $updateIncludeExamDates({ data }),
    onSuccess: async (_result, data, _onMutateResult, context) => {
      await Promise.all([
        context.client.invalidateQueries({
          queryKey: calendarCoursesQueryOptions(data.calendarId, data.semester).queryKey,
          refetchType: "all",
        }),
        context.client.invalidateQueries({
          queryKey: scheduleQueryOptions(data.calendarId, data.semester, true).queryKey,
          refetchType: "all",
        }),
      ]);
    },
  });

export const updateIncludeSubmissionDatesMutationOptions = () =>
  mutationOptions({
    mutationFn: (data: UpdateIncludeSubmissionDatesInput) =>
      $updateIncludeSubmissionDates({ data }),
    onSuccess: async (_result, data, _onMutateResult, context) => {
      await context.client.invalidateQueries({
        queryKey: calendarCoursesQueryOptions(data.calendarId, data.semester).queryKey,
        refetchType: "all",
      });
    },
  });

export const createCourseSubmissionMutationOptions = () =>
  mutationOptions({
    mutationFn: (data: CreateSubmissionInput) => $createCourseSubmission({ data }),
    onSuccess: async (_result, data, _onMutateResult, context) => {
      await context.client.invalidateQueries({
        queryKey: calendarSubmissionsQueryOptions(data.calendarId, data.semester).queryKey,
        refetchType: "all",
      });
    },
  });

export const updateCourseSubmissionMutationOptions = () =>
  mutationOptions({
    mutationFn: (data: UpdateSubmissionInput) => $updateCourseSubmission({ data }),
    onSuccess: async (_result, data, _onMutateResult, context) => {
      await context.client.invalidateQueries({
        queryKey: calendarSubmissionsQueryOptions(data.calendarId, data.semester).queryKey,
        refetchType: "all",
      });
    },
  });

export const deleteCourseSubmissionMutationOptions = () =>
  mutationOptions({
    mutationFn: (data: DeleteSubmissionInput) => $deleteCourseSubmission({ data }),
    onSuccess: async (_result, data, _onMutateResult, context) => {
      await context.client.invalidateQueries({
        queryKey: calendarSubmissionsQueryOptions(data.calendarId, data.semester).queryKey,
        refetchType: "all",
      });
    },
  });

export const updateExcludedSeriesMutationOptions = () =>
  mutationOptions({
    mutationFn: (data: UpdateExcludedSeriesInput) => $updateExcludedSeries({ data }),
    onSuccess: async (_result, data, _onMutateResult, context) => {
      await Promise.all([
        context.client.invalidateQueries({
          queryKey: calendarCoursesQueryOptions(data.calendarId, data.semester).queryKey,
          refetchType: "all",
        }),
        context.client.invalidateQueries({
          queryKey: scheduleQueryOptions(data.calendarId, data.semester, true).queryKey,
          refetchType: "all",
        }),
      ]);
    },
  });

export const removeCalendarCourseMutationOptions = () =>
  mutationOptions({
    mutationFn: (data: CalendarSelection) => $removeCalendarCourse({ data }),
    onSuccess: async (_result, data, _onMutateResult, context) => {
      await Promise.all([
        context.client.invalidateQueries({
          queryKey: calendarCoursesQueryOptions(data.calendarId, data.semester).queryKey,
          refetchType: "all",
        }),
        context.client.invalidateQueries({
          queryKey: scheduleQueryOptions(data.calendarId, data.semester, true).queryKey,
          refetchType: "all",
        }),
        context.client.invalidateQueries({
          queryKey: calendarSubmissionsQueryOptions(data.calendarId, data.semester).queryKey,
          refetchType: "all",
        }),
      ]);
    },
  });

export const addCalendarCourseMutationOptions = () =>
  mutationOptions({
    mutationFn: (data: CalendarSelection) => $addCalendarCourse({ data }),
    onSuccess: async (_result, data, _onMutateResult, context) => {
      await Promise.all([
        context.client.invalidateQueries({
          queryKey: calendarCoursesQueryOptions(data.calendarId, data.semester).queryKey,
          refetchType: "all",
        }),
        context.client.invalidateQueries({
          queryKey: scheduleQueryOptions(data.calendarId, data.semester, true).queryKey,
          refetchType: "all",
        }),
        context.client.invalidateQueries({
          queryKey: calendarSubmissionsQueryOptions(data.calendarId, data.semester).queryKey,
          refetchType: "all",
        }),
      ]);
    },
  });
