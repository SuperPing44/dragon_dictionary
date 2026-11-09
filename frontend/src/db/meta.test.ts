import { beforeEach, describe, expect, it } from "vitest";
import { type Db, openDb } from "./connection";
import {
  getDescriptionFooter,
  getScriptView,
  getSpeakingRate,
  getTeleprompterSettings,
  setDescriptionFooter,
  setMeta,
  setScriptView,
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

describe("description footer", () => {
  it("is empty by default", () => {
    expect(getDescriptionFooter(db)).toBe("");
  });

  it("keeps multi-line text as typed, and can be emptied again", () => {
    const footer = [
      "Forest Dragon — myths and legends.",
      "Subscribe: https://www.youtube.com/@ForestDragon",
      "",
    ].join("\n");
    setDescriptionFooter(db, footer);
    expect(getDescriptionFooter(db)).toBe(footer);
    setDescriptionFooter(db, "");
    expect(getDescriptionFooter(db)).toBe("");
  });
});

describe("script view", () => {
  it("is Sections the very first time", () => {
    expect(getScriptView(db)).toBe("sections");
  });

  it("remembers the view last used", () => {
    setScriptView(db, "full");
    expect(getScriptView(db)).toBe("full");
    setScriptView(db, "sections");
    expect(getScriptView(db)).toBe("sections");
  });

  it("rejects anything else, and reads an unknown stored value as Sections", () => {
    // @ts-expect-error: not a view
    expect(() => setScriptView(db, "pages")).toThrow();
    expect(getScriptView(db)).toBe("sections");
    setMeta(db, "script_view", "pages");
    expect(getScriptView(db)).toBe("sections");
  });
});
