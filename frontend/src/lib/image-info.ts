// Server-side: reads image headers with Node's Buffer.
import type { ThumbnailExt } from "./thumbnails";

export type ImageInfo = { ext: ThumbnailExt; width: number; height: number };

/**
 * Reads an image's type and pixel size from its bytes: PNG, JPEG, WebP or
 * GIF. Returns undefined for anything else, or a file too broken to read.
 */
export function readImageInfo(bytes: Uint8Array): ImageInfo | undefined {
  const b = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (b.length < 12) return undefined;

  // PNG: signature, then the IHDR chunk with width and height.
  if (b.subarray(0, 8).equals(PNG_SIGNATURE)) {
    if (b.length < 24 || b.toString("latin1", 12, 16) !== "IHDR") return;
    return sized("png", b.readUInt32BE(16), b.readUInt32BE(20));
  }

  // GIF: "GIF87a" or "GIF89a", then the logical screen size.
  const gif = b.toString("latin1", 0, 6);
  if (gif === "GIF87a" || gif === "GIF89a") {
    return sized("gif", b.readUInt16LE(6), b.readUInt16LE(8));
  }

  // WebP: a RIFF container holding a VP8, VP8L or VP8X chunk.
  if (
    b.toString("latin1", 0, 4) === "RIFF" &&
    b.toString("latin1", 8, 12) === "WEBP"
  ) {
    return readWebp(b);
  }

  // JPEG: SOI, then segments up to a start-of-frame marker.
  if (b[0] === 0xff && b[1] === 0xd8) return readJpeg(b);

  return undefined;
}

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

function sized(
  ext: ThumbnailExt,
  width: number,
  height: number,
): ImageInfo | undefined {
  return width > 0 && height > 0 ? { ext, width, height } : undefined;
}

function readWebp(b: Buffer): ImageInfo | undefined {
  if (b.length < 30) return undefined;
  const chunk = b.toString("latin1", 12, 16);
  if (chunk === "VP8X") {
    // 24-bit canvas width and height, each stored minus one.
    return sized("webp", b.readUIntLE(24, 3) + 1, b.readUIntLE(27, 3) + 1);
  }
  if (chunk === "VP8L") {
    if (b[20] !== 0x2f) return undefined;
    const bits = b.readUInt32LE(21);
    return sized("webp", (bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1);
  }
  if (chunk === "VP8 ") {
    // A key frame: start code 9d 01 2a, then 14-bit width and height.
    if (b[23] !== 0x9d || b[24] !== 0x01 || b[25] !== 0x2a) return undefined;
    return sized(
      "webp",
      b.readUInt16LE(26) & 0x3fff,
      b.readUInt16LE(28) & 0x3fff,
    );
  }
  return undefined;
}

/** Start-of-frame markers: C0–CF except DHT (C4), JPG (C8) and DAC (CC). */
function isStartOfFrame(marker: number): boolean {
  return (
    marker >= 0xc0 &&
    marker <= 0xcf &&
    marker !== 0xc4 &&
    marker !== 0xc8 &&
    marker !== 0xcc
  );
}

function readJpeg(b: Buffer): ImageInfo | undefined {
  let i = 2;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) return undefined;
    const marker = b[i + 1];
    // Fill bytes, and markers without a length.
    if (marker === 0xff) {
      i += 1;
      continue;
    }
    if (
      marker === 0xd8 ||
      marker === 0x01 ||
      (marker >= 0xd0 && marker <= 0xd7)
    ) {
      i += 2;
      continue;
    }
    if (marker === 0xd9 || marker === 0xda) return undefined;
    const length = b.readUInt16BE(i + 2);
    if (isStartOfFrame(marker)) {
      if (i + 9 > b.length) return undefined;
      return sized("jpg", b.readUInt16BE(i + 7), b.readUInt16BE(i + 5));
    }
    i += 2 + length;
  }
  return undefined;
}
