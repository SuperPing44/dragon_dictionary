import { describe, expect, it } from "vitest";
import { ideaHref, parseIdeaSearch, toggleCat } from "./search";

describe("parseIdeaSearch", () => {
  it("defaults to rating, nothing selected, no filter", () => {
    expect(parseIdeaSearch({})).toEqual({
      sort: "rating",
      idea: undefined,
      cats: [],
    });
  });

  it("reads a known sort, the selected idea and the filter", () => {
    expect(
      parseIdeaSearch({ sort: "title", idea: "abc", cat: ["c1", "c2", "c1"] }),
    ).toEqual({ sort: "title", idea: "abc", cats: ["c1", "c2"] });
  });

  it("accepts a single category", () => {
    expect(parseIdeaSearch({ cat: "c1" }).cats).toEqual(["c1"]);
  });

  it("ignores an unknown sort", () => {
    expect(parseIdeaSearch({ sort: "random" }).sort).toBe("rating");
  });
});

describe("ideaHref", () => {
  it("leaves defaults out", () => {
    expect(ideaHref({ sort: "rating", cats: [] })).toBe("/ideas");
  });

  it("keeps sort, filter and selection", () => {
    expect(ideaHref({ sort: "newest", idea: "abc", cats: ["c1", "c2"] })).toBe(
      "/ideas?sort=newest&cat=c1&cat=c2&idea=abc",
    );
  });
});

describe("toggleCat", () => {
  it("adds and removes a category", () => {
    expect(toggleCat(["a"], "b")).toEqual(["a", "b"]);
    expect(toggleCat(["a", "b"], "a")).toEqual(["b"]);
  });
});
