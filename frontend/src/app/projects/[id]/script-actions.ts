"use server";

import { refresh } from "next/cache";
import {
  addSection,
  removeSection,
  type SectionKind,
  saveSectionContent,
} from "@/db";

/** Autosave: stores the text and returns its word count. */
export async function saveSection(sectionId: string, content: string) {
  return saveSectionContent(sectionId, content);
}

export async function addSectionAction(projectId: string, kind: SectionKind) {
  const added = await addSection(projectId, kind);
  refresh();
  return added.id;
}

export async function removeSectionAction(sectionId: string) {
  await removeSection(sectionId);
  refresh();
}
