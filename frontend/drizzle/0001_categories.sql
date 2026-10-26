CREATE TABLE `category` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`colour` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `category_name_unique` ON `category` (lower("name"));--> statement-breakpoint
CREATE TABLE `idea_category` (
	`idea` text NOT NULL,
	`category` text NOT NULL,
	PRIMARY KEY(`idea`, `category`),
	FOREIGN KEY (`idea`) REFERENCES `idea`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category`) REFERENCES `category`(`id`) ON UPDATE no action ON DELETE cascade
);
