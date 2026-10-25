import { and, asc, eq, gte, isNull, sql } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { canonicalInsertIndex, countWords, parseDoc } from "@/lib/script";
import type { Db } from "./connection";
import { EMPTY_DOC } from "./projects";
import {
  SECTION_KINDS,
  type Section,
  type SectionKind,
  section,
  videoProject,
} from "./schema";

function touchProject(db: Pick<Db, "update">, projectId: string, now: Date) {
  db.update(videoProject)
    .set({ updated: now.toISOString() })
    .where(eq(videoProject.id, projectId))
    .run();
}

/**
 * Saves a section's Tiptap JSON together with its word count (stage
 * directions excluded). Returns the stored word count.
 */
export function saveSectionContent(
  db: Db,
  sectionId: string,
  content: string,
  now = new Date(),
): number | undefined {
  const doc = parseDoc(content);
  if (doc.type !== "doc")
    throw new Error("Section content must be a document.");
  const wordCount = countWords(doc);
  const saved = db
    .update(section)
    .set({ content: JSON.stringify(doc), wordCount })
    .where(eq(section.id, sectionId))
    .returning({ project: section.videoProject })
    .get();
  if (!saved) return undefined;
  touchProject(db, saved.project, now);
  return wordCount;
}

/**
 * Adds a missing top-level section at its canonical position: after the
 * nearest preceding canonical kind that exists, otherwise at the top.
 */
export function addSection(
  db: Db,
  projectId: string,
  kind: SectionKind,
  now = new Date(),
): Section {
  if (!SECTION_KINDS.includes(kind)) throw new Error(`Unknown kind: ${kind}`);
  return db.transaction((tx) => {
    const tops = tx
      .select({ kind: section.kind, position: section.position })
      .from(section)
      .where(and(eq(section.videoProject, projectId), isNull(section.parent)))
      .orderBy(asc(section.position))
      .all();
    const kinds = tops.map((t) => t.kind as SectionKind);
    if (kinds.includes(kind)) {
      throw new Error(`This script already has a ${kind} section.`);
    }
    const index = canonicalInsertIndex(kinds, kind);
    // Positions can have gaps, so appending goes after the last one.
    const position =
      index < tops.length
        ? tops[index].position
        : (tops.at(-1)?.position ?? -1) + 1;
    tx.update(section)
      .set({ position: sql`${section.position} + 1` })
      .where(
        and(
          eq(section.videoProject, projectId),
          isNull(section.parent),
          gte(section.position, position),
        ),
      )
      .run();
    const added = tx
      .insert(section)
      .values({
        id: uuidv7(),
        videoProject: projectId,
        kind,
        position,
        content: EMPTY_DOC,
      })
      .returning()
      .get();
    touchProject(tx, projectId, now);
    return added;
  });
}

/** Removes a section; the Main part takes its subsections with it. */
export function removeSection(db: Db, sectionId: string, now = new Date()) {
  const removed = db
    .delete(section)
    .where(eq(section.id, sectionId))
    .returning({ project: section.videoProject })
    .get();
  if (removed) touchProject(db, removed.project, now);
}
