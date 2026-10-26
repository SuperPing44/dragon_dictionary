CREATE TABLE `source_file` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`original_name` text NOT NULL,
	`size` integer NOT NULL,
	`uploaded` text NOT NULL,
	FOREIGN KEY (`source`) REFERENCES `source`(`id`) ON UPDATE no action ON DELETE cascade
);
