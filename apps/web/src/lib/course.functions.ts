import { authMiddleware, freshAuthMiddleware } from "@repo/auth/tanstack/middleware";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import {
  addCalendarCourse,
  createCalendar,
  createCalendarEvent,
  deleteCalendar,
  createCourseEvent,
  createDemoCalendar,
  listAvailableCourses,
  listCalendarCourses,
  listCalendarEvents,
  listCalendars,
  listCalendarSchedule,
  listSubscribedCourseEvents,
  removeCalendarCourse,
  updateExcludedSeries,
  updateGlobalEventsSubscription,
} from "./course-sync.server.ts";

const semesterSchema = z.string().regex(/^\d{2}[vh]$/);
const calendarIdSchema = z.uuid();
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

export const $createDemoCalendar = createServerFn({ method: "POST" })
  .middleware([freshAuthMiddleware])
  .validator(z.object({ semester: semesterSchema }))
  .handler(async ({ data, context }) => {
    const result = await createDemoCalendar(context.user.id, data.semester);
    if (result.isErr()) throw result.error;
    return result.value;
  });

export const $createCalendar = createServerFn({ method: "POST" })
  .middleware([freshAuthMiddleware])
  .validator(z.object({ name: z.string().trim().min(1).max(100) }))
  .handler(async ({ data, context }) => {
    const result = await createCalendar(context.user.id, data.name);
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
  .validator(z.object({ calendarId: calendarIdSchema, semester: semesterSchema }))
  .handler(async ({ data, context }) => {
    const result = await listCalendarSchedule(context.user.id, data.calendarId, data.semester);
    if (result.isErr()) throw result.error;
    return result.value;
  });

const eventSchema = z.object({
  calendarId: calendarIdSchema.optional(),
  semester: semesterSchema,
  courseId: z.string().trim().min(1).max(50),
  term: z.number().int().positive(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  location: z.string().trim().max(200).optional(),
  link: z.url().optional(),
});

export const $createCourseEvent = createServerFn({ method: "POST" })
  .middleware([freshAuthMiddleware])
  .validator(eventSchema.omit({ calendarId: true }))
  .handler(async ({ data, context }) => {
    const result = await createCourseEvent(context.user.id, data);
    if (result.isErr()) throw result.error;
    return result.value;
  });

export const $createCalendarEvent = createServerFn({ method: "POST" })
  .middleware([freshAuthMiddleware])
  .validator(eventSchema)
  .handler(async ({ data, context }) => {
    if (!data.calendarId) throw new Error("Calendar is required");
    const result = await createCalendarEvent(context.user.id, data.calendarId, data);
    if (result.isErr()) throw result.error;
    return result.value;
  });

export const $listCalendarEvents = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(z.object({ calendarId: calendarIdSchema, semester: semesterSchema }))
  .handler(async ({ data, context }) => {
    const [personal, shared] = await Promise.all([
      listCalendarEvents(context.user.id, data.calendarId, data.semester),
      listSubscribedCourseEvents(context.user.id, data.calendarId, data.semester),
    ]);
    if (personal.isErr()) throw personal.error;
    if (shared.isErr()) throw shared.error;
    return [...personal.value, ...shared.value];
  });

export const $updateGlobalEventsSubscription = createServerFn({ method: "POST" })
  .middleware([freshAuthMiddleware])
  .validator(selectionSchema.extend({ subscribed: z.boolean() }))
  .handler(async ({ data, context }) => {
    const result = await updateGlobalEventsSubscription(
      context.user.id,
      data.calendarId,
      data,
      data.subscribed,
    );
    if (result.isErr()) throw result.error;
    return result.value.length > 0;
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
