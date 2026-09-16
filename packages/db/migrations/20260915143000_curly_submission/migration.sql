CREATE TABLE `course_submission` (
	`id` text PRIMARY KEY,
	`semester` text NOT NULL,
	`course_id` text NOT NULL,
	`term` integer NOT NULL,
	`title` text NOT NULL,
	`due_at` integer NOT NULL,
	`description` text,
	`link` text,
	`created_by` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `fk_course_submission_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
ALTER TABLE `calendar_course` ADD `include_submission_dates` integer DEFAULT true NOT NULL;--> statement-breakpoint
CREATE INDEX `course_submission_course_idx` ON `course_submission` (`semester`,`course_id`,`term`);--> statement-breakpoint
CREATE UNIQUE INDEX `course_submission_title_uidx` ON `course_submission` (`semester`,`course_id`,`term`,`title`);
