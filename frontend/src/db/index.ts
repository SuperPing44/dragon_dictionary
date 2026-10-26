import { rm } from "node:fs/promises";
import type { Readable } from "node:stream";
import { io } from "next/cache";
import { v7 as uuidv7 } from "uuid";
import type { SourceValues } from "@/lib/sources";
import * as categoryQueries from "./categories";
import { getDb, resolveFilesRoot } from "./connection";
import * as fileQueries from "./files";
import * as ideaQueries from "./ideas";
import * as metaQueries from "./meta";
import * as projectQueries from "./projects";
import type { Category, CategoryColour, SectionKind } from "./schema";
import * as sectionQueries from "./sections";
import * as sourceQueries from "./sources";

// Every query goes through here. better-sqlite3 is synchronous, so each read
// awaits io() first; otherwise cacheComponents would prerender it.

export async function listIdeas(
  sort?: ideaQueries.IdeaSort,
  categoryIds?: string[],
) {
  await io();
  return ideaQueries.listIdeas(getDb(), sort, categoryIds);
}

/** Ideas with each idea's categories attached. */
export async function listIdeasWithCategories(
  sort?: ideaQueries.IdeaSort,
  categoryIds?: string[],
) {
  await io();
  const db = getDb();
  const ideas = ideaQueries.listIdeas(db, sort, categoryIds);
  const byIdea = categoryQueries.categoriesByIdea(
    db,
    ideas.map((i) => i.id),
  );
  return ideas.map((idea) => ({
    ...idea,
    categories: byIdea.get(idea.id) ?? [],
  }));
}

export async function getIdea(id: string) {
  await io();
  return ideaQueries.getIdea(getDb(), id);
}

export async function createIdea(title: string) {
  await io();
  return ideaQueries.createIdea(getDb(), title);
}

export async function updateIdea(id: string, changes: ideaQueries.IdeaChanges) {
  await io();
  return ideaQueries.updateIdea(getDb(), id, changes);
}

export async function deleteIdea(id: string) {
  await io();
  ideaQueries.deleteIdea(getDb(), id);
}

export async function listCategories() {
  await io();
  return categoryQueries.listCategories(getDb());
}

export async function listCategoriesWithUsage() {
  await io();
  return categoryQueries.listCategoriesWithUsage(getDb());
}

export async function createCategory(name: string, colour: CategoryColour) {
  await io();
  return categoryQueries.createCategory(getDb(), name, colour);
}

export async function setCategoryColour(id: string, colour: CategoryColour) {
  await io();
  categoryQueries.setCategoryColour(getDb(), id, colour);
}

export async function renameCategory(id: string, name: string) {
  await io();
  return categoryQueries.renameCategory(getDb(), id, name);
}

export async function mergeCategory(fromId: string, intoId: string) {
  await io();
  categoryQueries.mergeCategory(getDb(), fromId, intoId);
}

export async function deleteCategory(id: string) {
  await io();
  categoryQueries.deleteCategory(getDb(), id);
}

export async function nextCategoryColour() {
  await io();
  return categoryQueries.nextCategoryColour(getDb());
}

export type CategoryPick =
  | { categoryId: string }
  | { name: string; colour: CategoryColour };

/** An existing category, or a new one by name (an existing name wins). */
function resolveCategoryPick(pick: CategoryPick): Category | undefined {
  const db = getDb();
  return "categoryId" in pick
    ? categoryQueries.listCategories(db).find((c) => c.id === pick.categoryId)
    : categoryQueries.createCategory(db, pick.name, pick.colour);
}

export async function addIdeaCategory(ideaId: string, pick: CategoryPick) {
  await io();
  const target = resolveCategoryPick(pick);
  if (target) categoryQueries.addIdeaCategory(getDb(), ideaId, target.id);
  return target;
}

export async function removeIdeaCategory(ideaId: string, categoryId: string) {
  await io();
  categoryQueries.removeIdeaCategory(getDb(), ideaId, categoryId);
}

export async function makeVideoProject(ideaId: string) {
  await io();
  return projectQueries.makeVideoProject(getDb(), ideaId);
}

export async function listVideoProjects() {
  await io();
  return projectQueries.listVideoProjects(getDb());
}

export async function getVideoProject(id: string) {
  await io();
  return projectQueries.getVideoProject(getDb(), id);
}

export async function listSections(projectId: string) {
  await io();
  return projectQueries.listSections(getDb(), projectId);
}

export async function updateVideoProject(
  id: string,
  changes: projectQueries.VideoProjectChanges,
) {
  await io();
  return projectQueries.updateVideoProject(getDb(), id, changes);
}

export async function addProjectCategory(
  projectId: string,
  pick: CategoryPick,
) {
  await io();
  const target = resolveCategoryPick(pick);
  if (target) projectQueries.addProjectCategory(getDb(), projectId, target.id);
  return target;
}

