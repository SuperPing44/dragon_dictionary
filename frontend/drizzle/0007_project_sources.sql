CREATE TABLE `project_source` (
	`project` text NOT NULL,
	`source` text NOT NULL,
	`linked` text NOT NULL,
	PRIMARY KEY(`project`, `source`),
	FOREIGN KEY (`project`) REFERENCES `video_project`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source`) REFERENCES `source`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_source_by_source` ON `project_source` (`source`);