import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { getThumbnailDraft, thumbnailFilePath } from "@/db";
import { THUMBNAIL_TYPES, type ThumbnailExt } from "@/lib/thumbnails";

/**
 * Serves a thumbnail draft's image; with `?download`, as a download under
 * its original name.
 */
export async function GET(
  request: Request,
  { params }: RouteContext<"/api/thumbnails/[draftId]">,
) {
  const { draftId } = await params;
  const draft = await getThumbnailDraft(draftId);
  if (!draft) return new Response("Not found", { status: 404 });
  const filePath = thumbnailFilePath(draft);
  const info = await stat(filePath).catch(() => undefined);
  if (!info) return new Response("Not found", { status: 404 });

  const name = encodeURIComponent(draft.originalName);
  const download = new URL(request.url).searchParams.has("download");
  return new Response(
    Readable.toWeb(createReadStream(filePath)) as ReadableStream,
    {
      headers: {
        "Content-Type": THUMBNAIL_TYPES[draft.ext as ThumbnailExt],
        "Content-Length": String(info.size),
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${name}`,
        // A draft's file never changes; a new upload gets a new ID.
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    },
  );
}
