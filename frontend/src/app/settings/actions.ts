"use server";

import { refresh } from "next/cache";
import { setDescriptionFooter } from "@/db";

export async function saveDescriptionFooter(footer: string) {
  await setDescriptionFooter(footer);
  refresh();
}
