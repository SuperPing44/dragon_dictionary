"use server";

import { refresh } from "next/cache";
import {
  addSection,
  addSubsection,
  removeSection,
  renameSubsection,
  reorderSections,
  type SectionKind,
  saveSectionContent,
  setSpeakingRate,
} from "@/db";

/**
 * Autosave: stores the text and returns its word count. Refreshing keeps the
 * header's total words and length current.
 */
export async function saveSection(sectionId: string, content: string) {
  const words = await saveSectionContent(sectionId, content);
  refresh();
  return words;
}

/** Sets the app-wide speaking rate (a whole number from 60 to 300). */
export async function setRateAction(rate: number) {
  await setSpeakingRate(rate);
  refresh();
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

export async function addSubsectionAction(mainId: string) {
  const added = await addSubsection(mainId);
  refresh();
  return added.id;
}

export async function renameSubsectionAction(id: string, title: string) {
  await renameSubsection(id, title);
  refresh();
}

export async function reorderAction(
  projectId: string,
  parent: string | null,
  orderedIds: string[],
) {
  await reorderSections(projectId, parent, orderedIds);
  refresh();
}
