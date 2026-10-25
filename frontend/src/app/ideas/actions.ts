"use server";

import { refresh } from "next/cache";
import { createIdea } from "@/db";

export async function captureIdea(formData: FormData) {
  const title = formData.get("title");
  if (typeof title !== "string") return;
  if (await createIdea(title)) refresh();
}
