import type { JSONContent } from "@tiptap/react";
import { renderToReactElement } from "@tiptap/static-renderer/pm/react";
import type { ReactNode } from "react";
import type { DocNode } from "./script";
import type { PrintEntry } from "./script-print";
import { scriptExtensions } from "./script-schema";

/**
 * An entry's text for print: paragraphs with bold, italic and underline,
 * and stage directions inline in grey italics as "[Image: …]".
 */
export function renderPrintText(doc: DocNode): ReactNode {
  return renderToReactElement({
    content: doc as JSONContent,
    extensions: scriptExtensions,
    options: {
      nodeMapping: {
        stageDirection: ({ node }) => {
          const description = String(node.attrs.description ?? "").trim();
          return (
            <span className="print-direction">
              {description ? `[Image: ${description}]` : "[Image]"}
            </span>
          );
        },
      },
    },
  });
}

/**
 * The Script PDF's content: the project title, then each entry under its
 * heading. Nothing else; the look (black on white, A4, page numbers) is in
 * globals.css under "Script PDF".
 */
export function PrintScript({
  title,
  entries,
}: {
  title: string;
  entries: PrintEntry[];
}) {
  return (
    <article className="print-sheet">
      <h1>{title}</h1>
      {entries.map((e) => (
        <section key={e.id}>
          {e.sub ? <h3>{e.heading}</h3> : <h2>{e.heading}</h2>}
          {e.doc && <div className="print-text">{renderPrintText(e.doc)}</div>}
        </section>
      ))}
    </article>
  );
}
