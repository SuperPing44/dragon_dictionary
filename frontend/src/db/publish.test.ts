import { beforeEach, describe, expect, it } from "vitest";
import { boardColumns } from "@/lib/board";
import {
  checkYouTubeLink,
  isIsoDate,
  localIsoDate,
  projectBackLink,
  publishPrefill,
} from "@/lib/publish";
import { type Db, migrateDb, openDb } from "./connection";
import { createIdea } from "./ideas";
import {
  getVideoProject,
  listVideoProjects,
  makeVideoProject,
  publishVideoProject,
  updateVideoProject,
} from "./projects";
import { undoNewestMigration } from "./test-migrations";

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

describe("the 0.5.0 migration", () => {
  it("adds an empty link and date, also to projects already published", () => {
    undoNewestMigration(db);
    db.$client.exec(`
      insert into video_project (id, title, stage, created, updated) values
        ('a', 'Old video', 'published', '2026-01-01', '2026-01-02'),
        ('b', 'In progress', 'script', '2026-01-01', '2026-01-02');
    `);
    migrateDb(db);
    expect(
      db.$client
        .prepare(
          "select id, youtube_link as link, published_on as date from video_project order by id",
        )
        .all(),
    ).toEqual([
      { id: "a", link: null, date: null },
      { id: "b", link: null, date: null },
    ]);
  });
});

describe("checkYouTubeLink", () => {
  it("accepts a blank link as no link yet", () => {
    expect(checkYouTubeLink("  ")).toEqual({
      ok: true,
      link: null,
      notYouTube: false,
    });
  });

  it("accepts YouTube links, trimmed", () => {
    for (const link of [
      "https://www.youtube.com/watch?v=abc",
      "https://youtu.be/abc",
      "http://m.youtube.com/watch?v=abc",
      "https://YouTube.com/@forestdragon",
    ]) {
      expect(checkYouTubeLink(` ${link} `)).toEqual({
        ok: true,
        link,
        notYouTube: false,
      });
    }
  });

  it("accepts other http(s) links with a hint", () => {
    expect(checkYouTubeLink("https://vimeo.com/948211370")).toMatchObject({
      ok: true,
      notYouTube: true,
    });
    expect(checkYouTubeLink("https://notyoutube.com/x")).toMatchObject({
      notYouTube: true,
    });
  });

  it("refuses anything that isn't an http(s) URL", () => {
    for (const text of [
      "youtube.com/watch?v=abc",
      "ftp://youtube.com/x",
      "javascript:alert(1)",
      "just words",
    ]) {
      expect(checkYouTubeLink(text).ok).toBe(false);
    }
  });
});

describe("dates", () => {
  it("knows real ISO dates", () => {
    expect(isIsoDate("2026-10-14")).toBe(true);
    expect(isIsoDate("2028-02-29")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("14.10.2026")).toBe(false);
    expect(isIsoDate("")).toBe(false);
  });

  it("gives today in local time", () => {
    expect(localIsoDate(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
  });

  it("prefills today, or the kept link and date", () => {
    const now = new Date(2026, 10, 6, 12);
    expect(
      publishPrefill({ youtubeLink: null, publishedOn: null }, now),
    ).toEqual({ link: "", date: "2026-11-06" });
    expect(
      publishPrefill(
        { youtubeLink: "https://youtu.be/x", publishedOn: "2026-10-14" },
        now,
      ),
    ).toEqual({ link: "https://youtu.be/x", date: "2026-10-14" });
  });
});

describe("publishing", () => {
  it("moves the project to Published with its link and date", () => {
    const id = make("Krampus");
    publishVideoProject(
      db,
      id,
      { youtubeLink: " https://youtu.be/k ", publishedOn: "2026-12-05" },
      tick(),
    );
    expect(getVideoProject(db, id)).toMatchObject({
      stage: "published",
      youtubeLink: "https://youtu.be/k",
      publishedOn: "2026-12-05",
    });
    expect(listVideoProjects(db)).toEqual([]);
  });

  it("allows no link yet and a future date", () => {
    const id = make("Krampus");
    publishVideoProject(
      db,
      id,
      { youtubeLink: "", publishedOn: "2099-01-01" },
      tick(),
    );
    expect(getVideoProject(db, id)).toMatchObject({
      youtubeLink: null,
      publishedOn: "2099-01-01",
    });
  });

  it("refuses a bad link or date and changes nothing", () => {
    const id = make("Krampus");
    expect(() =>
      publishVideoProject(db, id, {
        youtubeLink: "youtube.com/x",
        publishedOn: "2026-12-05",
      }),
    ).toThrow();
    expect(() =>
      publishVideoProject(db, id, { youtubeLink: "", publishedOn: "soon" }),
    ).toThrow();
    expect(getVideoProject(db, id)).toMatchObject({
      stage: "research",
      youtubeLink: null,
      publishedOn: null,
    });
  });

  it("keeps link and date when the project goes back to the board, on top", () => {
    const id = make("Krampus");
    make("Loki");
    publishVideoProject(
      db,
      id,
      { youtubeLink: "https://youtu.be/k", publishedOn: "2026-12-05" },
      tick(),
    );
    updateVideoProject(db, id, { stage: "research" }, tick());
    expect(getVideoProject(db, id)).toMatchObject({
      stage: "research",
      youtubeLink: "https://youtu.be/k",
      publishedOn: "2026-12-05",
    });
    expect(
      boardColumns(listVideoProjects(db))[0].cards.map((p) => p.title),
    ).toEqual(["Krampus", "Loki"]);
    // Publishing again starts from what was kept.
    const kept = getVideoProject(db, id) ?? {
      youtubeLink: null,
      publishedOn: null,
    };
    expect(publishPrefill(kept, new Date())).toEqual({
      link: "https://youtu.be/k",
      date: "2026-12-05",
    });
  });
});

describe("the published header", () => {
  const published = () => {
    const id = make("Krampus");
    publishVideoProject(
      db,
      id,
      { youtubeLink: "https://youtu.be/k", publishedOn: "2026-12-05" },
      tick(),
    );
    return id;
  };

  it("edits the date, and can clear it to No date", () => {
    const id = published();
    updateVideoProject(db, id, { publishedOn: "2026-12-24" }, tick());
    expect(getVideoProject(db, id)?.publishedOn).toBe("2026-12-24");
    updateVideoProject(db, id, { publishedOn: null }, tick());
    expect(getVideoProject(db, id)?.publishedOn).toBeNull();
    expect(() =>
      updateVideoProject(db, id, { publishedOn: "24.12.2026" }),
    ).toThrow();
  });

  it("edits the link, and can clear it", () => {
    const id = published();
    updateVideoProject(db, id, { youtubeLink: "https://vimeo.com/1" }, tick());
    expect(getVideoProject(db, id)?.youtubeLink).toBe("https://vimeo.com/1");
    updateVideoProject(db, id, { youtubeLink: "  " }, tick());
    expect(getVideoProject(db, id)?.youtubeLink).toBeNull();
    expect(() =>
      updateVideoProject(db, id, { youtubeLink: "not a link" }),
    ).toThrow();
    expect(getVideoProject(db, id)?.stage).toBe("published");
  });

  it("leads back to the Archive from a published project", () => {
    expect(projectBackLink("published")).toEqual({
      href: "/archive",
      label: "← Archive",
    });
    expect(projectBackLink("upload")).toEqual({
      href: "/projects",
      label: "← Video projects",
    });
  });
});
