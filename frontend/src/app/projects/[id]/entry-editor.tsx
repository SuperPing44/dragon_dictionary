"use client";

import { Placeholder } from "@tiptap/extensions";
import {
  type Editor,
  EditorContent,
  type JSONContent,
  useEditor,
} from "@tiptap/react";
import { useEffect, useEffectEvent } from "react";
import { ScriptStarterKit } from "@/lib/script-schema";
import { StageDirection } from "./stage-direction";

type EntryEditorProps = {
  /** The stored Tiptap JSON; only read when the editor is created. */
  initial: JSONContent;
  placeholder: string;
  /** Short entries take only their text's height (Full script). */
  compact?: boolean;
  onChange: (doc: JSONContent) => void;
  onFocus?: () => void;
  onBlur: () => void;
  /** Hands out the editor, e.g. for the Image button. */
  onEditor: (editor: Editor | null) => void;
};

/** One Tiptap editor for one script entry (a section or subsection). */
export function EntryEditor({
  initial,
  placeholder,
  compact = false,
  onChange,
  onFocus,
  onBlur,
  onEditor,
}: EntryEditorProps) {
  const editor = useEditor({
    // Needed with SSR: the editor only exists in the browser.
    immediatelyRender: false,
    extensions: [
      ScriptStarterKit,
      Placeholder.configure({ placeholder }),
      StageDirection,
    ],
    content: initial,
    editorProps: {
      attributes: {
        class: `script-text ${compact ? "min-h-[1.9em]" : "min-h-[50vh]"} text-[20px] text-fg leading-[1.9] outline-none`,
        "aria-label": "Script text",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
    onFocus: () => onFocus?.(),
    onBlur,
  });

  // An event, so a new callback each render doesn't re-announce the editor.
  const announce = useEffectEvent((e: Editor | null) => onEditor(e));
  useEffect(() => {
    announce(editor);
    return () => announce(null);
  }, [editor]);

  return <EditorContent editor={editor} />;
}
