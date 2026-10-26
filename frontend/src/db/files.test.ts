import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type Db, openDb } from "./connection";
import {
  addSourceFile,
  filePath,
  listSourceFiles,
  NotAPdfError,
  removeSourceFile,
  sourceDir,
  storeUpload,
} from "./files";
import { createSource, deleteSource, getSource } from "./sources";

let db: Db;
let root: string;
let sourceId: string;

const pdf = (body = "rest of the file") => Buffer.from(`%PDF-1.7\n${body}`);
/** A stream that yields the bytes in small pieces, like a real upload. */
const chunked = (bytes: Buffer, size = 3) =>
  Readable.from(
    Array.from({ length: Math.ceil(bytes.length / size) }, (_, i) =>
      bytes.subarray(i * size, (i + 1) * size),
    ),
  );

beforeEach(() => {
  db = openDb(":memory:");
  root = mkdtempSync(path.join(tmpdir(), "dragon-files-"));
  sourceId = createSource(db, {
    type: "pdf",
    title: "Gylfaginning (scan)",
    author: null,
    link: null,
    publisher: null,
    date: null,
    note: null,
  }).id;
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("storeUpload", () => {
  it("streams a PDF to files/<source>/<file>.pdf and returns its size", async () => {
    const bytes = pdf("x".repeat(10_000));
    const size = await storeUpload(root, sourceId, "f1", chunked(bytes, 7));
    expect(size).toBe(bytes.length);
    expect(readFileSync(filePath(root, sourceId, "f1"))).toEqual(bytes);
    expect(readdirSync(sourceDir(root, sourceId))).toEqual(["f1.pdf"]);
  });

  it("refuses anything that isn't a PDF and leaves nothing behind", async () => {
    await expect(
      storeUpload(
        root,
        sourceId,
        "f2",
        chunked(Buffer.from("PK\u0003\u0004docx")),
      ),
    ).rejects.toBeInstanceOf(NotAPdfError);
    expect(readdirSync(sourceDir(root, sourceId))).toEqual([]);
  });

  it("refuses an empty or too short upload", async () => {
    await expect(
      storeUpload(root, sourceId, "f3", chunked(Buffer.from("%PD"))),
    ).rejects.toBeInstanceOf(NotAPdfError);
    await expect(
      storeUpload(root, sourceId, "f4", Readable.from([])),
    ).rejects.toBeInstanceOf(NotAPdfError);
    expect(readdirSync(sourceDir(root, sourceId))).toEqual([]);
  });
});

describe("source files", () => {
  it("lists PDFs in upload order", () => {
    addSourceFile(
      db,
      { id: "b", source: sourceId, originalName: "second.pdf", size: 2 },
      new Date(2),
    );
    addSourceFile(
      db,
      { id: "a", source: sourceId, originalName: "first.pdf", size: 1 },
      new Date(1),
    );
    expect(listSourceFiles(db, sourceId).map((f) => f.originalName)).toEqual([
      "first.pdf",
      "second.pdf",
    ]);
  });

  it("removes a PDF's record and file", async () => {
    await storeUpload(root, sourceId, "f1", chunked(pdf()));
    addSourceFile(db, {
      id: "f1",
      source: sourceId,
      originalName: "a.pdf",
      size: 1,
    });
    await removeSourceFile(db, root, "f1");
    expect(listSourceFiles(db, sourceId)).toEqual([]);
    expect(existsSync(filePath(root, sourceId, "f1"))).toBe(false);
  });

  it("deleting a source removes its records, then its PDFs on disk", async () => {
    await storeUpload(root, sourceId, "f1", chunked(pdf()));
    addSourceFile(db, {
      id: "f1",
      source: sourceId,
      originalName: "a.pdf",
      size: 1,
    });

    await deleteSource(db, sourceId, root);

    expect(getSource(db, sourceId)).toBeUndefined();
    expect(listSourceFiles(db, sourceId)).toEqual([]);
    expect(existsSync(sourceDir(root, sourceId))).toBe(false);
  });

  it("keeps the PDFs when the database delete fails", async () => {
    await storeUpload(root, sourceId, "f1", chunked(pdf()));
    addSourceFile(db, {
      id: "f1",
      source: sourceId,
      originalName: "a.pdf",
      size: 1,
    });
    db.$client.close();

    await expect(deleteSource(db, sourceId, root)).rejects.toThrow();
    expect(existsSync(filePath(root, sourceId, "f1"))).toBe(true);
  });
});
