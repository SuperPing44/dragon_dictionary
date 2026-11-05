import { describe, expect, it } from "vitest";
import { readImageInfo } from "./image-info";
import {
  indexAfterDelete,
  pastedImageName,
  stepDraft,
  thumbnailRefusal,
  thumbnailWarning,
} from "./thumbnails";

function png(width: number, height: number): Buffer {
  const b = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b, 0);
  b.writeUInt32BE(13, 8);
  b.write("IHDR", 12, "latin1");
  b.writeUInt32BE(width, 16);
  b.writeUInt32BE(height, 20);
  return b;
}

function gif(width: number, height: number): Buffer {
  const b = Buffer.alloc(13);
  b.write("GIF89a", 0, "latin1");
  b.writeUInt16LE(width, 6);
  b.writeUInt16LE(height, 8);
  return b;
}

function jpeg(width: number, height: number): Buffer {
  const app0 = Buffer.from([
    0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00,
    0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
  ]);
  const sof = Buffer.alloc(19);
  sof.writeUInt16BE(0xffc2, 0); // progressive
  sof.writeUInt16BE(17, 2);
  sof[4] = 8;
  sof.writeUInt16BE(height, 5);
  sof.writeUInt16BE(width, 7);
  return Buffer.concat([Buffer.from([0xff, 0xd8]), app0, sof]);
}

function webp(chunk: "VP8X" | "VP8L" | "VP8 ", w: number, h: number) {
  const b = Buffer.alloc(40);
  b.write("RIFF", 0, "latin1");
  b.writeUInt32LE(32, 4);
  b.write("WEBP", 8, "latin1");
  b.write(chunk, 12, "latin1");
  if (chunk === "VP8X") {
    b.writeUIntLE(w - 1, 24, 3);
    b.writeUIntLE(h - 1, 27, 3);
  } else if (chunk === "VP8L") {
    b[20] = 0x2f;
    b.writeUInt32LE(((h - 1) << 14) | (w - 1), 21);
  } else {
    b[23] = 0x9d;
    b[24] = 0x01;
    b[25] = 0x2a;
    b.writeUInt16LE(w, 26);
    b.writeUInt16LE(h, 28);
  }
  return b;
}

describe("readImageInfo", () => {
  it("reads PNG, GIF and JPEG sizes", () => {
    expect(readImageInfo(png(1920, 1080))).toEqual({
      ext: "png",
      width: 1920,
      height: 1080,
    });
    expect(readImageInfo(gif(640, 360))).toEqual({
      ext: "gif",
      width: 640,
      height: 360,
    });
    expect(readImageInfo(jpeg(1280, 720))).toEqual({
      ext: "jpg",
      width: 1280,
      height: 720,
    });
  });

  it("reads all three kinds of WebP", () => {
    for (const kind of ["VP8X", "VP8L", "VP8 "] as const) {
      expect(readImageInfo(webp(kind, 1280, 720))).toEqual({
        ext: "webp",
        width: 1280,
        height: 720,
      });
    }
  });

  it("refuses anything else, and truncated files", () => {
    expect(readImageInfo(Buffer.from("%PDF-1.7 not an image"))).toBeUndefined();
    expect(readImageInfo(Buffer.from("<svg></svg>   "))).toBeUndefined();
    expect(readImageInfo(png(1920, 1080).subarray(0, 18))).toBeUndefined();
    expect(readImageInfo(jpeg(1280, 720).subarray(0, 22))).toBeUndefined();
    expect(readImageInfo(png(0, 0))).toBeUndefined();
  });
});

describe("thumbnailWarning", () => {
  it("is off for 16:9 images of at least 1280×720", () => {
    expect(thumbnailWarning(1280, 720)).toBe(false);
    expect(thumbnailWarning(1920, 1080)).toBe(false);
    expect(thumbnailWarning(3840, 2160)).toBe(false);
  });

  it("is on for other ratios and for small 16:9 images", () => {
    expect(thumbnailWarning(1080, 1080)).toBe(true);
    expect(thumbnailWarning(1920, 1200)).toBe(true);
    expect(thumbnailWarning(640, 360)).toBe(true);
  });
});

describe("thumbnailRefusal", () => {
  it("accepts the four types up to 20 MB", () => {
    for (const type of ["image/png", "image/jpeg", "image/webp", "image/gif"]) {
      expect(
        thumbnailRefusal({ name: "a", type, size: 20 * 1024 * 1024 }),
      ).toBeUndefined();
    }
  });

  it("refuses other types and larger files with a short hint", () => {
    expect(
      thumbnailRefusal({ name: "logo.svg", type: "image/svg+xml", size: 10 }),
    ).toBe("“logo.svg” isn’t a PNG, JPEG, WebP or GIF.");
    expect(
      thumbnailRefusal({
        name: "big.png",
        type: "image/png",
        size: 20 * 1024 * 1024 + 1,
      }),
    ).toBe("“big.png” is over 20 MB.");
  });
});

describe("enlarged view and paste", () => {
  it("names a pasted image by its local date and time", () => {
    const at = new Date(2026, 9, 27, 14, 32);
    expect(pastedImageName("image/png", at)).toBe("pasted-2026-10-27-1432.png");
    expect(pastedImageName("image/jpeg", new Date(2026, 0, 5, 9, 7))).toBe(
      "pasted-2026-01-05-0907.jpg",
    );
  });

  it("steps with ← / → and stops at the first and last draft", () => {
    expect(stepDraft(1, 1, 3)).toBe(2);
    expect(stepDraft(2, 1, 3)).toBe(2);
    expect(stepDraft(1, -1, 3)).toBe(0);
    expect(stepDraft(0, -1, 3)).toBe(0);
  });

  it("shows the next draft after a delete, the previous if it was last, or none", () => {
    expect(indexAfterDelete(1, 3)).toBe(1);
    expect(indexAfterDelete(3, 3)).toBe(2);
    expect(indexAfterDelete(0, 0)).toBe(-1);
  });
});
