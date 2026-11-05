import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MAX_THUMBNAIL_BYTES } from "@/lib/thumbnails";
import { type Db, openDb } from "./connection";
import { createIdea } from "./ideas";
import {
  deleteVideoProject,
  getVideoProject,
  makeVideoProject,
} from "./projects";
import {
  addThumbnailDraft,
  listThumbnailDrafts,
  markThumbnailFinal,
  NotAnImageError,
  readUpload,
  removeProjectThumbnails,
  removeThumbnailDraft,
  setThumbnailNote,
  TooLargeError,
  thumbnailPath,
} from "./thumbnails";

let db: Db;
let root: string;
let projectId: string;
let clock: number;
const tick = () => new Date(Date.UTC(2026, 10, 1) + clock++ * 60_000);

function png(width: number, height: number): Buffer {
  const b = Buffer.alloc(64);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b, 0);
  b.write("IHDR", 12, "latin1");
  b.writeUInt32BE(width, 16);
  b.writeUInt32BE(height, 20);
  return b;
}

beforeEach(() => {
  db = openDb(":memory:");
  root = mkdtempSync(path.join(tmpdir(), "dd-thumbs-"));
  clock = 0;
  projectId =
    makeVideoProject(db, createIdea(db, "Ragnarök")?.id ?? "")?.id ?? "";
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

const upload = (id: string, name = `${id}.png`, bytes = png(1920, 1080)) =>
  addThumbnailDraft(
    db,
    root,
    { id, videoProject: projectId, originalName: name },
    bytes,
    tick(),
  );

describe("uploading", () => {
  it("stores the file and records its type, size and pixel size", async () => {
    const draft = await upload("d1", "red title.png");
    expect(draft).toMatchObject({
      originalName: "red title.png",
      ext: "png",
      size: 64,
      width: 1920,
      height: 1080,
      note: null,
    });
    const file = thumbnailPath(root, draft);
    expect(file).toBe(path.join(root, "thumbnails", projectId, "d1.png"));
    expect(existsSync(file)).toBe(true);
    expect(existsSync(`${file}.part`)).toBe(false);
  });

  it("refuses anything that isn't an image, leaving no file", async () => {
    await expect(
      upload("d1", "a.pdf", Buffer.from("%PDF-1.7 ...")),
    ).rejects.toThrow(NotAnImageError);
    expect(existsSync(path.join(root, "thumbnails"))).toBe(false);
  });

  it("refuses a body over 20 MB while reading it", async () => {
    const big = Buffer.alloc(MAX_THUMBNAIL_BYTES + 1);
    await expect(readUpload(Readable.from([big]))).rejects.toThrow(
      TooLargeError,
    );
    const ok = await readUpload(Readable.from([png(10, 10), Buffer.alloc(5)]));
    expect(ok.length).toBe(69);
  });

  it("lists drafts in upload order, with no duplicate check", async () => {
    await upload("b");
    await upload("a");
    await upload("c", "b.png");
    expect(listThumbnailDrafts(db, projectId).map((d) => d.id)).toEqual([
      "b",
      "a",
      "c",
    ]);
  });
});

describe("final and notes", () => {
  it("marks at most one draft final, and moving it is allowed", async () => {
    await upload("d1");
    await upload("d2");
    markThumbnailFinal(db, projectId, "d1");
    expect(getVideoProject(db, projectId)?.finalThumbnail).toBe("d1");
    markThumbnailFinal(db, projectId, "d2");
    expect(getVideoProject(db, projectId)?.finalThumbnail).toBe("d2");
  });

  it("won't mark another project's draft", async () => {
    await upload("d1");
    const other =
      makeVideoProject(db, createIdea(db, "Loki")?.id ?? "")?.id ?? "";
    expect(() => markThumbnailFinal(db, other, "d1")).toThrow();
  });

  it("keeps a one-line note, and removes a blank one", async () => {
    await upload("d1");
    setThumbnailNote(db, "d1", "  red title,\n Fenrir close-up ");
    expect(listThumbnailDrafts(db, projectId)[0].note).toBe(
      "red title, Fenrir close-up",
    );
    setThumbnailNote(db, "d1", "   ");
    expect(listThumbnailDrafts(db, projectId)[0].note).toBeNull();
  });
});

describe("deleting", () => {
  it("removes the record and the file, and clears the final", async () => {
    const draft = await upload("d1");
    await upload("d2");
    markThumbnailFinal(db, projectId, "d1");

    await removeThumbnailDraft(db, root, "d1");

    expect(listThumbnailDrafts(db, projectId).map((d) => d.id)).toEqual(["d2"]);
    expect(existsSync(thumbnailPath(root, draft))).toBe(false);
    expect(getVideoProject(db, projectId)?.finalThumbnail).toBeNull();
  });

  it("removes a deleted project's files", async () => {
    const draft = await upload("d1");
    deleteVideoProject(db, projectId);
    await removeProjectThumbnails(root, projectId);
    expect(listThumbnailDrafts(db, projectId)).toEqual([]);
    expect(existsSync(thumbnailPath(root, draft))).toBe(false);
  });
});