export async function removeProjectCategory(
  projectId: string,
  categoryId: string,
) {
  await io();
  projectQueries.removeProjectCategory(getDb(), projectId, categoryId);
}

export async function deleteVideoProject(id: string) {
  await io();
  projectQueries.deleteVideoProject(getDb(), id);
}

export async function saveSectionContent(sectionId: string, content: string) {
  await io();
  return sectionQueries.saveSectionContent(getDb(), sectionId, content);
}

export async function addSection(projectId: string, kind: SectionKind) {
  await io();
  return sectionQueries.addSection(getDb(), projectId, kind);
}

export async function removeSection(sectionId: string) {
  await io();
  sectionQueries.removeSection(getDb(), sectionId);
}

export async function addSubsection(mainId: string) {
  await io();
  return sectionQueries.addSubsection(getDb(), mainId);
}

export async function renameSubsection(id: string, title: string) {
  await io();
  sectionQueries.renameSubsection(getDb(), id, title);
}

export async function reorderSections(
  projectId: string,
  parent: string | null,
  orderedIds: string[],
) {
  await io();
  sectionQueries.reorderSections(getDb(), projectId, parent, orderedIds);
}

export async function getSpeakingRate() {
  await io();
  return metaQueries.getSpeakingRate(getDb());
}

export async function setSpeakingRate(rate: number) {
  await io();
  metaQueries.setSpeakingRate(getDb(), rate);
}

export async function listSources(query?: sourceQueries.SourceQuery) {
  await io();
  return sourceQueries.listSources(getDb(), query);
}

export async function getSource(id: string) {
  await io();
  return sourceQueries.getSource(getDb(), id);
}

export async function createSource(values: SourceValues) {
  await io();
  return sourceQueries.createSource(getDb(), values);
}

export async function updateSource(id: string, values: SourceValues) {
  await io();
  return sourceQueries.updateSource(getDb(), id, values);
}

export async function deleteSource(id: string) {
  await io();
  await sourceQueries.deleteSource(getDb(), id, resolveFilesRoot());
}

export async function listSourceFiles(sourceId: string) {
  await io();
  return fileQueries.listSourceFiles(getDb(), sourceId);
}

export async function getSourceFile(id: string) {
  await io();
  return fileQueries.getSourceFile(getDb(), id);
}

/**
 * Stores an uploaded PDF for a source and records it. Throws NotAPdfError
 * for anything that isn't a PDF; returns undefined for an unknown source.
 */
export async function uploadSourceFile(
  sourceId: string,
  originalName: string,
  body: Readable,
) {
  await io();
  const db = getDb();
  if (!sourceQueries.getSource(db, sourceId)) return undefined;
  const root = resolveFilesRoot();
  const id = uuidv7();
  const size = await fileQueries.storeUpload(root, sourceId, id, body);
  try {
    return fileQueries.addSourceFile(db, {
      id,
      source: sourceId,
      originalName,
      size,
    });
  } catch (error) {
    await rm(fileQueries.filePath(root, sourceId, id), { force: true });
    throw error;
  }
}

/** Where a recorded PDF is on disk. */
export function sourceFilePath(file: { id: string; source: string }) {
  return fileQueries.filePath(resolveFilesRoot(), file.source, file.id);
}

export async function removeSourceFile(id: string) {
  await io();
  await fileQueries.removeSourceFile(getDb(), resolveFilesRoot(), id);
}

export async function sourceLinkIndex() {
  await io();
  return sourceQueries.linkIndex(getDb());
}

export type SidebarCounts = {
  ideas: number;
  videoProjects: number;
  sources: number;
  categories: number;
};

export async function sidebarCounts(): Promise<SidebarCounts> {
  await io();
  const db = getDb();
  return {
    ideas: ideaQueries.countIdeas(db),
    videoProjects: projectQueries.countVideoProjects(db),
    sources: sourceQueries.countSources(db),
    categories: categoryQueries.countCategories(db),
  };
}

export type { CategoryWithUsage, RenameResult } from "./categories";
export { NotAPdfError } from "./files";
export { IDEA_SORTS, type IdeaSort } from "./ideas";
export type { VideoProjectWithCategories } from "./projects";
export {
  CATEGORY_COLOURS,
  type Category,
  type CategoryColour,
  type Idea,
  SECTION_KINDS,
  type Section,
  type SectionKind,
  SOURCE_TYPES,
  type Source,
  type SourceFile,
  type SourceType,
  VIDEO_STAGES,
  type VideoProject,
  type VideoStage,
} from "./schema";
export {
  SOURCE_SORTS,
  type SourceSort,
  type SourceWithProjects,
} from "./sources";
