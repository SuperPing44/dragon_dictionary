ALTER TABLE `video_project` ADD `board_position` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- Number each stage's column by `updated`, newest on top (spec §3).
UPDATE `video_project` SET `board_position` = (
	SELECT `n` FROM (
		SELECT `id`, ROW_NUMBER() OVER (
			PARTITION BY `stage` ORDER BY `updated` DESC, `created` DESC, `id`
		) - 1 AS `n`
		FROM `video_project`
	) AS `ranked`
	WHERE `ranked`.`id` = `video_project`.`id`
);
