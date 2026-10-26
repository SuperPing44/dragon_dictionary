"use server";

import { refresh, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { CategoryPick } from "@/components/category-picker";
import {
  addProjectCategory,
  deleteVideoProject,
  linkSource,
  removeProjectCategory,
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
