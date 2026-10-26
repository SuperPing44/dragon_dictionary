"use server";

import { refresh, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createSource,
  deleteSource,
  removeSourceFile,
  updateSource,
} from "@/db";
import {
  type SourceErrors,
  type SourceInput,
  validateSource,
} from "@/lib/sources";

export type SaveResult = { ok: true } | { ok: false; errors: SourceErrors };

/**
 * Saves the source form. A new source opens its own page afterwards; an
 * existing one stays where it is.
 */
export async function saveSource(
  id: string | null,
  input: SourceInput,
): Promise<SaveResult> {
  const checked = validateSource(input);
  if (!checked.ok) return checked;
  if (id) {
    await updateSource(id, checked.values);
    refresh();
    return { ok: true };
  }
  const created = await createSource(checked.values);
  // The redirect lands on a new route; purge cached routes and the sidebar.
  revalidatePath("/", "layout");
  redirect(`/sources/${created.id}`);
}

export async function deleteSourceAction(id: string) {
  await deleteSource(id);
  revalidatePath("/", "layout");
  redirect("/sources");
}

export async function removeFileAction(fileId: string) {
  await removeSourceFile(fileId);
  refresh();
}
