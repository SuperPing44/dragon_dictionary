import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Timestamps are ISO 8601 text. "Newest" sorts use `created`, never the ID.
export const idea = sqliteTable("idea", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  note: text("note"),
  rating: integer("rating"),
  created: text("created").notNull(),
  updated: text("updated").notNull(),
});

export type Idea = typeof idea.$inferSelect;
