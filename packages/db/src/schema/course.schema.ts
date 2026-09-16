import { defineRelationsPart, sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { user } from "./auth.schema";

const now = sql`(cast(unixepoch('subsecond') * 1000 as integer))`;

export interface CourseCatalogItem {
  id: string;
  term: number;
  name: string | null;
  nameNb: string | null;
  nameEn: string | null;
  nameNn: string | null;
  campusId: string | null;
}

export const courseCatalog = sqliteTable("course_catalog", {
  semester: text("semester").primaryKey(),
  courses: text("courses", { mode: "json" }).$type<CourseCatalogItem[]>().notNull(),
  syncedAt: integer("synced_at", { mode: "timestamp_ms" }).notNull(),
});

export const calendar = sqliteTable(
  "calendar",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    semester: text("semester").default("26h").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).default(now).notNull(),
  },
  (table) => [index("calendar_user_idx").on(table.userId)],
);

export const calendarCourse = sqliteTable(
  "calendar_course",
  {
    calendarId: text("calendar_id")
      .notNull()
      .references(() => calendar.id, { onDelete: "cascade" }),
    semester: text("semester").notNull(),
    courseId: text("course_id").notNull(),
    term: integer("term").notNull(),
    color: text("color").default("#6366f1").notNull(),
    includeExamDates: integer("include_exam_dates", { mode: "boolean" }).default(true).notNull(),
    includeSubmissionDates: integer("include_submission_dates", { mode: "boolean" })
      .default(true)
      .notNull(),
    excludedSourceIds: text("excluded_source_ids", { mode: "json" })
      .$type<string[]>()
      .default([])
      .notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).default(now).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.calendarId, table.semester, table.courseId, table.term] }),
    index("calendar_course_selection_idx").on(table.semester, table.courseId, table.term),
  ],
);

export interface CourseScheduleEvent {
  eventId: string;
  sourceId: string;
  week: number;
  startsAt: number;
  endsAt: number;
  summary: string | null;
  compulsory: boolean;
  campusId: string | null;
  teachingMethod?: string | null;
  teachingMethodName?: string | null;
  teachingTitle?: string | null;
  kind?: "teaching" | "exam";
  link?: string;
  staffs: ReadonlyArray<{
    id: string;
    firstname: string;
    lastname: string;
    shortname: string;
    url: string;
  }>;
  rooms: ReadonlyArray<{
    id: string;
    roomId: string;
    roomName: string;
    roomUrl: string;
    campusId: string;
    buildingId: string;
    buildingName: string;
    buildingAcronym: string;
  }>;
}

export const courseSchedule = sqliteTable(
  "course_schedule",
  {
    semester: text("semester").notNull(),
    courseId: text("course_id").notNull(),
    term: integer("term").notNull(),
    events: text("events", { mode: "json" }).$type<CourseScheduleEvent[]>().notNull(),
    syncedAt: integer("synced_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.semester, table.courseId, table.term] })],
);

/**
 * Submission deadlines are shared course data, not per-user data: every calendar
 * tracking the course sees the same deadlines. Today any signed-in user may add
 * or remove them. Once admin roles exist, writes move behind an admin check and
 * everyone else files change proposals instead.
 */
export const courseSubmission = sqliteTable(
  "course_submission",
  {
    id: text("id").primaryKey(),
    semester: text("semester").notNull(),
    courseId: text("course_id").notNull(),
    term: integer("term").notNull(),
    title: text("title").notNull(),
    dueAt: integer("due_at").notNull(),
    description: text("description"),
    link: text("link"),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).default(now).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).default(now).notNull(),
  },
  (table) => [
    index("course_submission_course_idx").on(table.semester, table.courseId, table.term),
    uniqueIndex("course_submission_title_uidx").on(
      table.semester,
      table.courseId,
      table.term,
      table.title,
    ),
  ],
);

export const courseRelations = defineRelationsPart(
  { user, calendar, calendarCourse, courseCatalog, courseSchedule },
  (r) => ({
    calendar: {
      user: r.one.user({ from: r.calendar.userId, to: r.user.id }),
      courses: r.many.calendarCourse({
        from: r.calendar.id,
        to: r.calendarCourse.calendarId,
      }),
    },
    calendarCourse: {
      calendar: r.one.calendar({
        from: r.calendarCourse.calendarId,
        to: r.calendar.id,
      }),
      catalog: r.one.courseCatalog({
        from: r.calendarCourse.semester,
        to: r.courseCatalog.semester,
      }),
      schedule: r.one.courseSchedule({
        from: [r.calendarCourse.semester, r.calendarCourse.courseId, r.calendarCourse.term],
        to: [r.courseSchedule.semester, r.courseSchedule.courseId, r.courseSchedule.term],
      }),
    },
  }),
);
