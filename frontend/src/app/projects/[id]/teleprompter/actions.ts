"use server";

import { setTeleprompterSpeedLevel, setTeleprompterTextSize } from "@/db";

/** Remembers the speed level app-wide (a whole number from 1 to 20). */
export async function saveSpeedLevelAction(level: number) {
  await setTeleprompterSpeedLevel(level);
}

/** Remembers the text size app-wide (32 to 96 px, in steps of 4). */
export async function saveTextSizeAction(size: number) {
  await setTeleprompterTextSize(size);
}
