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
  description: text("description").notNull().default(""),
  editingNote: text("editing_note").notNull().default(""),
  // Manual order within the stage's board column, 0 on top.
  boardPosition: integer("board_position").notNull().default(0),
  // At most one final draft, by construction. Cleared when it's deleted.
  finalThumbnail: text("final_thumbnail").references(
    (): AnySQLiteColumn => thumbnailDraft.id,
    { onDelete: "set null" },
  ),
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

/** What kind of thing a source is. Just a label: one form fits every type. */
export const SOURCE_TYPES = [
  "website",
  "book",
  "pdf",
  "youtube",
  "paper",
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const source = sqliteTable("source", {
  id: text("id").primaryKey(),
  type: text("type").$type<SourceType>().notNull(),
  title: text("title").notNull(),
  // For YouTube, the channel.
  author: text("author"),
  link: text("link"),
  // For papers, the journal.
  publisher: text("publisher"),
  // Partial ISO text, as precise as known: 1220, 1220-05 or 1220-05-03.
  date: text("date"),
  note: text("note"),
  created: text("created").notNull(),
  updated: text("updated").notNull(),
});

export type Source = typeof source.$inferSelect;

/** A PDF attached to a source, stored as files/<source-id>/<file-id>.pdf. */
export const sourceFile = sqliteTable("source_file", {
  id: text("id").primaryKey(),
  source: text("source")
    .notNull()
    .references(() => source.id, { onDelete: "cascade" }),
  originalName: text("original_name").notNull(),
  size: integer("size").notNull(),
  uploaded: text("uploaded").notNull(),
});

export type SourceFile = typeof sourceFile.$inferSelect;

/** A quote from a source, with an optional location ("p. 42", "12:30"). */
export const quote = sqliteTable("quote", {
  id: text("id").primaryKey(),
  source: text("source")
    .notNull()
    .references(() => source.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  location: text("location"),
  created: text("created").notNull(),
});

export type Quote = typeof quote.$inferSelect;

/** A source linked to a video project; `linked` sets the source list order. */
export const projectSource = sqliteTable(
  "project_source",
  {
    project: text("project")
      .notNull()
      .references(() => videoProject.id, { onDelete: "cascade" }),
    source: text("source")
      .notNull()
      .references(() => source.id, { onDelete: "cascade" }),
    linked: text("linked").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.project, t.source] }),
    index("project_source_by_source").on(t.source),
  ],
);

/**
 * A candidate title. The final one is the option whose text matches the
 * project title, ignoring surrounding spaces; there's no flag for it.
 */
export const titleOption = sqliteTable(
  "title_option",
  {
    id: text("id").primaryKey(),
    videoProject: text("video_project")
      .notNull()
      .references(() => videoProject.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    position: integer("position").notNull(),
    created: text("created").notNull(),
  },
  (t) => [index("title_option_project").on(t.videoProject)],
);

export type TitleOption = typeof titleOption.$inferSelect;

/** A YouTube tag, kept as typed and unique per project ignoring case. */
export const projectTag = sqliteTable(
  "project_tag",
  {
    videoProject: text("video_project")
      .notNull()
      .references(() => videoProject.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    position: integer("position").notNull(),
  },
  (t) => [
    uniqueIndex("project_tag_unique").on(t.videoProject, sql`lower(${t.text})`),
  ],
);

export type ProjectTag = typeof projectTag.$inferSelect;

/**
 * A thumbnail draft image, stored as
 * files/thumbnails/<project-id>/<draft-id>.<ext>.
 */
export const thumbnailDraft = sqliteTable(
  "thumbnail_draft",
  {
    id: text("id").primaryKey(),
    videoProject: text("video_project")
      .notNull()
      .references((): AnySQLiteColumn => videoProject.id, {
        onDelete: "cascade",
      }),
    originalName: text("original_name").notNull(),
    ext: text("ext").notNull(),
    size: integer("size").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    note: text("note"),
    uploaded: text("uploaded").notNull(),
  },
  (t) => [index("thumbnail_draft_project").on(t.videoProject)],
);

export type ThumbnailDraft = typeof thumbnailDraft.$inferSelect;

/**
 * An extra B-roll item, with no spot in the script. Script items are the
 * stage directions themselves (ADR 0003).
 */
export const brollItem = sqliteTable(
  "broll_item",
  {
    id: text("id").primaryKey(),
    videoProject: text("video_project")
      .notNull()
      .references(() => videoProject.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    found: integer("found", { mode: "boolean" }).notNull().default(false),
    created: text("created").notNull(),
  },
  (t) => [index("broll_item_project").on(t.videoProject)],
);

export type BrollItem = typeof brollItem.$inferSelect;
