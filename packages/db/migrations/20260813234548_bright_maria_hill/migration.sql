CREATE TABLE `calendar` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `fk_calendar_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `calendar_course` (
	`calendar_id` text NOT NULL,
	`semester` text NOT NULL,
	`course_id` text NOT NULL,
	`term` integer NOT NULL,
	`excluded_source_ids` text DEFAULT '[]' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `calendar_course_pk` PRIMARY KEY(`calendar_id`, `semester`, `course_id`, `term`),
	CONSTRAINT `fk_calendar_course_calendar_id_calendar_id_fk` FOREIGN KEY (`calendar_id`) REFERENCES `calendar`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `course_catalog` (
	`semester` text PRIMARY KEY,
	`courses` text NOT NULL,
	`synced_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `course_schedule` (
	`semester` text NOT NULL,
	`course_id` text NOT NULL,
	`term` integer NOT NULL,
	`events` text NOT NULL,
	`synced_at` integer NOT NULL,
	CONSTRAINT `course_schedule_pk` PRIMARY KEY(`semester`, `course_id`, `term`)
);
--> statement-breakpoint
CREATE INDEX `calendar_user_idx` ON `calendar` (`user_id`);--> statement-breakpoint
CREATE INDEX `calendar_course_selection_idx` ON `calendar_course` (`semester`,`course_id`,`term`);