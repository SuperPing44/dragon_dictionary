import { eq } from "drizzle-orm";
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
