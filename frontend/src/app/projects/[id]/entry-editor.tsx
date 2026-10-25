"use client";

import { Placeholder } from "@tiptap/extensions";
import { EditorContent, type JSONContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

type EntryEditorProps = {
  /** The stored Tiptap JSON; only read when the editor is created. */
  initial: JSONContent;
  placeholder: string;
  onChange: (doc: JSONContent) => void;
  onBlur: () => void;
};

/** One Tiptap editor for one script entry (a section or subsection). */
export function EntryEditor({
  initial,
  placeholder,
  onChange,
  onBlur,
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

  return <EditorContent editor={editor} />;
}
