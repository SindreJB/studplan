import { authMiddleware, freshAuthMiddleware } from "@repo/auth/tanstack/middleware";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import {
  addCalendarCourse,
  createCalendar,
  deleteCalendar,
  listAvailableCourses,
  listCalendarCourses,
  listCalendars,
  listCalendarSchedule,
  removeCalendarCourse,
  updateCalendarCourseColor,
  updateCalendarSemester,
  updateExcludedSeries,
} from "./course-sync.server";

const semesterSchema = z.string().regex(/^\d{2}[vh]$/);
const calendarIdSchema = z.union([
  z.uuid(),
  z.string().regex(/^[A-Za-z0-9_-]{10}$/, "Invalid calendar ID"),
]);
const selectionSchema = z.object({
  calendarId: calendarIdSchema,
  semester: semesterSchema,
  id: z.string().trim().min(1).max(50),
  term: z.number().int().positive(),
});

export const $getPublicOrigin = createServerFn({ method: "GET" }).handler(
  () => new URL(getRequest().url).origin,
);

export const $listAvailableCourses = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(z.object({ semester: semesterSchema }))
  .handler(async ({ data }) => {
    const result = await listAvailableCourses(data.semester);
    if (result.isErr()) throw result.error;
    return result.value;
  });

export const $listCalendars = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const result = await listCalendars(context.user.id);
    if (result.isErr()) throw result.error;
    return result.value;
  });

export const $listCalendarCourses = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(z.object({ calendarId: calendarIdSchema, semester: semesterSchema }))
  .handler(async ({ data, context }) => {
    const result = await listCalendarCourses(context.user.id, data.calendarId, data.semester);
    if (result.isErr()) throw result.error;
    return result.value;
  });

export const $createCalendar = createServerFn({ method: "POST" })
  .middleware([freshAuthMiddleware])
  .validator(z.object({ name: z.string().trim().min(1).max(100), semester: semesterSchema }))
  .handler(async ({ data, context }) => {
    const result = await createCalendar(context.user.id, data.name, data.semester);
    if (result.isErr()) throw result.error;
    return result.value;
  });

export const $updateCalendarSemester = createServerFn({ method: "POST" })
  .middleware([freshAuthMiddleware])
  .validator(z.object({ calendarId: calendarIdSchema, semester: semesterSchema }))
  .handler(async ({ data, context }) => {
    const result = await updateCalendarSemester(context.user.id, data.calendarId, data.semester);
    if (result.isErr()) throw result.error;
    return result.value;
  });

export const $deleteCalendar = createServerFn({ method: "POST" })
  .middleware([freshAuthMiddleware])
  .validator(z.object({ calendarId: calendarIdSchema }))
  .handler(async ({ data, context }) => {
    const result = await deleteCalendar(context.user.id, data.calendarId);
    if (result.isErr()) throw result.error;
    return result.value;
  });

export const $getMySchedule = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      calendarId: calendarIdSchema,
      semester: semesterSchema,
      includeExcluded: z.boolean().default(false),
    }),
  )
  .handler(async ({ data, context }) => {
    const result = await listCalendarSchedule(
      context.user.id,
      data.calendarId,
      data.semester,
      data.includeExcluded,
    );
    if (result.isErr()) throw result.error;
    return result.value;
  });

export const $updateCalendarCourseColor = createServerFn({ method: "POST" })
  .middleware([freshAuthMiddleware])
  .validator(selectionSchema.extend({ color: z.string().regex(/^#[0-9a-f]{6}$/i) }))
  .handler(async ({ data, context }) => {
    const result = await updateCalendarCourseColor(
      context.user.id,
      data.calendarId,
      data,
      data.color,
    );
    if (result.isErr()) throw result.error;
    return result.value;
  });

export const $updateExcludedSeries = createServerFn({ method: "POST" })
  .middleware([freshAuthMiddleware])
  .validator(selectionSchema.extend({ excludedSourceIds: z.array(z.string()) }))
  .handler(async ({ data, context }) => {
    const result = await updateExcludedSeries(
      context.user.id,
      data.calendarId,
      data,
      data.excludedSourceIds,
    );
    if (result.isErr()) throw result.error;
    return result.value;
  });

export const $removeCalendarCourse = createServerFn({ method: "POST" })
  .middleware([freshAuthMiddleware])
  .validator(selectionSchema)
  .handler(async ({ data, context }) => {
    const result = await removeCalendarCourse(context.user.id, data.calendarId, data);
    if (result.isErr()) throw result.error;
    return result.value;
  });

export const $addCalendarCourse = createServerFn({ method: "POST" })
  .middleware([freshAuthMiddleware])
  .validator(selectionSchema)
  .handler(async ({ data, context }) => {
    const result = await addCalendarCourse(context.user.id, data.calendarId, data);
    if (result.isErr()) throw result.error;
    return result.value;
  });
