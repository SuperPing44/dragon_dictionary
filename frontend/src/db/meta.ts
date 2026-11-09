import { eq } from "drizzle-orm";
import {
  DEFAULT_SCRIPT_VIEW,
  isScriptView,
  type ScriptView,
} from "@/lib/script-view";
import {
  DEFAULT_SPEED_LEVEL,
  DEFAULT_TEXT_SIZE,
  isValidSpeedLevel,
  isValidTextSize,
} from "@/lib/teleprompter";
import type { Db } from "./connection";
import { appMeta } from "./schema";

export const DEFAULT_SPEAKING_RATE = 150;
export const MIN_SPEAKING_RATE = 60;
export const MAX_SPEAKING_RATE = 300;

const RATE_KEY = "speaking_rate";

export function getMeta(db: Db, key: string): string | undefined {
  return db.select().from(appMeta).where(eq(appMeta.key, key)).get()?.value;
}

export function setMeta(db: Db, key: string, value: string): void {
  db.insert(appMeta)
    .values({ key, value })
    .onConflictDoUpdate({ target: appMeta.key, set: { value } })
    .run();
}

/** Words per minute for the speaking-time estimate (150 unless changed). */
export function getSpeakingRate(db: Db): number {
  const stored = Number(getMeta(db, RATE_KEY));
  return isValidSpeakingRate(stored) ? stored : DEFAULT_SPEAKING_RATE;
}

export function isValidSpeakingRate(rate: number): boolean {
  return (
    Number.isInteger(rate) &&
    rate >= MIN_SPEAKING_RATE &&
    rate <= MAX_SPEAKING_RATE
  );
}

/** Sets the rate; it must be a whole number from 60 to 300. */
export function setSpeakingRate(db: Db, rate: number): void {
  if (!isValidSpeakingRate(rate)) {
    throw new Error(
      `The rate must be a whole number from ${MIN_SPEAKING_RATE} to ${MAX_SPEAKING_RATE}.`,
    );
  }
  setMeta(db, RATE_KEY, String(rate));
}

const SPEED_KEY = "teleprompter_speed_level";
const SIZE_KEY = "teleprompter_text_size";

export type TeleprompterSettings = { speedLevel: number; textSize: number };

/** The teleprompter's speed level and text size, remembered app-wide. */
export function getTeleprompterSettings(db: Db): TeleprompterSettings {
  const speed = Number(getMeta(db, SPEED_KEY));
  const size = Number(getMeta(db, SIZE_KEY));
  return {
    speedLevel: isValidSpeedLevel(speed) ? speed : DEFAULT_SPEED_LEVEL,
    textSize: isValidTextSize(size) ? size : DEFAULT_TEXT_SIZE,
  };
}

/** Sets the speed level: a whole number from 1 to 20. */
export function setTeleprompterSpeedLevel(db: Db, level: number): void {
  if (!isValidSpeedLevel(level)) {
    throw new Error("The speed level must be a whole number from 1 to 20.");
  }
  setMeta(db, SPEED_KEY, String(level));
}

/** Sets the text size: 32 to 96 px, in steps of 4. */
export function setTeleprompterTextSize(db: Db, size: number): void {
  if (!isValidTextSize(size)) {
    throw new Error("The text size must be 32 to 96 px, in steps of 4.");
  }
  setMeta(db, SIZE_KEY, String(size));
}

const FOOTER_KEY = "description_footer";

/** The description footer added to every project's copied description. */
export function getDescriptionFooter(db: Db): string {
  return getMeta(db, FOOTER_KEY) ?? "";
}

/** Sets the footer; plain text, empty allowed. */
export function setDescriptionFooter(db: Db, footer: string): void {
  setMeta(db, FOOTER_KEY, footer);
}

const SCRIPT_VIEW_KEY = "script_view";

/** The Script tab's view last used, in any project ("sections" at first). */
export function getScriptView(db: Db): ScriptView {
  const stored = getMeta(db, SCRIPT_VIEW_KEY);
  return isScriptView(stored) ? stored : DEFAULT_SCRIPT_VIEW;
}

/** Remembers the Script tab's view: "sections" or "full". */
export function setScriptView(db: Db, view: ScriptView): void {
  if (!isScriptView(view)) {
    throw new Error('The script view must be "sections" or "full".');
  }
  setMeta(db, SCRIPT_VIEW_KEY, view);
}
