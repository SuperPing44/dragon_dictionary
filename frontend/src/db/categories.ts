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
