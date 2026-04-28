CREATE TABLE `message` (
	`id` text PRIMARY KEY,
	`session_id` text NOT NULL,
	`data` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `fk_message_session_id_session_id_fk` FOREIGN KEY (`session_id`) REFERENCES `session`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `part` (
	`id` text PRIMARY KEY,
	`session_id` text NOT NULL,
	`message_id` text NOT NULL,
	`data` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `fk_part_message_id_message_id_fk` FOREIGN KEY (`message_id`) REFERENCES `message`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY,
	`title` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `message_session_idx` ON `message` (`session_id`);--> statement-breakpoint
CREATE INDEX `part_message_idx` ON `part` (`message_id`);--> statement-breakpoint
CREATE INDEX `part_session_idx` ON `part` (`session_id`);