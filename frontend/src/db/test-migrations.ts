import type { Db } from "./connection";

/**
 * Test helper: rolls back the newest migration (0008, the 0.3.0 project
 * fields) so the next migrate applies it again, as on an older database.
 */
export function undoNewestMigration(db: Db): void {
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
