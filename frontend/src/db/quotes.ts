import { asc, eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import type { Db } from "./connection";
import { type Quote, quote } from "./schema";

export type QuoteInput = { text: string; location?: string | null };

function clean({ text, location }: QuoteInput) {
  // The quote keeps its line breaks; only surrounding blank space goes.
  const trimmed = text.trim();
  if (!trimmed) throw new Error("A quote needs some text.");
  return { text: trimmed, location: location?.trim() || null };
}

/** A source's quotes, oldest first. */
export function listQuotes(db: Db, sourceId: string): Quote[] {
  return db
    .select()
    .from(quote)
    .where(eq(quote.source, sourceId))
    .orderBy(asc(quote.created), asc(quote.id))
    .all();
}

export function addQuote(
  db: Db,
  sourceId: string,
  input: QuoteInput,
  now = new Date(),
): Quote {
  return db
    .insert(quote)
    .values({
      id: uuidv7(),
      source: sourceId,
      ...clean(input),
      created: now.toISOString(),
    })
    .returning()
    .get();
}

export function updateQuote(
  db: Db,
  id: string,
  input: QuoteInput,
): Quote | undefined {
  return db
    .update(quote)
    .set(clean(input))
    .where(eq(quote.id, id))
    .returning()
    .get();
}

export function removeQuote(db: Db, id: string): void {
  db.delete(quote).where(eq(quote.id, id)).run();
}
