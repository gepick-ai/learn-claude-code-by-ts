CREATE TABLE `project` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `session` ADD `project_id` text NOT NULL REFERENCES project(id);