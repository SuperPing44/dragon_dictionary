import { beforeEach, describe, expect, it } from "vitest";
import { type Db, openDb } from "./connection";
import {
  getSpeakingRate,
  getTeleprompterSettings,
  setSpeakingRate,
  setTeleprompterSpeedLevel,
  setTeleprompterTextSize,
} from "./meta";

let db: Db;

beforeEach(() => {
  db = openDb(":memory:");
});

describe("speaking rate", () => {
  it("defaults to 150 wpm", () => {
    expect(getSpeakingRate(db)).toBe(150);
  });

  it("stores a new rate", () => {
    setSpeakingRate(db, 170);
    expect(getSpeakingRate(db)).toBe(170);
    setSpeakingRate(db, 60);
    setSpeakingRate(db, 300);
    expect(getSpeakingRate(db)).toBe(300);
  });

  it.each([59, 301, 150.5, Number.NaN, 0])("rejects %s", (rate) => {
    expect(() => setSpeakingRate(db, rate)).toThrow();
    expect(getSpeakingRate(db)).toBe(150);
  });
});

describe("teleprompter settings", () => {
  it("default to speed level 8 and 56 px", () => {
    expect(getTeleprompterSettings(db)).toEqual({
      speedLevel: 8,
      textSize: 56,
    });
  });

  it("store speed and size separately", () => {
    setTeleprompterSpeedLevel(db, 20);
    setTeleprompterTextSize(db, 32);
    expect(getTeleprompterSettings(db)).toEqual({
      speedLevel: 20,
      textSize: 32,
    });
    setTeleprompterSpeedLevel(db, 1);
    expect(getTeleprompterSettings(db).speedLevel).toBe(1);
  });

  it.each([0, 21, 2.5, Number.NaN])("rejects speed level %s", (level) => {
    expect(() => setTeleprompterSpeedLevel(db, level)).toThrow();
    expect(getTeleprompterSettings(db).speedLevel).toBe(8);
  });

  it.each([28, 100, 58, Number.NaN])("rejects text size %s", (size) => {
    expect(() => setTeleprompterTextSize(db, size)).toThrow();
    expect(getTeleprompterSettings(db).textSize).toBe(56);
  });
});
