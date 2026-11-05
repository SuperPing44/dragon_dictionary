import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { type Db, migrateDb, openDb } from "./connection";
import { createIdea } from "./ideas";
import {
  deleteVideoProject,
  getVideoProject,
  makeVideoProject,
  updateVideoProject,
} from "./projects";
import {
  brollItem,
  projectTag,
  thumbnailDraft,
  titleOption,
  videoProject,
} from "./schema";
import { undoNewestMigration } from "./test-migrations";

let db: Db;

beforeEach(() => {
  db = openDb(":memory:");
});

const newProject = (title: string) => {
  const ideaId = createIdea(db, title)?.id ?? "";
  const project = makeVideoProject(db, ideaId);
  if (!project) throw new Error("no project");
  return project.id;
};

describe("the 0.3.0 migration", () => {
  it("gives every existing project one title option, its title", () => {
    undoNewestMigration(db);
    db.$client.exec(`
      insert into video_project (id, title, stage, created, updated) values
        ('p1', 'Ragnarök: how the world ends', 'script', '2026-09-01T10:00:00.000Z', '2026-09-02T10:00:00.000Z'),
        ('p2', 'Loki before Marvel', 'research', '2026-09-03T10:00:00.000Z', '2026-09-03T10:00:00.000Z');
    `);

    migrateDb(db);

    const options = db.select().from(titleOption).all();
    expect(options).toHaveLength(2);
    expect(
      options.map(({ videoProject, text, position, created }) => ({
        videoProject,
        text,
        position,
        created,
      })),
    ).toEqual(
      expect.arrayContaining([
        {
          videoProject: "p1",
          text: "Ragnarök: how the world ends",
          position: 0,
          created: "2026-09-01T10:00:00.000Z",
        },
        {
          videoProject: "p2",
          text: "Loki before Marvel",
          position: 0,
          created: "2026-09-03T10:00:00.000Z",
        },
      ]),
    );
    expect(new Set(options.map((o) => o.id)).size).toBe(2);
  });

  it("starts the description and editing note empty, with no final thumbnail", () => {
    undoNewestMigration(db);
    db.$client.exec(`
      insert into video_project (id, title, stage, created, updated)
        values ('p1', 'Fenrir', 'research', '2026-09-01', '2026-09-01');
    `);

    migrateDb(db);

    expect(getVideoProject(db, "p1")).toMatchObject({
      description: "",
      editingNote: "",
      finalThumbnail: null,
    });
  });
});

describe("editing note", () => {
  it("is saved through updateVideoProject", () => {
    const id = newProject("Fenrir");
    updateVideoProject(db, id, { editingNote: "Cut the second take." });
    expect(getVideoProject(db, id)?.editingNote).toBe("Cut the second take.");
  });

  it("can be cleared", () => {
    const id = newProject("Fenrir");
    updateVideoProject(db, id, { editingNote: "Cut it." });
    updateVideoProject(db, id, { editingNote: "" });
    expect(getVideoProject(db, id)?.editingNote).toBe("");
  });
});

describe("deleting a video project", () => {
  it("removes its title options, tags, B-roll items and thumbnail drafts", () => {
    const id = newProject("Fenrir");
    const other = newProject("Loki");
    const stamp = new Date().toISOString();
    for (const project of [id, other]) {
      db.insert(titleOption)
        .values({
          id: `${project}-t`,
          videoProject: project,
          text: "A title",
          position: 0,
          created: stamp,
        })
        .run();
      db.insert(projectTag)
        .values({ videoProject: project, text: "norse", position: 0 })
        .run();
      db.insert(brollItem)
        .values({
          id: `${project}-b`,
          videoProject: project,
          text: "drone shot of a fjord",
          created: stamp,
        })
        .run();
      db.insert(thumbnailDraft)
        .values({
          id: `${project}-d`,
          videoProject: project,
          originalName: "thumb.png",
          ext: "png",
          size: 1000,
          width: 1280,
          height: 720,
          uploaded: stamp,
        })
        .run();
      db.update(videoProject)
        .set({ finalThumbnail: `${project}-d` })
        .where(eq(videoProject.id, project))
        .run();
    }

    deleteVideoProject(db, id);

    const owners = (rows: { videoProject: string }[]) =>
      rows.map((r) => r.videoProject);
    // The seed option from makeVideoProject plus the one added here.
    expect(owners(db.select().from(titleOption).all())).toEqual([other, other]);
    expect(owners(db.select().from(projectTag).all())).toEqual([other]);
    expect(owners(db.select().from(brollItem).all())).toEqual([other]);
    expect(owners(db.select().from(thumbnailDraft).all())).toEqual([other]);
    expect(getVideoProject(db, other)?.finalThumbnail).toBe(`${other}-d`);
  });

  it("clears the final thumbnail when that draft is deleted", () => {
    const id = newProject("Fenrir");
    db.insert(thumbnailDraft)
      .values({
        id: "d1",
        videoProject: id,
        originalName: "thumb.png",
        ext: "png",
        size: 1000,
        width: 1280,
        height: 720,
        uploaded: new Date().toISOString(),
      })
      .run();
    db.update(videoProject)
      .set({ finalThumbnail: "d1" })
      .where(eq(videoProject.id, id))
      .run();

    db.delete(thumbnailDraft).where(eq(thumbnailDraft.id, "d1")).run();

    expect(getVideoProject(db, id)?.finalThumbnail).toBeNull();
  });
});

describe("project tags", () => {
  it("are unique per project, ignoring case", () => {
    const id = newProject("Fenrir");
    db.insert(projectTag)
      .values({ videoProject: id, text: "Norse", position: 0 })
      .run();
    expect(() =>
      db
        .insert(projectTag)
        .values({ videoProject: id, text: "norse", position: 1 })
        .run(),
    ).toThrow();
  });
});
