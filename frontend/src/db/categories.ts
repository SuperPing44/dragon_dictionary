import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import type { Db } from "./connection";
import {
  CATEGORY_COLOURS,
  type Category,
  type CategoryColour,
  category,
  idea,
  ideaCategory,
  projectCategory,
} from "./schema";

export function isCategoryColour(value: unknown): value is CategoryColour {
  return CATEGORY_COLOURS.includes(value as CategoryColour);
}

/** All categories, A–Z ignoring case. */
export function listCategories(db: Db): Category[] {
  return db
    .select()
    .from(category)
    .orderBy(asc(sql`lower(${category.name})`))
    .all();
}

export function findCategoryByName(db: Db, name: string): Category | undefined {
  return db
    .select()
    .from(category)
    .where(eq(sql`lower(${category.name})`, name.trim().toLowerCase()))
    .get();
}

/**
 * The default colour for a new category: the next palette colour after the
 * newest category's that no category uses yet, wrapping around. When every
 * colour is taken, simply the one after the newest category's.
 */
export function nextCategoryColour(db: Db): CategoryColour {
  const used = new Set(
    db
      .selectDistinct({ colour: category.colour })
      .from(category)
      .all()
      .map((c) => c.colour),
  );
  const newest = db
    .select({ colour: category.colour })
    .from(category)
    .orderBy(desc(category.created))
    .get();
  const start = newest ? CATEGORY_COLOURS.indexOf(newest.colour) + 1 : 0;
  const n = CATEGORY_COLOURS.length;
  for (let i = 0; i < n; i++) {
    const colour = CATEGORY_COLOURS[(start + i) % n];
    if (!used.has(colour)) return colour;
  }
  return CATEGORY_COLOURS[start % n];
}

/**
 * Creates a category, or returns the existing one whose name matches
 * ignoring case (its colour is left as it is).
 */
export function createCategory(
  db: Db,
  name: string,
  colour: CategoryColour,
  now = new Date(),
): Category {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("A category needs a name.");
  if (!isCategoryColour(colour)) throw new Error(`Unknown colour: ${colour}`);
  const existing = findCategoryByName(db, trimmed);
  if (existing) return existing;
  return db
    .insert(category)
    .values({
      id: uuidv7(),
      name: trimmed,
      colour,
      created: now.toISOString(),
    })
    .returning()
    .get();
}

/** Links a category to an idea (a no-op if already linked). */
export function addIdeaCategory(
  db: Db,
  ideaId: string,
  categoryId: string,
  now = new Date(),
): void {
  db.transaction((tx) => {
    tx.insert(ideaCategory)
      .values({ idea: ideaId, category: categoryId })
      .onConflictDoNothing()
      .run();
    tx.update(idea)
      .set({ updated: now.toISOString() })
      .where(eq(idea.id, ideaId))
      .run();
  });
}

export function removeIdeaCategory(
  db: Db,
  ideaId: string,
  categoryId: string,
  now = new Date(),
): void {
  db.transaction((tx) => {
    tx.delete(ideaCategory)
      .where(
        and(
          eq(ideaCategory.idea, ideaId),
          eq(ideaCategory.category, categoryId),
        ),
      )
      .run();
    tx.update(idea)
      .set({ updated: now.toISOString() })
      .where(eq(idea.id, ideaId))
      .run();
  });
}

/** Each idea's categories, A–Z, keyed by idea ID. */
export function categoriesByIdea(
  db: Db,
  ideaIds: string[],
): Map<string, Category[]> {
  const result = new Map<string, Category[]>();
  if (ideaIds.length === 0) return result;
  const rows = db
    .select({ ideaId: ideaCategory.idea, category })
    .from(ideaCategory)
    .innerJoin(category, eq(ideaCategory.category, category.id))
    .where(inArray(ideaCategory.idea, ideaIds))
    .orderBy(asc(sql`lower(${category.name})`))
    .all();
  for (const { ideaId, category } of rows) {
    const list = result.get(ideaId) ?? [];
    list.push(category);
    result.set(ideaId, list);
  }
  return result;
}

export function countCategories(db: Db): number {
  return db.select({ n: count() }).from(category).get()?.n ?? 0;
}

export type CategoryWithUsage = Category & {
  ideas: number;
  videoProjects: number;
};

/** All categories A–Z with how many items use each. */
export function listCategoriesWithUsage(db: Db): CategoryWithUsage[] {
  const countsBy = (table: typeof ideaCategory | typeof projectCategory) =>
    new Map(
      db
        .select({ id: table.category, n: count() })
        .from(table)
        .groupBy(table.category)
        .all()
        .map((r) => [r.id, r.n]),
    );
  const ideaCounts = countsBy(ideaCategory);
  const projectCounts = countsBy(projectCategory);
  return listCategories(db).map((c) => ({
    ...c,
    ideas: ideaCounts.get(c.id) ?? 0,
    videoProjects: projectCounts.get(c.id) ?? 0,
  }));
}

export function setCategoryColour(
  db: Db,
  id: string,
  colour: CategoryColour,
): void {
  if (!isCategoryColour(colour)) throw new Error(`Unknown colour: ${colour}`);
  db.update(category).set({ colour }).where(eq(category.id, id)).run();
}

export type RenameResult =
  | { ok: true }
  /** Another category already has this name, ignoring case. */
  | { ok: false; conflict: Category };

/**
 * Renames a category everywhere. A name taken by another category (ignoring
 * case) is not applied; the caller can offer to merge instead.
 */
export function renameCategory(db: Db, id: string, name: string): RenameResult {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("A category needs a name.");
  const other = findCategoryByName(db, trimmed);
  if (other && other.id !== id) return { ok: false, conflict: other };
  db.update(category).set({ name: trimmed }).where(eq(category.id, id)).run();
  return { ok: true };
}

/**
 * Moves every link of one category onto another and deletes the first, in
 * one transaction. Items that had both keep one link.
 */
export function mergeCategory(db: Db, fromId: string, intoId: string): void {
  if (fromId === intoId) return;
  db.transaction((tx) => {
    tx.run(sql`
      insert or ignore into ${ideaCategory} (idea, category)
      select idea, ${intoId} from ${ideaCategory} where category = ${fromId}
    `);
    tx.run(sql`
      insert or ignore into ${projectCategory} (project, category)
      select project, ${intoId} from ${projectCategory} where category = ${fromId}
    `);
    tx.delete(category).where(eq(category.id, fromId)).run();
  });
}

/** Deletes a category; its links go with it, the items keep everything else. */
export function deleteCategory(db: Db, id: string): void {
  db.delete(category).where(eq(category.id, id)).run();
}
