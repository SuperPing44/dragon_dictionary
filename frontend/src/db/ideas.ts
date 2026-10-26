import { and, asc, count, desc, eq, exists, inArray, sql } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import type { Db } from "./connection";
import { type Idea, idea, ideaCategory } from "./schema";

export const IDEA_SORTS = ["rating", "newest", "title"] as const;
export type IdeaSort = (typeof IDEA_SORTS)[number];

/**
 * Rating (default), newest first or title A–Z; ties always go to the newest.
 * With categories given, only ideas that have any of them (OR).
 */
export function listIdeas(
  db: Db,
  sort: IdeaSort = "rating",
  categoryIds: string[] = [],
): Idea[] {
  const order = {
    rating: [sql`${idea.rating} is null`, desc(idea.rating)],
    newest: [],
    title: [asc(sql`${idea.title} collate nocase`)],
  }[sort];
  const filter =
    categoryIds.length > 0
      ? exists(
          db
            .select({ one: sql`1` })
            .from(ideaCategory)
            .where(
              and(
                eq(ideaCategory.idea, idea.id),
                inArray(ideaCategory.category, categoryIds),
              ),
            ),
        )
      : undefined;
  return db
    .select()
    .from(idea)
    .where(filter)
    .orderBy(...order, desc(idea.created))
    .all();
}

export function getIdea(db: Db, id: string): Idea | undefined {
  return db.select().from(idea).where(eq(idea.id, id)).get();
}

/** Creates an idea from a title; returns undefined for a blank title. */
export function createIdea(
  db: Db,
  title: string,
  now = new Date(),
): Idea | undefined {
  const trimmed = title.trim();
  if (!trimmed) return undefined;
  const stamp = now.toISOString();
  return db
    .insert(idea)
    .values({ id: uuidv7(), title: trimmed, created: stamp, updated: stamp })
    .returning()
    .get();
}

export type IdeaChanges = {
  title?: string;
  note?: string | null;
  rating?: number | null;
};

/**
 * Applies the valid changes and returns the updated idea. A blank title, or a
 * rating that isn't a whole number from 1 to 10, is rejected with an error.
 * A blank note is stored as no note.
 */
export function updateIdea(
  db: Db,
  id: string,
  changes: IdeaChanges,
  now = new Date(),
): Idea | undefined {
  const values: Partial<Idea> = {};
  if (changes.title !== undefined) {
    const title = changes.title.trim();
    if (!title) throw new Error("An idea needs a title.");
    values.title = title;
  }
  if (changes.note !== undefined) {
    values.note = changes.note?.trim() ? changes.note : null;
  }
  if (changes.rating !== undefined) {
    const { rating } = changes;
    if (
      rating !== null &&
      !(Number.isInteger(rating) && rating >= 1 && rating <= 10)
    ) {
      throw new Error("A rating is a whole number from 1 to 10.");
    }
    values.rating = rating;
  }
  return db
    .update(idea)
    .set({ ...values, updated: now.toISOString() })
    .where(eq(idea.id, id))
    .returning()
    .get();
}

export function deleteIdea(db: Db, id: string): void {
  db.delete(idea).where(eq(idea.id, id)).run();
}

export function countIdeas(db: Db): number {
  return db.select({ n: count() }).from(idea).get()?.n ?? 0;
}
