import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
    excludedSourceIds: text("excluded_source_ids", { mode: "json" })
      .$type<string[]>()
      .default([])
      .notNull(),
    globalEventsSubscribed: integer("global_events_subscribed", { mode: "boolean" })
      .default(false)
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

export const courseEvent = sqliteTable(
  "course_event",
  {
    id: text("id").primaryKey(),
    semester: text("semester").notNull(),
    courseId: text("course_id").notNull(),
    term: integer("term").notNull(),
    creatorId: text("creator_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    startsAt: integer("starts_at", { mode: "timestamp_ms" }).notNull(),
    endsAt: integer("ends_at", { mode: "timestamp_ms" }).notNull(),
    location: text("location"),
    link: text("link"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).default(now).notNull(),
  },
  (table) => [index("course_event_course_idx").on(table.semester, table.courseId, table.term)],
);

export const calendarEvent = sqliteTable(
  "calendar_event",
  {
    id: text("id").primaryKey(),
    calendarId: text("calendar_id")
      .notNull()
      .references(() => calendar.id, { onDelete: "cascade" }),
    semester: text("semester").notNull(),
    courseId: text("course_id"),
    term: integer("term"),
    title: text("title").notNull(),
    description: text("description"),
    startsAt: integer("starts_at", { mode: "timestamp_ms" }).notNull(),
    endsAt: integer("ends_at", { mode: "timestamp_ms" }).notNull(),
    location: text("location"),
    link: text("link"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).default(now).notNull(),
  },
  (table) => [index("calendar_event_calendar_idx").on(table.calendarId, table.semester)],
);

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
