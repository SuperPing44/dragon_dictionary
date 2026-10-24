"use client";

// PROTOTYPE — throwaway. The `stageDirection` inline atom node from the editor
// research (#4), with one node view per variant.

import {
  type Editor,
  mergeAttributes,
  Node,
  NodeViewWrapper,
  nodeInputRule,
  ReactNodeViewRenderer,
  type ReactNodeViewProps,
} from "@tiptap/react";
import { useEffect, useRef, useState } from "react";

type Style = "chip" | "pill" | "marker";

export function makeStageDirection(style: Style) {
  return Node.create({
    name: "stageDirection",
    group: "inline",
    inline: true,
    atom: true,
    selectable: true,

    addAttributes() {
      return { description: { default: "" } };
    },

    parseHTML() {
      return [{ tag: "span[data-stage-direction]" }];
    },

    renderHTML({ node, HTMLAttributes }) {
      return [
        "span",
        mergeAttributes(HTMLAttributes, { "data-stage-direction": "" }),
        `[Image: ${node.attrs.description}]`,
      ];
    },

    addInputRules() {
      if (style === "chip")
        // Variant A: type the concept's own notation, "[Image: map of Scandinavia]".
        return [
          nodeInputRule({
            find: /\[(?:image|img):\s*([^\]]+)\]$/i,
            type: this.type,
            getAttributes: (m) => ({ description: m[1].trim() }),
          }),
        ];
      if (style === "marker")
        // Variant C: type "/img " anywhere.
        return [nodeInputRule({ find: /\/img\s$/, type: this.type })];
      return [];
    },

    addKeyboardShortcuts() {
      // All variants: Alt+I inserts an empty direction (variant B advertises it).
      return {
        "Alt-i": () =>
          this.editor.commands.insertContent({
            type: this.name,
            attrs: { description: "" },
          }),
      };
    },

    addNodeView() {
      return ReactNodeViewRenderer(VIEWS[style]);
    },
  });
}

export function insertDirection(editor: Editor | null) {
  editor
    ?.chain()
    .focus()
    .insertContent({ type: "stageDirection", attrs: { description: "" } })
    .run();
}

// Edits the nth stage direction's description (used by variant C's margin).
export function setDirectionAt(editor: Editor, n: number, description: string) {
  let i = 0;
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name !== "stageDirection") return;
    if (i++ === n) {
      editor.view.dispatch(
        editor.state.tr.setNodeMarkup(pos, undefined, { description }),
      );
      return false;
    }
  });
}

function useInlineEdit(props: ReactNodeViewProps) {
  const description: string = props.node.attrs.description;
  const [editing, setEditing] = useState(description === "");
  const [draft, setDraft] = useState(description);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) input.current?.focus();
  }, [editing]);

  function commit() {
    const value = draft.trim();
    setEditing(false);
    if (!value) props.deleteNode();
    else props.updateAttributes({ description: value });
    props.editor.commands.focus();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    }
    if (e.key === "Escape") {
      setDraft(description);
      setEditing(false);
      if (!description) props.deleteNode();
    }
  }

  return { description, editing, setEditing, draft, setDraft, input, commit, onKeyDown };
}

function ChipView(props: ReactNodeViewProps) {
  const e = useInlineEdit(props);
  return (
    <NodeViewWrapper
      as="span"
      className={`mx-0.5 inline-flex items-center gap-1 rounded-md border border-amber-400/60 bg-amber-100 px-1.5 py-0.5 align-baseline font-mono text-[0.8em] text-amber-900 dark:bg-amber-900/40 dark:text-amber-100 ${props.selected ? "ring-2 ring-amber-500" : ""}`}
      contentEditable={false}
    >
      <span className="opacity-70">Image:</span>
      {e.editing ? (
        <input
          ref={e.input}
          value={e.draft}
          onChange={(ev) => e.setDraft(ev.target.value)}
          onBlur={e.commit}
          onKeyDown={e.onKeyDown}
          placeholder="what to show"
          className="w-48 bg-transparent outline-none"
        />
      ) : (
        <button type="button" onClick={() => e.setEditing(true)}>
          {e.description}
        </button>
      )}
    </NodeViewWrapper>
  );
}

function PillView(props: ReactNodeViewProps) {
  const e = useInlineEdit(props);
  return (
    <NodeViewWrapper
      as="span"
      className="relative mx-1 inline-block align-middle"
      contentEditable={false}
    >
      <button
        type="button"
        onClick={() => e.setEditing(true)}
        className={`inline-flex items-center gap-1.5 rounded-full bg-sky-600 px-2.5 py-0.5 text-xs font-medium text-white shadow-sm ${props.selected ? "ring-2 ring-sky-300" : ""}`}
      >
        <span aria-hidden>🖼</span>
        {e.description || "…"}
      </button>
      {e.editing && (
        <span className="absolute left-0 top-full z-20 mt-1 flex w-72 flex-col gap-1 rounded-lg border border-neutral-300 bg-white p-2 text-sm shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
          <span className="text-xs text-neutral-500">Show image</span>
          <input
            ref={e.input}
            value={e.draft}
            onChange={(ev) => e.setDraft(ev.target.value)}
            onBlur={e.commit}
            onKeyDown={e.onKeyDown}
            placeholder="e.g. map of Scandinavia"
            className="rounded border border-neutral-300 px-2 py-1 outline-none dark:border-neutral-700 dark:bg-neutral-800"
          />
          <span className="text-xs text-neutral-500">Enter to save · Esc to cancel</span>
        </span>
      )}
    </NodeViewWrapper>
  );
}

function MarkerView(props: ReactNodeViewProps) {
  return (
    <NodeViewWrapper
      as="span"
      title={props.node.attrs.description || "(no description yet)"}
      className={`mx-0.5 inline-block -translate-y-1 rounded bg-violet-600 px-1 text-[0.65em] leading-tight text-white ${props.selected ? "ring-2 ring-violet-300" : ""}`}
      contentEditable={false}
    >
      ▣
    </NodeViewWrapper>
  );
}

const VIEWS: Record<Style, (p: ReactNodeViewProps) => React.ReactNode> = {
  chip: ChipView,
  pill: PillView,
  marker: MarkerView,
};
