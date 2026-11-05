import { and, asc, eq, ne, sql } from "drizzle-orm";
import type { TagUsage } from "@/lib/tags";
import type { Db } from "./connection";
import { projectTag, videoProject } from "./schema";

function touch(db: Pick<Db, "update">, projectId: string, now: Date) {
  db.update(videoProject)
    .set({ updated: now.toISOString() })
    .where(eq(videoProject.id, projectId))
    .run();
}

/** A project's tags as typed, in entry order. */
export function listProjectTags(db: Db, projectId: string): string[] {
  return db
    .select({ text: projectTag.text })
    .from(projectTag)
    .where(eq(projectTag.videoProject, projectId))
    .orderBy(asc(projectTag.position))
    .all()
    .map((t) => t.text);
}

/**
 * Adds a tag at the end, kept as typed (trimmed). Blank text and a tag the
 * project already has (ignoring case) are ignored. Returns whether it was added.
 */
export function addProjectTag(
  db: Db,
  projectId: string,
  text: string,
  now = new Date(),
): boolean {
  const clean = text.trim();
  if (!clean) return false;
  return db.transaction((tx) => {
    const last = tx
      .select({ n: sql<number | null>`max(${projectTag.position})` })
      .from(projectTag)
      .where(eq(projectTag.videoProject, projectId))
      .get();
    const { changes } = tx
      .insert(projectTag)
      .values({
        videoProject: projectId,
        text: clean,
        position: (last?.n ?? -1) + 1,
      })
      .onConflictDoNothing()
      .run();
    if (changes > 0) touch(tx, projectId, now);
    return changes > 0;
  });
}

/** Removes a tag, matched ignoring case. */
export function removeProjectTag(
  db: Db,
  projectId: string,
  text: string,
  now = new Date(),
): void {
  db.transaction((tx) => {
    tx.delete(projectTag)
      .where(
        and(
          eq(projectTag.videoProject, projectId),
          sql`lower(${projectTag.text}) = lower(${text.trim()})`,
        ),
      )
      .run();
    touch(tx, projectId, now);
  });
}

/**
 * The distinct tags (ignoring case) used on projects other than this one,
 * with how many projects use each. There's no shared tag table: this is
 * read from the projects' own tags.
 */
export function tagUsage(db: Db, exceptProjectId: string): TagUsage[] {
  return db
    .select({
      text: sql<string>`min(${projectTag.text})`,
      projects: sql<number>`count(distinct ${projectTag.videoProject})`,
    })
    .from(projectTag)
    .where(ne(projectTag.videoProject, exceptProjectId))
    .groupBy(sql`lower(${projectTag.text})`)
    .all();
}
