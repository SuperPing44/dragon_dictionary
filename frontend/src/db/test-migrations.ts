import type { Db } from "./connection";

const forgetNewest = `
  delete from __drizzle_migrations
    where created_at = (select max(created_at) from __drizzle_migrations);
`;

/**
 * Test helper: rolls back the newest migration (0010, the 0.5.0 archive
 * fields) so the next migrate applies it again, as on an older database.
 */
export function undoNewestMigration(db: Db): void {
  db.$client.exec(`
    alter table video_project drop column youtube_link;
    alter table video_project drop column published_on;
    ${forgetNewest}
  `);
}

/** Test helper: rolls back 0010 and 0009 (the 0.4.0 board position). */
export function undoBoardMigration(db: Db): void {
  undoNewestMigration(db);
  db.$client.exec(`
    alter table video_project drop column board_position;
    ${forgetNewest}
  `);
}

/**
 * Test helper: rolls back 0010 to 0008 (the 0.3.0 project fields), as on
 * a database from before 0.3.0.
 */
export function undoProjectFieldsMigration(db: Db): void {
  undoBoardMigration(db);
  db.$client.exec(`
    alter table video_project drop column final_thumbnail;
    alter table video_project drop column editing_note;
    alter table video_project drop column description;
    drop table title_option;
    drop table project_tag;
    drop table thumbnail_draft;
    drop table broll_item;
    delete from __drizzle_migrations
      where created_at = (select max(created_at) from __drizzle_migrations);
  `);
}
