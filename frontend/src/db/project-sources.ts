import { and, asc, count, eq, inArray } from "drizzle-orm";
import type { Db } from "./connection";
import {
  projectSource,
  type Source,
  source,
  type VideoStage,
  videoProject,
} from "./schema";

/** Links a library source to a project (a no-op if already linked). */
export function linkSource(
  db: Db,
  projectId: string,
  sourceId: string,
  now = new Date(),
): void {
  db.transaction((tx) => {
    tx.insert(projectSource)
      .values({
        project: projectId,
        source: sourceId,
        linked: now.toISOString(),
      })
      .onConflictDoNothing()
      .run();
    tx.update(videoProject)
      .set({ updated: now.toISOString() })
      .where(eq(videoProject.id, projectId))
      .run();
  });
}

/** Unlinks a source; it stays in the library. */
export function unlinkSource(
  db: Db,
  projectId: string,
  sourceId: string,
  now = new Date(),
): void {
  db.transaction((tx) => {
    tx.delete(projectSource)
      .where(
        and(
          eq(projectSource.project, projectId),
          eq(projectSource.source, sourceId),
        ),
      )
      .run();
    tx.update(videoProject)
      .set({ updated: now.toISOString() })
      .where(eq(videoProject.id, projectId))
      .run();
  });
}

/** A project's sources in the order they were linked. */
export function listProjectSources(db: Db, projectId: string): Source[] {
  return db
    .select({ source })
    .from(projectSource)
    .innerJoin(source, eq(projectSource.source, source.id))
    .where(eq(projectSource.project, projectId))
    .orderBy(asc(projectSource.linked), asc(source.title))
    .all()
    .map((r) => r.source);
}

export type LinkedProject = { id: string; title: string; stage: VideoStage };

/** The projects a source is linked to, by title. */
export function projectsOfSource(db: Db, sourceId: string): LinkedProject[] {
  return db
    .select({
      id: videoProject.id,
      title: videoProject.title,
      stage: videoProject.stage,
    })
    .from(projectSource)
    .innerJoin(videoProject, eq(projectSource.project, videoProject.id))
    .where(eq(projectSource.source, sourceId))
    .orderBy(asc(videoProject.title))
    .all();
}

/** How many projects use each source, keyed by source ID. */
export function projectCountsBySource(
  db: Db,
  sourceIds?: string[],
): Map<string, number> {
  if (sourceIds && sourceIds.length === 0) return new Map();
  return new Map(
    db
      .select({ id: projectSource.source, n: count() })
      .from(projectSource)
      .where(sourceIds ? inArray(projectSource.source, sourceIds) : undefined)
      .groupBy(projectSource.source)
      .all()
      .map((r) => [r.id, r.n]),
  );
}

/** How many sources each project has, keyed by project ID. */
export function sourceCountsByProject(
  db: Db,
  projectIds: string[],
): Map<string, number> {
  if (projectIds.length === 0) return new Map();
  return new Map(
    db
      .select({ id: projectSource.project, n: count() })
      .from(projectSource)
      .where(inArray(projectSource.project, projectIds))
      .groupBy(projectSource.project)
      .all()
      .map((r) => [r.id, r.n]),
  );
}
