import { beforeEach, describe, expect, it } from "vitest";
import { type Db, openDb } from "./connection";
import { getSpeakingRate, setSpeakingRate } from "./meta";

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
