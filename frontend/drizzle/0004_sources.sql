CREATE TABLE `source` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`author` text,
	`link` text,
	`publisher` text,
	`date` text,
	`note` text,
	`created` text NOT NULL,
	`updated` text NOT NULL
);
