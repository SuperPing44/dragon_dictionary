"use server";

import { refresh } from "next/cache";
import { backUpNow } from "@/db";

export async function backUpNowAction() {
  const result = await backUpNow();
  refresh();
  return result.ok;
}
