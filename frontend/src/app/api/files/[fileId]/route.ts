import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { getSourceFile, sourceFilePath } from "@/db";

/** Serves a PDF inline, so it opens in the browser's built-in viewer. */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/files/[fileId]">,
) {
  const { fileId } = await params;
  const file = await getSourceFile(fileId);
  if (!file) return new Response("Not found", { status: 404 });
  const filePath = sourceFilePath(file);
  const info = await stat(filePath).catch(() => undefined);
  if (!info) return new Response("Not found", { status: 404 });

  const name = encodeURIComponent(file.originalName);
  return new Response(
    Readable.toWeb(createReadStream(filePath)) as ReadableStream,
    {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(info.size),
        "Content-Disposition": `inline; filename*=UTF-8''${name}`,
        "Cache-Control": "private, no-store",
      },
    },
  );
}
