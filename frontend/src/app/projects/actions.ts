"use server";

import { refresh, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { CategoryPick } from "@/components/category-picker";
import {
  addProjectCategory,
  addProjectTag,
  addTitleOption,
  deleteTitleOption,
  deleteVideoProject,
  editTitleOption,
  linkSource,
  markTitleOptionFinal,
  removeProjectCategory,
  removeProjectTag,
  reorderTitleOptions,
  type TitleOptionRefusal,
  unlinkSource,
  updateVideoProject,
} from "@/db";
import type { VideoProjectChanges } from "@/db/projects";

export async function saveProject(id: string, changes: VideoProjectChanges) {
  await updateVideoProject(id, changes);
  refresh();
}

export async function addCategoryToProject(id: string, pick: CategoryPick) {
  await addProjectCategory(id, pick);
  refresh();
}

export async function removeCategoryFromProject(
  id: string,
  categoryId: string,
) {
  await removeProjectCategory(id, categoryId);
  refresh();
}

export async function deleteProject(id: string) {
  await deleteVideoProject(id);
  // The redirect lands on a cached route; purge it and the sidebar.
  revalidatePath("/", "layout");
  redirect("/projects");
}

export async function linkSourceAction(projectId: string, sourceId: string) {
  await linkSource(projectId, sourceId);
  refresh();
}

export async function unlinkSourceAction(projectId: string, sourceId: string) {
  await unlinkSource(projectId, sourceId);
  refresh();
}

/** Adds a title option; returns why it was refused, if it was. */
export async function addTitleOptionAction(
  projectId: string,
  text: string,
): Promise<TitleOptionRefusal | undefined> {
  const result = await addTitleOption(projectId, text);
  if (result.ok) refresh();
  return result.ok ? undefined : result.reason;
}

/** Edits a title option; returns why it was refused, if it was. */
export async function editTitleOptionAction(
  id: string,
  text: string,
): Promise<TitleOptionRefusal | undefined> {
  const result = await editTitleOption(id, text);
  if (result?.ok) refresh();
  return result && !result.ok ? result.reason : undefined;
}

export async function deleteTitleOptionAction(id: string) {
  await deleteTitleOption(id);
  refresh();
}

export async function reorderTitleOptionsAction(
  projectId: string,
  orderedIds: string[],
) {
  await reorderTitleOptions(projectId, orderedIds);
  refresh();
}

export async function markTitleOptionFinalAction(id: string) {
  await markTitleOptionFinal(id);
  refresh();
}

/** Adds tags in order; duplicates (ignoring case) are skipped. */
export async function addTagsAction(projectId: string, texts: string[]) {
  for (const text of texts) await addProjectTag(projectId, text);
  refresh();
}

export async function removeTagAction(projectId: string, text: string) {
  await removeProjectTag(projectId, text);
  refresh();
}
