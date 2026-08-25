import { Result, TaggedError } from "better-result";
import { z } from "zod";

const TP_URL = "https://tp.educloud.no/ntnu/";
const headers = {
  Accept: "application/json",
  Origin: "https://tp.educloud.no",
  Referer: `${TP_URL}app/schedule`,
};

export class TpApiError extends TaggedError("TpApiError")<{
  kind: "input" | "network" | "http" | "json" | "validation";
  message: string;
  url: string;
  httpStatus?: number;
  cause?: unknown;
}> {}

const localizedNameSchema = {
  name: z.string().nullable(),
  nameNb: z.string().nullable(),
  nameEn: z.string().nullable(),
  nameNn: z.string().nullable(),
};

const courseSchema = z.object({
  id: z.string(),
  semesterid: z.string(),
  campusid: z.string().nullable(),
  department: z.string().nullable(),
  institute: z.string().nullable(),
  faculty: z.string().nullable(),
  term: z.array(z.object({ term: z.number().int() })),
  ...localizedNameSchema,
});

const roomSchema = z.object({
  id: z.string(),
  roomid: z.string(),
  roomname: z.string(),
  roomurl: z.string(),
  campusid: z.string(),
  buildingid: z.string(),
  buildingname: z.string(),
  buildingacronym: z.string(),
});

const staffSchema = z.object({
  id: z.string(),
  firstname: z.string(),
  lastname: z.string(),
  shortname: z.string(),
  url: z.string(),
});

const dateTimeSchema = z
  .string()
  .transform((value) => Date.parse(value.replace(/([+-]\d{2})$/, "$1:00")))
  .pipe(z.number());

const eventSchema = z.object({
  id: z.string(),
  eventid: z.string(),
  semesterid: z.string(),
  courseid: z.string(),
  terminnr: z.number().int(),
  weeknr: z.number().int(),
  dtstart: dateTimeSchema,
  dtend: dateTimeSchema,
  summary: z.string().nullable(),
  compulsory: z.boolean(),
  campusid: z.string().nullable(),
  teachingMethod: z.string().nullish(),
  teachingMethodName: z.string().nullish(),
  teachingTitle: z.string().nullish(),
  staffs: z.array(staffSchema).default([]),
  room: z
    .array(roomSchema)
    .nullish()
    .transform((rooms) => rooms ?? []),
});

const scheduleSchema = z.object({ events: z.array(eventSchema) });

export type Schedule = z.infer<typeof scheduleSchema>;
export type CourseSelection = { id: string; term: number };

const getJson = async <Schema extends z.ZodType>(
  path: string,
  schema: Schema,
  search?: URLSearchParams,
  signal?: AbortSignal,
) => {
  const url = new URL(path, TP_URL);
  if (search) url.search = search.toString();

  const responseResult = await Result.tryPromise({
    try: () => fetch(url, { headers, signal }),
    catch: (cause) =>
      new TpApiError({
        kind: "network",
        message: "Could not reach TP",
        url: url.href,
        cause,
      }),
  });

  if (responseResult.isErr()) return Result.err(responseResult.error);

  const response = responseResult.value;
  if (!response.ok) {
    return Result.err(
      new TpApiError({
        kind: "http",
        message: `TP returned HTTP ${response.status}`,
        url: url.href,
        httpStatus: response.status,
      }),
    );
  }

  const jsonResult = await Result.tryPromise({
    try: () => response.json(),
    catch: (cause) =>
      new TpApiError({
        kind: "json",
        message: "TP returned invalid JSON",
        url: url.href,
        cause,
      }),
  });

  if (jsonResult.isErr()) return Result.err(jsonResult.error);

  const parsed = schema.safeParse(jsonResult.value);
  return parsed.success
    ? Result.ok(parsed.data)
    : Result.err(
        new TpApiError({
          kind: "validation",
          message: "TP returned an unexpected response",
          url: url.href,
          cause: parsed.error,
        }),
      );
};

export const getCourses = (semester: string, signal?: AbortSignal) =>
  getJson(
    "ws/timeplan/info.php",
    z.array(courseSchema),
    new URLSearchParams({ type: "course", sem: semester }),
    signal,
  );

export const getCourseSchedule = async (
  semester: string,
  courses: readonly CourseSelection[],
  signal?: AbortSignal,
) => {
  const path = "ws/timeplan/";
  if (courses.length === 0) {
    return Result.err(
      new TpApiError({
        kind: "input",
        message: "At least one course is required",
        url: new URL(path, TP_URL).href,
      }),
    );
  }

  const search = new URLSearchParams({ type: "course", sem: semester });
  for (const course of courses) search.append("id[]", `${course.id}¤${course.term}`);
  return getJson(path, scheduleSchema, search, signal);
};
