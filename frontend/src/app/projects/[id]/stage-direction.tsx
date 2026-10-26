"use client";

import {
  type Editor,
  InputRule,
  mergeAttributes,
  Node,
  NodeViewWrapper,
  type ReactNodeViewProps,
  ReactNodeViewRenderer,
} from "@tiptap/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * A stage direction: an inline amber chip such as "Image: map of
 * Scandinavia", stored in the section's Tiptap JSON as a `stageDirection`
 * node with a `description`. Never counted as words.
 */
export const StageDirection = Node.create({
  name: "stageDirection",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return { description: { default: "" } };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-stage-direction]",
        getAttrs: (el) => ({
          description: (el as HTMLElement).dataset.description ?? "",
        }),
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-stage-direction": "",
        "data-description": node.attrs.description,
      }),
      `[Image: ${node.attrs.description}]`,
    ];
  },

  addInputRules() {
    // Typing the notation, e.g. "[Image: map of Scandinavia]", converts on
    // "]". (Tiptap's nodeInputRule would only replace the captured text.)
    return [
      new InputRule({
        find: /\[image:\s*([^\]]*[^\]\s][^\]]*)\]$/i,
        handler: ({ state, range, match }) => {
          state.tr.replaceWith(
            range.from,
            range.to,
            this.type.create({ description: match[1].trim() }),
          );
        },
      }),
    ];
  },

  addKeyboardShortcuts() {
    // Not Ctrl+Shift+I: that opens the browser's developer tools.
    return { "Alt-i": () => insertStageDirection(this.editor) };
  },

  addNodeView() {
    return ReactNodeViewRenderer(StageDirectionChip);
  },
});

/** Inserts an empty stage direction at the cursor, ready to type into. */
export function insertStageDirection(editor: Editor | null): boolean {
  return (
    editor
      ?.chain()
      .focus()
      .insertContent({ type: "stageDirection", attrs: { description: "" } })
      .run() ?? false
  );
}

/**
 * The chip. Clicking it lets you type into it, with no popover: Enter saves,
 * Esc cancels, and an empty description removes the direction.
 */
function StageDirectionChip({
  node,
  editor,
  getPos,
  selected,
  updateAttributes,
  deleteNode,
}: ReactNodeViewProps) {
  const description: string = node.attrs.description;
  const [editing, setEditing] = useState(description === "");
  const [draft, setDraft] = useState(description);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) input.current?.focus();
  }, [editing]);

  /** Puts the text cursor right after the chip. */
  function returnToText() {
    const pos = getPos();
    if (typeof pos !== "number") return;
    editor
      .chain()
      .focus()
      .setTextSelection(pos + node.nodeSize)
      .run();
  }

  function save() {
    const value = draft.trim();
    setEditing(false);
    if (!value) {
      deleteNode();
      editor.commands.focus();
      return;
    }
    if (value !== description) updateAttributes({ description: value });
    returnToText();
  }

  function cancel() {
    setEditing(false);
    setDraft(description);
    if (!description) {
      deleteNode();
      editor.commands.focus();
    } else returnToText();
  }

  return (
    <NodeViewWrapper
      as="span"
      contentEditable={false}
      className={`mx-0.5 inline-flex items-center gap-1.5 rounded-lg py-[3px] pr-2.5 pl-2 align-[0.1em] font-label font-medium text-[14px] text-amber leading-normal transition-shadow ${
        editing || selected
          ? "border-[1.5px] border-amber bg-amber/15 shadow-[0_0_6px_rgb(242_168_59/0.5)]"
          : "border border-amber/45 bg-amber/10"
      }`}
    >
      <Image src="/design/icon-image-chip.svg" alt="" width={15} height={15} />
      {editing ? (
        <span className="inline-flex items-center">
          Image:&nbsp;
          <input
            ref={input}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                save();
              } else if (e.key === "Escape") {
                e.preventDefault();
                cancel();
              }
            }}
            onBlur={() => {
              if (editing) save();
            }}
            size={Math.max(draft.length, 12)}
            placeholder="what to show"
            aria-label="Stage direction"
            className="bg-transparent text-amber outline-none placeholder:text-amber/50"
          />
        </span>
      ) : (
        <button
          type="button"
          onClick={() => {
            setDraft(description);
            setEditing(true);
          }}
          aria-label={`Edit stage direction: ${description}`}
          className="cursor-text text-left"
        >
          Image: {description}
        </button>
      )}
    </NodeViewWrapper>
  );
}
