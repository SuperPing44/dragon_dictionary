import { io } from "next/cache";
import * as categoryQueries from "./categories";
import { getDb } from "./connection";
import * as ideaQueries from "./ideas";
import type { Category, CategoryColour } from "./schema";

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

/** Adds an existing category, or a new one by name (an existing name wins). */
export async function addIdeaCategory(
  ideaId: string,
  pick: { categoryId: string } | { name: string; colour: CategoryColour },
): Promise<Category | undefined> {
  await io();
  const db = getDb();
  const target =
    "categoryId" in pick
      ? categoryQueries.listCategories(db).find((c) => c.id === pick.categoryId)
      : categoryQueries.createCategory(db, pick.name, pick.colour);
  if (target) categoryQueries.addIdeaCategory(db, ideaId, target.id);
  return target;
}

export async function removeIdeaCategory(ideaId: string, categoryId: string) {
  await io();
  categoryQueries.removeIdeaCategory(getDb(), ideaId, categoryId);
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
  // Video projects and sources arrive with their own tickets.
  return {
    ideas: ideaQueries.countIdeas(db),
    videoProjects: 0,
    sources: 0,
    categories: categoryQueries.countCategories(db),
  };
}

export type { CategoryWithUsage, RenameResult } from "./categories";
export { IDEA_SORTS, type IdeaSort } from "./ideas";
export {
  CATEGORY_COLOURS,
  type Category,
  type CategoryColour,
  type Idea,
} from "./schema";
