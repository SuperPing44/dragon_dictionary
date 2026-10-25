import { count, desc, sql } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import type { Db } from "./connection";
import { type Idea, idea } from "./schema";

/** Rating, highest first, unrated last; ties go to the newest. */
export function listIdeas(db: Db): Idea[] {
  return db
    .select()
    .from(idea)
    .orderBy(sql`${idea.rating} is null`, desc(idea.rating), desc(idea.created))
    .all();
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

export function countIdeas(db: Db): number {
  return db.select({ n: count() }).from(idea).get()?.n ?? 0;
}
