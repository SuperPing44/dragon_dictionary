import path from "node:path";
import { Readable } from "node:stream";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import { NotAnImageError, TooLargeError, uploadThumbnailDraft } from "@/db";

/**
 * Uploads one thumbnail draft to a project. The raw image is the request
 * body (Server Actions cap at 1 MB) and its original name is in the
 * X-File-Name header, URI-encoded.
 */
export async function POST(
  request: Request,
  { params }: RouteContext<"/api/projects/[id]/thumbnails">,
) {
  const { id } = await params;
  if (!request.body) {
    return Response.json({ error: "No file was sent." }, { status: 400 });
  }
  const name = originalName(request.headers.get("x-file-name"));
  try {
    const draft = await uploadThumbnailDraft(
      id,
      name,
      Readable.fromWeb(request.body as WebReadableStream<Uint8Array>),
    );
    if (!draft) {
      return Response.json({ error: "No such project." }, { status: 404 });
    }
    return Response.json(draft, { status: 201 });
  } catch (error) {
    if (error instanceof NotAnImageError) {
      return Response.json(
        { error: `“${name}” isn’t a PNG, JPEG, WebP or GIF.` },
        { status: 415 },
      );
    }
    if (error instanceof TooLargeError) {
      return Response.json(
        { error: `“${name}” is over 20 MB.` },
        { status: 413 },
      );
    }
    throw error;
  }
}

/** The file's own name, without any folder part. */
function originalName(header: string | null): string {
  let name = "thumbnail";
  try {
    name = header ? decodeURIComponent(header) : name;
  } catch {
    // Keep the default for a malformed header.
  }
  return (
    path.basename(name.replaceAll("\\", "/")).trim().slice(0, 200) ||
    "thumbnail"
  );
}
