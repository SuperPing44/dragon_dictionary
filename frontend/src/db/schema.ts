import { sql } from "drizzle-orm";
import {
  type AnySQLiteColumn,
  index,
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

/** A video project's lifecycle, in order. The Idea stage is the idea list. */
export const VIDEO_STAGES = [
  "research",
  "script",
  "recording",
  "editing",
  "thumbnail",
  "upload",
  "published",
] as const;
export type VideoStage = (typeof VIDEO_STAGES)[number];

export const videoProject = sqliteTable("video_project", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  stage: text("stage").$type<VideoStage>().notNull(),
  // The idea's note and rating, kept when it became a project.
  originalNote: text("original_note"),
  originalRating: integer("original_rating"),
  created: text("created").notNull(),
  updated: text("updated").notNull(),
});

export type VideoProject = typeof videoProject.$inferSelect;

export const projectCategory = sqliteTable(
  "project_category",
  {
    project: text("project")
      .notNull()
      .references(() => videoProject.id, { onDelete: "cascade" }),
    category: text("category")
      .notNull()
      .references(() => category.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.project, t.category] })],
);

/** The fixed top-level section kinds, in canonical order. */
export const SECTION_KINDS = [
  "opening_story",
  "hook",
  "intro",
  "main",
  "outro",
  "closing_story",
] as const;
export type SectionKind = (typeof SECTION_KINDS)[number];

/**
 * The script is the project's sections. A top-level section has a kind and
 * no parent; a subsection has the Main part as parent and a title.
 * `position` orders siblings.
 */
export const section = sqliteTable(
  "section",
  {
    id: text("id").primaryKey(),
    videoProject: text("video_project")
      .notNull()
      .references(() => videoProject.id, { onDelete: "cascade" }),
    kind: text("kind").$type<SectionKind>(),
    parent: text("parent").references((): AnySQLiteColumn => section.id, {
      onDelete: "cascade",
    }),
    title: text("title"),
    position: integer("position").notNull(),
    // Tiptap JSON (ADR 0002); stage directions live inside it.
    content: text("content").notNull(),
    wordCount: integer("word_count").notNull().default(0),
  },
  (t) => [index("section_project").on(t.videoProject)],
);

export type Section = typeof section.$inferSelect;

/** App-wide settings and status, e.g. the speaking rate or the last backup. */
export const appMeta = sqliteTable("app_meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
