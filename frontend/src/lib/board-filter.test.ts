import { describe, expect, it } from "vitest";
import {
  isFiltering,
  matchesBoardFilter,
  NO_FILTER,
  placeAmongVisible,
} from "./board";

const card = (title: string, ...cats: string[]) => ({
  title,
  categories: cats.map((id) => ({ id })),
});

describe("matchesBoardFilter", () => {
  it("shows everything without a filter", () => {
    expect(matchesBoardFilter(card("Loki"), NO_FILTER)).toBe(true);
    expect(isFiltering(NO_FILTER)).toBe(false);
    expect(isFiltering({ query: "  ", cats: [] })).toBe(false);
  });

  it("searches titles, ignoring case, accents and surrounding spaces", () => {
    const f = (query: string) => ({ query, cats: [] });
    expect(matchesBoardFilter(card("Ragnarök: the end"), f(" ragnarok "))).toBe(
      true,
    );
    expect(matchesBoardFilter(card("Ragnarök"), f("RÖK"))).toBe(true);
    expect(matchesBoardFilter(card("Fenrir"), f("loki"))).toBe(false);
    expect(isFiltering(f("loki"))).toBe(true);
  });

  it("shows a card with any picked category", () => {
    const f = { query: "", cats: ["norse", "pop"] };
    expect(matchesBoardFilter(card("A", "pop"), f)).toBe(true);
    expect(matchesBoardFilter(card("B", "norse", "greek"), f)).toBe(true);
    expect(matchesBoardFilter(card("C", "greek"), f)).toBe(false);
    expect(matchesBoardFilter(card("D"), f)).toBe(false);
  });

  it("needs both the search and a category when both are set", () => {
    const f = { query: "loki", cats: ["norse"] };
    expect(matchesBoardFilter(card("Loki", "norse"), f)).toBe(true);
    expect(matchesBoardFilter(card("Loki", "pop"), f)).toBe(false);
    expect(matchesBoardFilter(card("Odin", "norse"), f)).toBe(false);
  });
});

describe("placeAmongVisible", () => {
  // The column reads A, h1, B, h2, C; h1 and h2 are hidden by the filter.
  const column = ["A", "h1", "B", "h2", "C"];
  const visible = ["A", "B", "C"];

  it("goes right before the visible card it's dropped on", () => {
    expect(placeAmongVisible(column, visible, "C", "B")).toBe("B");
  });

  it("at the end goes right after the last visible card, before hidden ones", () => {
    const col = ["A", "B", "h1", "C", "h2"];
    expect(placeAmongVisible(col, visible, "A", null)).toBe("h2");
    expect(placeAmongVisible(col, visible, "C", null)).toBe("h1");
  });

  it("goes to the very end when the last visible card is last", () => {
    expect(placeAmongVisible(column, visible, "A", null)).toBe(null);
  });

  it("goes to the end when no other card is visible", () => {
    expect(placeAmongVisible(["h1", "A", "h2"], ["A"], "A", null)).toBe(null);
  });
});
