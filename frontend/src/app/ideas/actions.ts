"use server";

import { refresh } from "next/cache";
import {
  addIdeaCategory,
  type CategoryColour,
  createIdea,
  deleteIdea,
  removeIdeaCategory,
  updateIdea,
} from "@/db";
import type { IdeaChanges } from "@/db/ideas";

export async function captureIdea(title: string) {
  if (await createIdea(title)) refresh();
}

export async function saveIdea(id: string, changes: IdeaChanges) {
  await updateIdea(id, changes);
  refresh();
}

export async function removeIdea(id: string) {
  await deleteIdea(id);
  refresh();
}

export async function addCategory(
  ideaId: string,
  pick: { categoryId: string } | { name: string; colour: CategoryColour },
) {
  await addIdeaCategory(ideaId, pick);
  refresh();
}

export async function removeCategory(ideaId: string, categoryId: string) {
  await removeIdeaCategory(ideaId, categoryId);
  refresh();
}
