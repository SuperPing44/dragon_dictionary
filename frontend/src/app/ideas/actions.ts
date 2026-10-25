"use server";

import { refresh } from "next/cache";
import { createIdea, deleteIdea, updateIdea } from "@/db";
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
