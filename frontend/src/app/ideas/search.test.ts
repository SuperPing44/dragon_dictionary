import { describe, expect, it } from "vitest";
import { ideaHref, parseIdeaSearch } from "./search";

describe("parseIdeaSearch", () => {
  it("defaults to rating with nothing selected", () => {
    expect(parseIdeaSearch({})).toEqual({ sort: "rating", idea: undefined });
  });

  it("reads a known sort and the selected idea", () => {
    expect(parseIdeaSearch({ sort: "title", idea: "abc" })).toEqual({
      sort: "title",
      idea: "abc",
    });
  });

  it("ignores an unknown sort", () => {
    expect(parseIdeaSearch({ sort: "random" }).sort).toBe("rating");
  });
});

describe("ideaHref", () => {
  it("leaves defaults out", () => {
    expect(ideaHref({ sort: "rating" })).toBe("/ideas");
  });

  it("keeps sort and selection", () => {
    expect(ideaHref({ sort: "newest", idea: "abc" })).toBe(
      "/ideas?sort=newest&idea=abc",
    );
  });
});
