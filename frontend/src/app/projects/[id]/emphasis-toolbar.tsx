"use client";

import { type Editor, useEditorState } from "@tiptap/react";

type Mark = "bold" | "italic" | "underline";

const BUTTONS: {
  mark: Mark;
  label: string;
  glyph: string;
  glyphClass: string;
  keys: string;
}[] = [
  {
    mark: "bold",
    label: "Bold",
    glyph: "B",
    glyphClass: "font-bold",
    keys: "Ctrl+B",
  },
  {
    mark: "italic",
    label: "Italic",
    glyph: "I",
    glyphClass: "font-serif italic",
    keys: "Ctrl+I",
  },
  {
    mark: "underline",
    label: "Underline",
    glyph: "U",
    glyphClass: "underline underline-offset-2",
    keys: "Ctrl+U",
  },
];

const toggle = (editor: Editor, mark: Mark) => {
  const chain = editor.chain().focus();
  if (mark === "bold") chain.toggleBold().run();
  else if (mark === "italic") chain.toggleItalic().run();
  else chain.toggleUnderline().run();
};

/**
 * B / I / U buttons for the script's emphasis. A button shows as pressed
 * while the cursor or selection has that mark.
 */
export function EmphasisToolbar({ editor }: { editor: Editor | null }) {
  const active = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor?.isActive("bold") ?? false,
      italic: editor?.isActive("italic") ?? false,
      underline: editor?.isActive("underline") ?? false,
    }),
  });

  return (
    <fieldset
      aria-label="Emphasis"
      className="flex shrink-0 items-center gap-0.5 rounded-xl border border-border-soft bg-surface-2 p-0.5"
    >
      {BUTTONS.map((b) => {
        const on = active?.[b.mark] ?? false;
        return (
          <span key={b.mark} className="group relative">
            <button
              type="button"
              aria-label={b.label}
              aria-pressed={on}
              disabled={!editor}
              // Keeps the selection in the text.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor && toggle(editor, b.mark)}
              className={`flex size-8 items-center justify-center rounded-[10px] font-heading text-[15px] ${
                on
                  ? "bg-accent/20 text-accent-glow"
                  : "text-fg-muted hover:bg-surface-3 hover:text-fg"
              }`}
            >
              <span aria-hidden className={b.glyphClass}>
                {b.glyph}
              </span>
            </button>
            <span
              role="tooltip"
              className="pointer-events-none absolute top-full left-1/2 z-20 mt-2 hidden w-max -translate-x-1/2 rounded-lg border border-border-strong bg-surface-3 px-3 py-1.5 font-label text-[12px] text-fg-muted shadow-[0_10px_30px_rgb(0_0_0/0.55)] group-hover:block"
            >
              {b.label} · {b.keys}
            </span>
          </span>
        );
      })}
    </fieldset>
  );
}
