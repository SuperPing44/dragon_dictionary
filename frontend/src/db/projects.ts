import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import type { Db } from "./connection";
import {
  type Category,
  category,
  idea,
  ideaCategory,
  projectCategory,
  SECTION_KINDS,
  type Section,
  section,
  VIDEO_STAGES,
  type VideoProject,
  type VideoStage,
  videoProject,
} from "./schema";

/** An empty Tiptap document, the content of a new section. */
export const EMPTY_DOC = JSON.stringify({
  type: "doc",
  content: [{ type: "paragraph" }],
});

export type VideoProjectWithCategories = VideoProject & {
  categories: Category[];
  /** All sections' words, for the speaking-time estimate. */
  wordCount: number;
};

/** Total words per project, keyed by project ID. */
function wordsByProject(db: Db, projectIds: string[]): Map<string, number> {
  if (projectIds.length === 0) return new Map();
  return new Map(
    db
      .select({
        project: section.videoProject,
        words: sql<number>`coalesce(sum(${section.wordCount}), 0)`,
      })
      .from(section)
      .where(inArray(section.videoProject, projectIds))
      .groupBy(section.videoProject)
      .all()
      .map((r) => [r.project, r.words]),
  );
}

/**
 * Turns an idea into a video project in one transaction: the project starts
 * in Research with the idea's title, keeps its note and rating as the
 * original idea, gets its categories and the six empty template sections,
 * and the idea is deleted. Returns undefined if the idea doesn't exist.
 */
export function makeVideoProject(
  db: Db,
  ideaId: string,
  now = new Date(),
): VideoProject | undefined {
  return db.transaction((tx) => {
    const source = tx.select().from(idea).where(eq(idea.id, ideaId)).get();
    if (!source) return undefined;
    const stamp = now.toISOString();
    const project = tx
      .insert(videoProject)
      .values({
        id: uuidv7(),
        title: source.title,
        stage: "research",
        originalNote: source.note,
        originalRating: source.rating,
        created: stamp,
        updated: stamp,
      })
      .returning()
      .get();
    tx.run(sql`
      insert into ${projectCategory} (project, category)
      select ${project.id}, category from ${ideaCategory} where idea = ${ideaId}
    `);
    tx.insert(section)
      .values(
        SECTION_KINDS.map((kind, position) => ({
          id: uuidv7(),
          videoProject: project.id,
          kind,
          position,
          content: EMPTY_DOC,
        })),
      )
      .run();
    tx.delete(idea).where(eq(idea.id, ideaId)).run();
    return project;
  });
}

function categoriesByProject(
  db: Db,
  projectIds: string[],
): Map<string, Category[]> {
  const result = new Map<string, Category[]>();
  if (projectIds.length === 0) return result;
  const rows = db
    .select({ projectId: projectCategory.project, category })
    .from(projectCategory)
    .innerJoin(category, eq(projectCategory.category, category.id))
    .where(inArray(projectCategory.project, projectIds))
    .orderBy(asc(sql`lower(${category.name})`))
    .all();
  for (const { projectId, category } of rows) {
    const list = result.get(projectId) ?? [];
    list.push(category);
    result.set(projectId, list);
  }
  return result;
}

/** All video projects, most recently updated first, with their categories. */
export function listVideoProjects(db: Db): VideoProjectWithCategories[] {
  const projects = db
    .select()
    .from(videoProject)
    .orderBy(desc(videoProject.updated), desc(videoProject.created))
    .all();
  const ids = projects.map((p) => p.id);
  const byProject = categoriesByProject(db, ids);
  const words = wordsByProject(db, ids);
  return projects.map((p) => ({
    ...p,
    categories: byProject.get(p.id) ?? [],
    wordCount: words.get(p.id) ?? 0,
  }));
}

export function getVideoProject(
  db: Db,
  id: string,
): VideoProjectWithCategories | undefined {
  const project = db
    .select()
    .from(videoProject)
    .where(eq(videoProject.id, id))
    .get();
  if (!project) return undefined;
  return {
    ...project,
    categories: categoriesByProject(db, [id]).get(id) ?? [],
    wordCount: wordsByProject(db, [id]).get(id) ?? 0,
  };
}

/** The project's sections: top level by position, each followed by its subsections. */
export function listSections(db: Db, projectId: string): Section[] {
  const all = db
    .select()
    .from(section)
    .where(eq(section.videoProject, projectId))
    .orderBy(asc(section.position))
    .all();
  return all
    .filter((s) => s.parent === null)
    .flatMap((top) => [top, ...all.filter((s) => s.parent === top.id)]);
}

export type VideoProjectChanges = { title?: string; stage?: VideoStage };

/** Changes the title (never blank) or stage, and bumps `updated`. */
export function updateVideoProject(
  db: Db,
  id: string,
  changes: VideoProjectChanges,
  now = new Date(),
): VideoProject | undefined {
  const values: Partial<VideoProject> = {};
  if (changes.title !== undefined) {
    const title = changes.title.trim();
    if (!title) throw new Error("A video project needs a title.");
    values.title = title;
  }
  if (changes.stage !== undefined) {
    if (!VIDEO_STAGES.includes(changes.stage)) {
      throw new Error(`Unknown stage: ${changes.stage}`);
    }
    values.stage = changes.stage;
  }
  return db
    .update(videoProject)
    .set({ ...values, updated: now.toISOString() })
    .where(eq(videoProject.id, id))
    .returning()
    .get();
}

export function addProjectCategory(
  db: Db,
  projectId: string,
  categoryId: string,
  now = new Date(),
): void {
  db.transaction((tx) => {
    tx.insert(projectCategory)
      .values({ project: projectId, category: categoryId })
      .onConflictDoNothing()
      .run();
    tx.update(videoProject)
      .set({ updated: now.toISOString() })
      .where(eq(videoProject.id, projectId))
      .run();
  });
}

export function removeProjectCategory(
  db: Db,
  projectId: string,
  categoryId: string,
  now = new Date(),
): void {
  db.transaction((tx) => {
    tx.delete(projectCategory)
      .where(
        and(
          eq(projectCategory.project, projectId),
          eq(projectCategory.category, categoryId),
        ),
      )
      .run();
    tx.update(videoProject)
      .set({ updated: now.toISOString() })
      .where(eq(videoProject.id, projectId))
      .run();
  });
}

/**
 * Deletes a project with its sections and category links (one statement,
 * cascading). Sources stay in the library.
 */
export function deleteVideoProject(db: Db, id: string): void {
  db.delete(videoProject).where(eq(videoProject.id, id)).run();
}

export function countVideoProjects(db: Db): number {
  return db.select({ n: count() }).from(videoProject).get()?.n ?? 0;
}
