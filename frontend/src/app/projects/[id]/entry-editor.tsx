"use client";

import { Placeholder } from "@tiptap/extensions";
import {
  type Editor,
  EditorContent,
  type JSONContent,
  useEditor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";
import { StageDirection } from "./stage-direction";

type EntryEditorProps = {
  /** The stored Tiptap JSON; only read when the editor is created. */
  initial: JSONContent;
  placeholder: string;
  onChange: (doc: JSONContent) => void;
  onBlur: () => void;
  /** Hands out the editor, e.g. for the Image button. */
  onEditor: (editor: Editor | null) => void;
};

/** One Tiptap editor for one script entry (a section or subsection). */
export function EntryEditor({
  initial,
  placeholder,
  onChange,
  onBlur,
  onEditor,
}: EntryEditorProps) {
  const editor = useEditor({
    // Needed with SSR: the editor only exists in the browser.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        code: false,
        link: false,
      }),
      Placeholder.configure({ placeholder }),
      StageDirection,
    ],
    content: initial,
    editorProps: {
      attributes: {
        class:
          "script-text min-h-[50vh] text-[20px] text-fg leading-[1.9] outline-none",
        "aria-label": "Script text",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
    onBlur,
  });

  useEffect(() => {
    onEditor(editor);
    return () => onEditor(null);
  }, [editor, onEditor]);

  return <EditorContent editor={editor} />;
}
