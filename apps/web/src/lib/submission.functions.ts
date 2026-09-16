import { authMiddleware, freshAuthMiddleware } from "@repo/auth/tanstack/middleware";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  createCourseSubmission,
  deleteCourseSubmission,
  listCalendarSubmissions,
  updateCourseSubmission,
} from "./submission.server";

const semesterSchema = z.string().regex(/^\d{2}[vh]$/);
const calendarIdSchema = z.union([
  z.uuid(),
  z.string().regex(/^[A-Za-z0-9_-]{10}$/, "Invalid calendar ID"),
]);
const submissionIdSchema = z.string().regex(/^[A-Za-z0-9_-]{12}$/, "Invalid submission ID");
const submissionInputSchema = z.object({
  title: z.string().trim().min(1).max(120),
  dueAt: z.number().int().positive(),
  description: z.string().trim().max(500).nullable().default(null),
  link: z.url().max(500).nullable().default(null),
});

export const $listCalendarSubmissions = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(z.object({ calendarId: calendarIdSchema, semester: semesterSchema }))
  .handler(async ({ data, context }) => {
    const result = await listCalendarSubmissions(context.user.id, data.calendarId, data.semester);
    if (result.isErr()) throw result.error;
    return result.value;
  });

export const $createCourseSubmission = createServerFn({ method: "POST" })
  .middleware([freshAuthMiddleware])
  .validator(
    submissionInputSchema.extend({
      calendarId: calendarIdSchema,
      semester: semesterSchema,
      courseId: z.string().trim().min(1).max(50),
      term: z.number().int().positive(),
    }),
  )
  .handler(async ({ data, context }) => {
    const result = await createCourseSubmission(
      context.user.id,
      data.calendarId,
      { semester: data.semester, courseId: data.courseId, term: data.term },
      data,
    );
    if (result.isErr()) throw result.error;
    return result.value;
  });

export const $updateCourseSubmission = createServerFn({ method: "POST" })
  .middleware([freshAuthMiddleware])
  .validator(
    submissionInputSchema.extend({
      calendarId: calendarIdSchema,
      semester: semesterSchema,
      submissionId: submissionIdSchema,
    }),
  )
  .handler(async ({ data, context }) => {
    const result = await updateCourseSubmission(
      context.user.id,
      data.calendarId,
      data.submissionId,
      data,
    );
    if (result.isErr()) throw result.error;
    return result.value;
  });

export const $deleteCourseSubmission = createServerFn({ method: "POST" })
  .middleware([freshAuthMiddleware])
  .validator(
    z.object({
      calendarId: calendarIdSchema,
      semester: semesterSchema,
      submissionId: submissionIdSchema,
    }),
  )
  .handler(async ({ data, context }) => {
    const result = await deleteCourseSubmission(
      context.user.id,
      data.calendarId,
      data.submissionId,
    );
    if (result.isErr()) throw result.error;
    return result.value;
  });
