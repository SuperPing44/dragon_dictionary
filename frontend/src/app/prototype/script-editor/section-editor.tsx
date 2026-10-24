"use client";

// PROTOTYPE — throwaway. One small Tiptap editor per section, as the editor
// research (#4) suggested.

import { type AnyExtension, type Editor, EditorContent, useEditor } from "@tiptap/react";
import { CharacterCount, Placeholder } from "@tiptap/extensions";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";
import type { Body } from "./script-model";

export function readBody(editor: Editor): Body {
  const directions: string[] = [];
  editor.state.doc.descendants((node) => {
    if (node.type.name === "stageDirection")
      directions.push(node.attrs.description);
  });
  return {
    doc: editor.getJSON(),
    words: editor.storage.characterCount.words(),
    directions,
  };
}

export function SectionEditor({
  body,
  stageDirection,
  onChange,
  onEditor,
  placeholder = "Start writing…",
  className = "",
}: {
  body: Body;
  stageDirection: AnyExtension;
  onChange: (body: Body) => void;
  onEditor?: (editor: Editor) => void;
  placeholder?: string;
  className?: string;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      CharacterCount,
      Placeholder.configure({ placeholder }),
      stageDirection,
    ],
    content: body.doc,
    editorProps: {
      attributes: { class: `outline-none ${className}` },
    },
    onUpdate: ({ editor }) => onChange(readBody(editor)),
  });

  useEffect(() => {
    if (editor) onEditor?.(editor);
  }, [editor, onEditor]);

  return <EditorContent editor={editor} />;
}
