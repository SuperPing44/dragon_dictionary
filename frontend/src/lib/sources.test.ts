import { describe, expect, it } from "vitest";
import {
  isLink,
  isPartialDate,
  normalizeLink,
  validateSource,
} from "./sources";

describe("isPartialDate", () => {
  it.each([
    "1220",
    "1220-05",
    "1220-05-03",
    "2024-02-29",
    "0950",
  ])("accepts %s", (value) => {
    expect(isPartialDate(value)).toBe(true);
  });

  it.each([
    "",
    "122",
    "1220-5",
    "1220-13",
    "1220-00",
    "1220-05-3",
    "1220-02-30",
    "2023-02-29",
    "05/03/1220",
    "1220-05-03T00:00",
  ])("rejects %s", (value) => {
    expect(isPartialDate(value)).toBe(false);
  });
});

describe("isLink", () => {
  it("accepts http and https only", () => {
    expect(isLink("https://sacred-texts.com/neu/poe/poe03.htm")).toBe(true);
    expect(isLink("http://example.org")).toBe(true);
    expect(isLink("sacred-texts.com")).toBe(false);
    expect(isLink("ftp://example.org")).toBe(false);
  });
});

describe("normalizeLink", () => {
  it("ignores scheme, www, host case and a trailing slash", () => {
    const a = normalizeLink("https://www.Sacred-Texts.com/neu/poe/");
    expect(normalizeLink("http://sacred-texts.com/neu/poe")).toBe(a);
    expect(normalizeLink("  https://sacred-texts.com/neu/poe/  ")).toBe(a);
  });

  it("keeps paths and queries apart", () => {
    expect(normalizeLink("https://a.org/x")).not.toBe(
      normalizeLink("https://a.org/y"),
    );
    expect(normalizeLink("https://yt.com/watch?v=1")).not.toBe(
      normalizeLink("https://yt.com/watch?v=2"),
    );
  });
});

describe("validateSource", () => {
  it("trims and empties blank optional fields", () => {
    expect(
      validateSource({
        type: "book",
        title: "  The Poetic Edda ",
        author: " trans. Carolyne Larrington ",
        link: "  ",
        publisher: "",
        date: " 1996 ",
        note: "  ",
      }),
    ).toEqual({
      ok: true,
      values: {
        type: "book",
        title: "The Poetic Edda",
        author: "trans. Carolyne Larrington",
        link: null,
        publisher: null,
        date: "1996",
        note: null,
      },
    });
  });

  it("reports every problem at once", () => {
    expect(
      validateSource({
        type: "scroll",
        title: " ",
        link: "sacred-texts.com",
        date: "1220-13",
      }),
    ).toEqual({
      ok: false,
      errors: {
        type: expect.any(String),
        title: expect.any(String),
        link: expect.any(String),
        date: expect.any(String),
      },
    });
  });
});
