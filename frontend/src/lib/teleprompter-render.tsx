import type { JSONContent } from "@tiptap/react";
import { renderToReactElement } from "@tiptap/static-renderer/pm/react";
import type { ReactNode } from "react";
import type { DocNode } from "./script";
import { scriptExtensions } from "./script-schema";

/**
 * An entry's text as React elements, read-only. A stage direction is a
 * small amber "◆ Image: …" pill that never splits across lines; its found
 * tick isn't shown, and emphasis around it doesn't change it.
 */
export function renderEntry(doc: DocNode): ReactNode {
  return renderToReactElement({
    content: doc as JSONContent,
    extensions: scriptExtensions,
    options: {
      nodeMapping: {
        stageDirection: ({ node }) => (
          <span className="mx-[0.15em] inline-block whitespace-nowrap rounded-[0.4em] border border-amber/30 px-[0.45em] py-[0.1em] align-middle font-normal not-italic text-[0.36em] text-amber/70 leading-normal">
            ◆ Image: {node.attrs.description}
          </span>
        ),
      },
    },
  });
}
