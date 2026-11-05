import { asc, eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { finalOption, isDuplicateOption } from "@/lib/title-options";
import type { Db } from "./connection";
import { type TitleOption, titleOption, videoProject } from "./schema";

type Conn = Pick<Db, "select" | "insert" | "update" | "delete">;

/** Why an add or edit was refused. */
export type TitleOptionRefusal = "blank" | "duplicate";
export type TitleOptionResult =
  | { ok: true; option: TitleOption }
  | { ok: false; reason: TitleOptionRefusal };

function touch(db: Conn, projectId: string, now: Date, title?: string) {
  db.update(videoProject)
    .set({ updated: now.toISOString(), ...(title ? { title } : {}) })
    .where(eq(videoProject.id, projectId))
    .run();
}

function projectTitle(db: Conn, projectId: string): string | undefined {
  return db
    .select({ title: videoProject.title })
    .from(videoProject)
    .where(eq(videoProject.id, projectId))
    .get()?.title;
}

/** A project's title options, in list order. */
export function listTitleOptions(db: Conn, projectId: string): TitleOption[] {
  return db
    .select()
    .from(titleOption)
    .where(eq(titleOption.videoProject, projectId))
    .orderBy(asc(titleOption.position), asc(titleOption.created))
    .all();
}

/** Appends an option to the end of the list. */
function append(
  db: Conn,
  projectId: string,
  text: string,
  now: Date,
): TitleOption {
  const options = listTitleOptions(db, projectId);
  const position = (options.at(-1)?.position ?? -1) + 1;
  return db
    .insert(titleOption)
    .values({
      id: uuidv7(),
      videoProject: projectId,
      text,
      position,
      created: now.toISOString(),
    })
    .returning()
    .get();
}

/**
 * The starting list of a new project: one option, its title, so it's final.
 */
export function seedTitleOption(
  db: Conn,
  projectId: string,
  title: string,
  now = new Date(),
): TitleOption {
  return append(db, projectId, title, now);
}

/** Adds an option at the end. Refuses blank text and duplicates (ignoring case). */
export function addTitleOption(
  db: Db,
  projectId: string,
  text: string,
  now = new Date(),
): TitleOptionResult {
  const clean = text.trim();
  if (!clean) return { ok: false, reason: "blank" };
  return db.transaction((tx) => {
    if (isDuplicateOption(listTitleOptions(tx, projectId), clean)) {
      return { ok: false, reason: "duplicate" } as const;
    }
    const option = append(tx, projectId, clean, now);
    touch(tx, projectId, now);
    return { ok: true, option } as const;
  });
}

/**
 * Changes an option's text. Editing the final option renames the project,
 * so it stays final. Refuses blank text and duplicates (ignoring case).
 * Returns undefined for an unknown option.
 */
export function editTitleOption(
  db: Db,
  id: string,
  text: string,
  now = new Date(),
): TitleOptionResult | undefined {
  const clean = text.trim();
  return db.transaction((tx) => {
    const option = tx
      .select()
      .from(titleOption)
      .where(eq(titleOption.id, id))
      .get();
    if (!option) return undefined;
    if (!clean) return { ok: false, reason: "blank" } as const;
    const options = listTitleOptions(tx, option.videoProject);
    if (isDuplicateOption(options, clean, id)) {
      return { ok: false, reason: "duplicate" } as const;
    }
    const title = projectTitle(tx, option.videoProject) ?? "";
    const wasFinal = finalOption(options, title)?.id === id;
    const updated = tx
      .update(titleOption)
      .set({ text: clean })
      .where(eq(titleOption.id, id))
      .returning()
      .get();
    touch(tx, option.videoProject, now, wasFinal ? clean : undefined);
    return { ok: true, option: updated } as const;
  });
}

/** Deletes an option. The final option can't be deleted. */
export function deleteTitleOption(db: Db, id: string, now = new Date()): void {
  db.transaction((tx) => {
    const option = tx
      .select()
      .from(titleOption)
      .where(eq(titleOption.id, id))
      .get();
    if (!option) return;
    const title = projectTitle(tx, option.videoProject) ?? "";
    const options = listTitleOptions(tx, option.videoProject);
    if (finalOption(options, title)?.id === id) {
      throw new Error("The final title option can't be deleted.");
    }
    tx.delete(titleOption).where(eq(titleOption.id, id)).run();
    touch(tx, option.videoProject, now);
  });
}

/** Puts a project's options in the given order; it must list exactly them. */
export function reorderTitleOptions(
  db: Db,
  projectId: string,
  orderedIds: string[],
  now = new Date(),
): void {
  db.transaction((tx) => {
    const ids = listTitleOptions(tx, projectId).map((o) => o.id);
    const same =
      ids.length === orderedIds.length &&
      new Set(orderedIds).size === orderedIds.length &&
      orderedIds.every((id) => ids.includes(id));
    if (!same) throw new Error("The new order must list exactly the options.");
    orderedIds.forEach((id, position) => {
      tx.update(titleOption)
        .set({ position })
        .where(eq(titleOption.id, id))
        .run();
    });
    touch(tx, projectId, now);
  });
}

/**
 * Makes an option final by setting the project title to its text. If the
 * old title wasn't an option yet, it's kept as one, at the end (unless an
 * option differs from it only by case).
 */
export function markTitleOptionFinal(
  db: Db,
  id: string,
  now = new Date(),
): void {
  db.transaction((tx) => {
    const option = tx
      .select()
      .from(titleOption)
      .where(eq(titleOption.id, id))
      .get();
    if (!option) return;
    const projectId = option.videoProject;
    const oldTitle = projectTitle(tx, projectId) ?? "";
    const options = listTitleOptions(tx, projectId);
    if (
      !finalOption(options, oldTitle) &&
      !isDuplicateOption(options, oldTitle)
    ) {
      append(tx, projectId, oldTitle.trim(), now);
    }
    touch(tx, projectId, now, option.text);
  });
}

/**
 * Keeps the options in step with a header rename (call before the project
 * row changes): if the new title matches another option, that one becomes
 * final and the old final keeps its text; otherwise the final option takes
 * the new title. With no final option, nothing changes.
 */
export function syncTitleOptionsOnRename(
  db: Conn,
  projectId: string,
  oldTitle: string,
  newTitle: string,
): void {
  const options = listTitleOptions(db, projectId);
  const oldFinal = finalOption(options, oldTitle);
  if (!oldFinal || finalOption(options, newTitle)) return;
  db.update(titleOption)
    .set({ text: newTitle.trim() })
    .where(eq(titleOption.id, oldFinal.id))
    .run();
}
