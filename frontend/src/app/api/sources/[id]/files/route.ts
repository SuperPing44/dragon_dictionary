import path from "node:path";
import { Readable } from "node:stream";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import { NotAPdfError, uploadSourceFile } from "@/db";

/**
 * Uploads one PDF to a source. The raw file is the request body (so files
 * of any size stream to disk; Server Actions cap at 1 MB) and its original
 * name is in the X-File-Name header, URI-encoded.
 */
export async function POST(
  request: Request,
  { params }: RouteContext<"/api/sources/[id]/files">,
) {
  const { id } = await params;
  if (!request.body) {
    return Response.json({ error: "No file was sent." }, { status: 400 });
  }
  const name = originalName(request.headers.get("x-file-name"));
  try {
    const file = await uploadSourceFile(
      id,
      name,
      Readable.fromWeb(request.body as WebReadableStream<Uint8Array>),
    );
    if (!file) {
      return Response.json({ error: "No such source." }, { status: 404 });
    }
    return Response.json(file, { status: 201 });
  } catch (error) {
    if (error instanceof NotAPdfError) {
      return Response.json(
        { error: `“${name}” isn’t a PDF. Only PDFs can be uploaded.` },
        { status: 415 },
      );
    }
    throw error;
  }
}

/** The file's own name, without any folder part, as shown in the list. */
function originalName(header: string | null): string {
  let name = "upload.pdf";
  try {
    name = header ? decodeURIComponent(header) : name;
  } catch {
    // Keep the default for a malformed header.
  }
  return (
    path.basename(name.replaceAll("\\", "/")).trim().slice(0, 200) ||
    "upload.pdf"
  );
}
