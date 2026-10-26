"use server";

import { refresh, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addQuote,
  createSource,
  deleteSource,
  linkSource,
  removeQuote,
  removeSourceFile,
  updateQuote,
  updateSource,
} from "@/db";
import {
  type SourceErrors,
  type SourceInput,
  validateSource,
} from "@/lib/sources";

export type SaveResult = { ok: true } | { ok: false; errors: SourceErrors };

/**
 * Saves the source form. A new source opens its own page afterwards, or,
 * when created from a project, is linked to it and returns to its Sources
 * tab. An existing one stays where it is.
 */
export async function saveSource(
  id: string | null,
  input: SourceInput,
  linkTo?: string,
): Promise<SaveResult> {
  const checked = validateSource(input);
  if (!checked.ok) return checked;
  if (id) {
    await updateSource(id, checked.values);
    refresh();
    return { ok: true };
  }
  const created = await createSource(checked.values);
  if (linkTo) await linkSource(linkTo, created.id);
  // The redirect lands on a new route; purge cached routes and the sidebar.
  revalidatePath("/", "layout");
  redirect(linkTo ? `/projects/${linkTo}/sources` : `/sources/${created.id}`);
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

/** Adds or edits a quote; a blank quote is refused. */
export async function saveQuoteAction(
  sourceId: string,
  quoteId: string | null,
  input: { text: string; location: string },
) {
  if (!input.text.trim()) return { ok: false as const };
  if (quoteId) await updateQuote(quoteId, input);
  else await addQuote(sourceId, input);
  refresh();
  return { ok: true as const };
}

export async function removeQuoteAction(quoteId: string) {
  await removeQuote(quoteId);
  refresh();
}

/** From a project: link an existing source instead of creating a duplicate. */
export async function linkExistingAction(projectId: string, sourceId: string) {
  await linkSource(projectId, sourceId);
  revalidatePath("/", "layout");
  redirect(`/projects/${projectId}/sources`);
}
