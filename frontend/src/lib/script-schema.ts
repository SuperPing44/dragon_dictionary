import { mergeAttributes, Node } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

/**
 * The script's Tiptap schema, shared by the editor and the read-only
 * renderers (teleprompter). Behaviour that only the editor needs (input
 * rules, shortcuts, the chip's node view) is added in the editor.
 */
export const ScriptStarterKit = StarterKit.configure({
  // Emphasis is bold, italic and underline only (v3 spec §4.1).
  strike: false,
  heading: false,
  codeBlock: false,
  blockquote: false,
  horizontalRule: false,
  code: false,
  link: false,
});

/**
 * A stage direction: an inline node such as "Image: map of Scandinavia",
 * stored in the section's Tiptap JSON as `stageDirection` with a
 * `description`. Never counted as words.
 */
export const StageDirectionNode = Node.create({
  name: "stageDirection",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      description: { default: "" },
      // Ticked in the B-roll list (ADR 0003). Missing reads as not found;
      // editing the description keeps it.
      found: {
        default: null,
        parseHTML: (el) => (el.dataset.found === "true" ? true : null),
        renderHTML: (attrs) => (attrs.found ? { "data-found": "true" } : {}),
      },
    };
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
});

/** The extensions a stored script document is read with. */
export const scriptExtensions = [ScriptStarterKit, StageDirectionNode];
