"use server";

import { refresh } from "next/cache";
import {
  type CategoryColour,
  createCategory,
  deleteCategory,
  mergeCategory,
  type RenameResult,
  renameCategory,
  setCategoryColour,
} from "@/db";

export async function addCategory(name: string, colour: CategoryColour) {
  await createCategory(name, colour);
  refresh();
}

export async function recolourCategory(id: string, colour: CategoryColour) {
  await setCategoryColour(id, colour);
  refresh();
}

/** Renames, or reports the category whose name is already taken. */
export async function renameCategoryAction(
  id: string,
  name: string,
): Promise<RenameResult> {
  const result = await renameCategory(id, name);
  if (result.ok) refresh();
  return result;
}

export async function mergeCategoryAction(fromId: string, intoId: string) {
  await mergeCategory(fromId, intoId);
  refresh();
}

export async function removeCategoryAction(id: string) {
  await deleteCategory(id);
  refresh();
}
