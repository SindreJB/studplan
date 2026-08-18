CREATE TABLE `calendar_event` (
	`id` text PRIMARY KEY,
	`calendar_id` text NOT NULL,
	`semester` text NOT NULL,
	`course_id` text,
	`term` integer,
	`title` text NOT NULL,
	`description` text,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`location` text,
	`link` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `fk_calendar_event_calendar_id_calendar_id_fk` FOREIGN KEY (`calendar_id`) REFERENCES `calendar`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `course_event` (
	`id` text PRIMARY KEY,
	`semester` text NOT NULL,
	`course_id` text NOT NULL,
	`term` integer NOT NULL,
	`creator_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`location` text,
	`link` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `fk_course_event_creator_id_user_id_fk` FOREIGN KEY (`creator_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
ALTER TABLE `calendar_course` ADD `global_events_subscribed` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `calendar_event_calendar_idx` ON `calendar_event` (`calendar_id`,`semester`);--> statement-breakpoint
CREATE INDEX `course_event_course_idx` ON `course_event` (`semester`,`course_id`,`term`);