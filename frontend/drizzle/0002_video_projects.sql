CREATE TABLE `project_category` (
	`project` text NOT NULL,
	`category` text NOT NULL,
	PRIMARY KEY(`project`, `category`),
	FOREIGN KEY (`project`) REFERENCES `video_project`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category`) REFERENCES `category`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `section` (
	`id` text PRIMARY KEY NOT NULL,
	`video_project` text NOT NULL,
	`kind` text,
	`parent` text,
	`title` text,
	`position` integer NOT NULL,
	`content` text NOT NULL,
	`word_count` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`video_project`) REFERENCES `video_project`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent`) REFERENCES `section`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `section_project` ON `section` (`video_project`);--> statement-breakpoint
CREATE TABLE `video_project` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`stage` text NOT NULL,
	`original_note` text,
	`original_rating` integer,
	`created` text NOT NULL,
	`updated` text NOT NULL
);
