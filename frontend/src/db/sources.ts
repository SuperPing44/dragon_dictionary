import { rm } from "node:fs/promises";
import {
  and,
  asc,
  count,
  desc,
  eq,
  like,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { normalizeLink, type SourceValues } from "@/lib/sources";
import type { Db } from "./connection";
import { sourceDir } from "./files";
import { SOURCE_TYPES, type Source, type SourceType, source } from "./schema";

export const SOURCE_SORTS = ["title", "newest"] as const;
export type SourceSort = (typeof SOURCE_SORTS)[number];

export type SourceQuery = {
  /** Matches title or author, ignoring case. */
  search?: string;
  type?: SourceType;
  sort?: SourceSort;
};

export type SourceWithProjects = Source & {
  /** How many video projects link this source. */
  projects: number;
};

const escapeLike = (text: string) => text.replace(/[\\%_]/g, (c) => `\\${c}`);

/** The library: filtered by type and search, by title A–Z (default) or newest. */
export function listSources(
  db: Db,
  { search, type, sort = "title" }: SourceQuery = {},
): SourceWithProjects[] {
  const filters: SQL[] = [];
  if (type && SOURCE_TYPES.includes(type)) filters.push(eq(source.type, type));
  const words = search?.trim();
  if (words) {
    const pattern = `%${escapeLike(words)}%`;
    const match = or(
      like(source.title, sql`${pattern} escape '\\'`),
      like(source.author, sql`${pattern} escape '\\'`),
    );
    if (match) filters.push(match);
  }
  const order =
    sort === "newest"
      ? [desc(source.created)]
      : [asc(sql`${source.title} collate nocase`), desc(source.created)];
  // Linked projects arrive with the Sources tab.
  return db
    .select()
    .from(source)
    .where(and(...filters))
    .orderBy(...order)
    .all()
    .map((s) => ({ ...s, projects: 0 }));
}

export function getSource(db: Db, id: string): SourceWithProjects | undefined {
  const found = db.select().from(source).where(eq(source.id, id)).get();
  return found && { ...found, projects: 0 };
}

export function createSource(
  db: Db,
  values: SourceValues,
  now = new Date(),
): Source {
  const stamp = now.toISOString();
  return db
    .insert(source)
    .values({ id: uuidv7(), ...values, created: stamp, updated: stamp })
    .returning()
    .get();
}

export function updateSource(
  db: Db,
  id: string,
  values: SourceValues,
  now = new Date(),
): Source | undefined {
  return db
    .update(source)
    .set({ ...values, updated: now.toISOString() })
    .where(eq(source.id, id))
    .returning()
    .get();
}

/**
 * Deletes a source; its PDF records go with it (cascade). The PDFs on disk
 * are removed only after the database change has succeeded.
 */
export async function deleteSource(
  db: Db,
  id: string,
  filesRoot: string,
): Promise<void> {
  db.delete(source).where(eq(source.id, id)).run();
  await rm(sourceDir(filesRoot, id), { recursive: true, force: true });
}

/** Every source with a link, by normalized link, for the duplicate warning. */
export function linkIndex(
  db: Db,
): { id: string; title: string; link: string }[] {
  return db
    .select({ id: source.id, title: source.title, link: source.link })
    .from(source)
    .all()
    .flatMap((s) =>
      s.link ? [{ id: s.id, title: s.title, link: normalizeLink(s.link) }] : [],
    );
}

export function countSources(db: Db): number {
  return db.select({ n: count() }).from(source).get()?.n ?? 0;
}
