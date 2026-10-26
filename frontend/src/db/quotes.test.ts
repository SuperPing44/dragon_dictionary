import { beforeEach, describe, expect, it } from "vitest";
import { type Db, openDb } from "./connection";
import { addQuote, listQuotes, removeQuote, updateQuote } from "./quotes";
import { createSource, deleteSource } from "./sources";

let db: Db;
let sourceId: string;

beforeEach(() => {
  db = openDb(":memory:");
  sourceId = createSource(db, {
    type: "book",
    title: "The Poetic Edda",
    author: null,
    link: null,
    publisher: null,
    date: null,
    note: null,
  }).id;
});

describe("quotes", () => {
  it("adds quotes with an optional location, oldest first", () => {
    addQuote(
      db,
      sourceId,
      {
        text: "  “The sun turns black, earth sinks in the sea.”  ",
        location: " st. 57 ",
      },
      new Date(1),
    );
    addQuote(db, sourceId, { text: "Brothers shall fight." }, new Date(2));
    expect(listQuotes(db, sourceId).map((q) => [q.text, q.location])).toEqual([
      ["“The sun turns black, earth sinks in the sea.”", "st. 57"],
      ["Brothers shall fight.", null],
    ]);
  });

  it("keeps line breaks inside a quote", () => {
    const q = addQuote(db, sourceId, { text: "line one\nline two" });
    expect(q.text).toBe("line one\nline two");
  });

  it("edits text and location, clearing a blank location", () => {
    const q = addQuote(db, sourceId, { text: "old", location: "p. 4" });
    updateQuote(db, q.id, { text: "new", location: "  " });
    expect(listQuotes(db, sourceId)[0]).toMatchObject({
      text: "new",
      location: null,
    });
  });

  it("rejects a blank quote", () => {
    expect(() => addQuote(db, sourceId, { text: "  " })).toThrow();
    const q = addQuote(db, sourceId, { text: "kept" });
    expect(() => updateQuote(db, q.id, { text: "" })).toThrow();
    expect(listQuotes(db, sourceId)[0].text).toBe("kept");
  });

  it("removes a quote", () => {
    const q = addQuote(db, sourceId, { text: "gone" });
    removeQuote(db, q.id);
    expect(listQuotes(db, sourceId)).toEqual([]);
  });

  it("deleting a source deletes its quotes", async () => {
    addQuote(db, sourceId, { text: "goes with the source" });
    await deleteSource(db, sourceId, "unused-files-root");
    expect(db.$client.prepare("select count(*) as n from quote").get()).toEqual(
      { n: 0 },
    );
  });
});
