import { beforeEach, describe, expect, it } from "vitest";
import { archiveCountLine, formatPublishDate, shortLink } from "@/lib/format";
import { type Db, openDb } from "./connection";
import { createIdea } from "./ideas";
import {
  countArchive,
  countVideoProjects,
  listArchive,
  makeVideoProject,
  publishVideoProject,
  updateVideoProject,
} from "./projects";

let db: Db;
let clock: number;
const tick = () => new Date(Date.UTC(2026, 10, 1) + clock++ * 60_000);

beforeEach(() => {
  db = openDb(":memory:");
  clock = 0;
});

const make = (title: string) =>
  makeVideoProject(db, createIdea(db, title, tick())?.id ?? "", tick())?.id ??
  "";

const publish = (title: string, publishedOn: string | null) => {
  const id = make(title);
  if (publishedOn) {
    publishVideoProject(db, id, { youtubeLink: "", publishedOn }, tick());
  } else {
    // As after the 0.5.0 migration: published before dates existed.
    updateVideoProject(db, id, { stage: "published" }, tick());
  }
  return id;
};

describe("the archive", () => {
  it("lists published projects, newest date first, no date last", () => {
    publish("Old", "2025-09-03");
    publish("Undated A", null);
    publish("New", "2026-10-22");
    publish("Undated B", null);
    publish("Future", "2027-01-01");
    make("On the board");
    expect(listArchive(db).map((p) => p.title)).toEqual([
      "Future",
      "New",
      "Old",
      // Undated ones keep the most recently changed first.
      "Undated B",
      "Undated A",
    ]);
  });

  it("counts published projects apart from the board", () => {
    expect(countArchive(db)).toBe(0);
    publish("Krampus", "2026-12-05");
    publish("Hel", null);
    make("Loki");
    expect(countArchive(db)).toBe(2);
    expect(countVideoProjects(db)).toBe(1);
  });

  it("brings categories and word counts along", () => {
    publish("Krampus", "2026-12-05");
    expect(listArchive(db)[0]).toMatchObject({
      categories: [],
      wordCount: 0,
      sourceCount: 0,
    });
  });
});

describe("archive formatting", () => {
  it("shows publish dates like 1 Oct 2026, or No date", () => {
    expect(formatPublishDate("2026-10-01")).toBe("1 Oct 2026");
    expect(formatPublishDate("2026-12-31")).toBe("31 Dec 2026");
    expect(formatPublishDate(null)).toBe("No date");
  });

  it("shortens links for the row", () => {
    expect(shortLink("https://youtu.be/kR4mpU5x1Q")).toBe(
      "youtu.be/kR4mpU5x1Q",
    );
    expect(shortLink("https://www.youtube.com/watch?v=x")).toBe(
      "youtube.com/watch?v=x",
    );
    expect(shortLink("http://vimeo.com/1/")).toBe("vimeo.com/1");
  });

  it("counts the archive in the header", () => {
    expect(archiveCountLine(9)).toBe("9 published · newest first");
  });
});
