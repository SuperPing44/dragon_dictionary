CREATE TABLE `broll_item` (
	`id` text PRIMARY KEY NOT NULL,
	`video_project` text NOT NULL,
	`text` text NOT NULL,
	`found` integer DEFAULT false NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`video_project`) REFERENCES `video_project`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `broll_item_project` ON `broll_item` (`video_project`);--> statement-breakpoint
CREATE TABLE `project_tag` (
	`video_project` text NOT NULL,
	`text` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`video_project`) REFERENCES `video_project`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_tag_unique` ON `project_tag` (`video_project`,lower("text"));--> statement-breakpoint
CREATE TABLE `thumbnail_draft` (
	`id` text PRIMARY KEY NOT NULL,
	`video_project` text NOT NULL,
	`original_name` text NOT NULL,
	`ext` text NOT NULL,
	`size` integer NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`note` text,
	`uploaded` text NOT NULL,
	FOREIGN KEY (`video_project`) REFERENCES `video_project`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `thumbnail_draft_project` ON `thumbnail_draft` (`video_project`);--> statement-breakpoint
CREATE TABLE `title_option` (
	`id` text PRIMARY KEY NOT NULL,
	`video_project` text NOT NULL,
	`text` text NOT NULL,
	`position` integer NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`video_project`) REFERENCES `video_project`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `title_option_project` ON `title_option` (`video_project`);--> statement-breakpoint
ALTER TABLE `video_project` ADD `description` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `video_project` ADD `editing_note` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `video_project` ADD `final_thumbnail` text REFERENCES thumbnail_draft(id) ON DELETE set null;--> statement-breakpoint
-- Every existing project starts with one title option, its title, so it's final.
INSERT INTO `title_option` (`id`, `video_project`, `text`, `position`, `created`)
SELECT
	lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(6))),
	`id`, `title`, 0, `created`
FROM `video_project`;