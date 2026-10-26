CREATE TABLE `quote` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`text` text NOT NULL,
	`location` text,
	`created` text NOT NULL,
	FOREIGN KEY (`source`) REFERENCES `source`(`id`) ON UPDATE no action ON DELETE cascade
);
