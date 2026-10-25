import { sql } from "drizzle-orm";
import {
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

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

/** The fixed category palette, in default-colour order. */
export const CATEGORY_COLOURS = [
  "emerald",
  "teal",
  "sky",
  "indigo",
  "violet",
  "fuchsia",
  "rose",
  "red",
  "orange",
  "amber",
  "lime",
  "slate",
] as const;
export type CategoryColour = (typeof CATEGORY_COLOURS)[number];

export const category = sqliteTable(
  "category",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    // A palette name, so the shades can change without a migration.
    colour: text("colour").$type<CategoryColour>().notNull(),
    created: text("created").notNull(),
  },
  (t) => [uniqueIndex("category_name_unique").on(sql`lower(${t.name})`)],
);

export type Category = typeof category.$inferSelect;

export const ideaCategory = sqliteTable(
  "idea_category",
  {
    idea: text("idea")
      .notNull()
      .references(() => idea.id, { onDelete: "cascade" }),
    category: text("category")
      .notNull()
      .references(() => category.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.idea, t.category] })],
);
