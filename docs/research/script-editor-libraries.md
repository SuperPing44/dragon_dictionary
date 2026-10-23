# Research: Rich-text editor libraries for the script editor

> Ticket: #4 (child of map #1, "Dragon Dictionary MVP spec")
> Researched: 2026-10-23
> Question: which React 19-compatible editor libraries can support (a) a script divided into reorderable sections, (b) inline stage directions (`[Image: …]`) shown apart from spoken text and extractable as data, and (c) word counts that leave out stage directions? How do they compare on maturity, bundle size and effort?

Requirements come from `docs/CONTEXT.md` §5.2 (script editor), §5.4 (B-roll list collects the stage directions) and §5.5 (teleprompter hides stage directions or shows them only subtly, and can start at a section). The stack is Next.js 16.4.2, React 19.3, React Compiler and Tailwind 4 (`frontend/package.json`). No AI add-ons are considered.

---

## TL;DR

**Recommendation: Tiptap 3 (`@tiptap/react`, MIT), with sections handled by the app rather than the editor.**

- **Sections live in the app.** Store an ordered list of section records (kind, title, order, optional parent for main-part subsections). Each section's body is its own small Tiptap editor. Reordering then means sorting a React list, with up/down buttons or a drag-and-drop library. It is not an editor feature. The teleprompter's "start at section" also becomes trivial.
- **A stage direction is a custom inline atom node.** Use something like `stageDirection` with a `description` attribute. It renders as a styled chip, can be extracted from `editor.getJSON()` by walking the tree for `type === "stageDirection"`, and gets `renderText` returning `[Image: …]` for copy and paste.
- **Word counts leave out stage directions with no extra code.** The free `CharacterCount` extension counts `doc.textBetween(0, size, " ", " ")`. ProseMirror replaces each leaf (atom) node with the `leafText` argument, a single space. The direction's description lives in an attribute, not in text, so it is never counted (verified in source, see §3).
- **Cost:** about 96 KB min+gzip for a minimal Tiptap setup and about 127 KB with StarterKit, measured. That does not matter for a local single-user app.
- **Runner-up:** Lexical, which can do the same things but takes more boilerplate. **Fallback:** a plain `<textarea>` with `[Image: …]` markup and regex parsing. It costs 0 KB but cannot style directions inside the text.

---

## 1. Options at a glance

| | Tiptap 3 | Lexical | Slate | ProseMirror directly | Textarea + markup |
|---|---|---|---|---|---|
| Latest version (npm, 2026-10-23) | 3.32.0 | 0.52.0 | slate 0.146.0 / slate-react 0.147.3 | prosemirror-view 1.42.7 | n/a |
| React 19 peer dep | `^17 \|\| ^18 \|\| ^19` | `>=18.x` | `>=18.2.0` | none (framework-agnostic) | n/a |
| License | MIT | MIT | MIT | MIT | n/a |
| Stated stability | 3.x, semver-stable | pre-1.0 (0.x) | README: **"Slate is currently in beta"**, "no 1.0 release schedule" | 1.x, stable for years | n/a |
| GitHub stars / last push | 38.8k / 2026-10-23 | 24.0k / 2026-10-23 | 31.7k / 2026-10-22 | 8.7k (meta repo) / 2026-04 | n/a |
| Bundle, min+gzip (measured) | 95.7 KB minimal, 126.8 KB with StarterKit | 101.8 KB | 69.6 KB | 62.5 KB | 0 KB |
| Inline stage direction | inline `atom` Node + React NodeView | inline `DecoratorNode` | inline + void element | inline atom node + NodeView | text markup, can't style in a textarea |
| Word count without directions | built in (`CharacterCount`, atoms skipped) | custom: walk the tree, skip decorator nodes | custom: walk the tree, skip void inlines | custom (`textBetween` as Tiptap does) | regex strip, then split |
| Effort for this feature | **low** | medium | medium–high | high | lowest, but poor UX |

Sources: npm registry (`npm view <pkg> version peerDependencies license`), GitHub API (`gh api repos/<owner>/<repo>`), Slate README, and my own bundle measurements (§4).

---

## 2. Where sections live: in the app, not inside the editor

Every library could represent sections as block nodes inside a single document. Tiptap now ships a free, MIT-licensed drag handle (`@tiptap/extension-drag-handle-react` 3.32.0, source: npm). Even so, I recommend against putting sections in the editor:

- Sections are **domain objects** with a fixed set of kinds (opening sketch, hook, intro, main part with subsections, outro, closing sketch). They need their own speaking time (§5.2) and must be jump targets for the teleprompter (§5.5). Rows in the database fit this better than nodes in a document schema.
- Reordering nested main-part subsections inside one document needs a custom schema plus drag logic. Reordering a React list needs only up/down buttons, or `@dnd-kit/react` 0.5.1 (peer `react ^18 || ^19`) or `@dnd-kit/sortable` 10.0.0 (source: npm).
- One editor per section keeps each document small and its word count local to that section. The script total is just a sum.

This choice also takes "sections" off the list of things the editor library has to do. What remains is inline stage directions and word counting.

---

## 3. How each library handles inline stage directions and word counts

### Tiptap 3 (ProseMirror underneath)
- **Custom node:** a Node extension can set `inline: true`, `group: 'inline'` and `atom: true`. In the docs, `atom` means the node "doesn't have directly editable content and should be treated as a single unit in the view". `parseHTML`/`renderHTML` map to ProseMirror `parseDOM`/`toDOM` (source: tiptap.dev, *Create a new node*). A React NodeView can render the chip with Tailwind classes.
- **Plain-text output:** `NodeConfig.renderText(props) => string` (source: `@tiptap/core` 3.32.0 `dist/index.d.ts`, line ~774). `editor.getText({ blockSeparator, textSerializers })` returns the document as plain text (source: tiptap.dev, *Editor API*).
- **Extraction:** `editor.getJSON()` returns the document as JSON (source: tiptap.dev, *Editor API*). Walk the tree and collect `attrs.description` from the `stageDirection` nodes. That list feeds the B-roll list (§5.4).
- **Word count:** `CharacterCount` (in `@tiptap/extensions` 3.32.0, MIT) takes a pluggable `wordCounter(text)`. Its `words()` calls `node.textBetween(0, node.content.size, " ", " ")` (source: `@tiptap/extensions/dist/character-count/index.js`). In `prosemirror-model`, `textBetween` gives a leaf node the `leafText` argument instead of its own text (`... : leafText ? leafText : node.type.spec.leafText ? ... : ""`, source: `prosemirror-model/dist/index.js` line ~117). An atom stage direction therefore counts as a space and adds **zero words**. `storage.characterCount.words({ node })` can count any subtree.
- **Typing a direction:** a `nodeInputRule` can turn typed `[Image: …]` into the node, so the writing flow stays keyboard-only.
- **Next.js:** the official Next.js guide uses `'use client'` and `useEditor({ immediatelyRender: false })` "to avoid SSR issues" and hydration mismatches (source: tiptap.dev, *Next.js install guide*).
- **Teleprompter:** render the stored JSON read-only. Either drop `stageDirection` nodes or give them subtle styling.

### Lexical (Meta)
- `DecoratorNode` is a "wrapper node to insert arbitrary view (component) inside the editor". Its `isInline()` defaults to `true` (source: lexical.dev, *Nodes*, and `lexical/src/nodes/LexicalDecoratorNode.ts`). It fits the stage-direction chip.
- Serialization uses `exportJSON`/`importJSON`, which v0.51+ can generate from a `$config` JSON schema (source: lexical.dev, *Nodes*). Extraction means walking the JSON tree.
- `getTextContent()` is meant to be overridden "for custom nodes that should have a representation in plain text" (source: `lexical/src/LexicalNode.ts`). A word count is a custom tree walk that skips decorator nodes. There is no ready-made word-count plugin like Tiptap's.
- Downsides: still 0.x with frequent breaking minor releases, more boilerplate per custom node (class, `clone`, `$config`, `decorate()`), and a slightly larger bundle than minimal Tiptap.

### Slate
- Supports the pattern: override `editor.isInline` and `editor.isVoid` so an inline void element is "treated as a black box" (source: docs.slatejs.org, *Nodes*). The data model is plain JSON, which makes extraction easy.
- The README says: *"Slate is currently in beta … Some of its APIs are not 'finalized' and will have breaking changes over time … There isn't currently a 1.0 release schedule."* It also says Slate is contributor-driven and "not backed by any huge company". More hand-rolled code is needed for selection and edge cases around inline voids (an inline node "cannot be the first or last child of a parent block", source: *Nodes*).

### ProseMirror directly
- Has the same strengths as Tiptap, since Tiptap is built on it, and the smallest bundle among the rich editors (62.5 KB). But you write the React integration (NodeViews in React, state syncing, and React Compiler interplay), keymaps and the schema yourself. That duplicates Tiptap's work for a 33 KB gzip saving, which does not matter in a local app.

### Plain textarea with `[Image: …]` markup
- Simplest storage (a plain string) and easiest extraction (`/\[Image:\s*([^\]]+)\]/g`). The word count is just "strip the matches, then split on whitespace".
- **It fails the "visually distinct" requirement:** a `<textarea>` cannot style ranges inside its text. Fixing that needs a highlighted overlay mirror (fragile with wrapping and scrolling) or `contenteditable`, which means writing an editor anyway.
- Still worth knowing: `[Image: …]` markup also works as an export format from the Tiptap model (`renderText`).

---

## 4. How the bundle sizes were measured

I installed each library's latest version on 2026-10-23 and bundled it with esbuild 0.28.2 (`--bundle --minify --format=esm --platform=browser`, `NODE_ENV=production`, with `react`/`react-dom` external). Output was gzipped at level 9. Each entry imports only what a minimal editor needs:

| Entry | min | min+gzip |
|---|---|---|
| Tiptap: `@tiptap/react` + Document/Paragraph/Text | 309.4 KB | 95.7 KB |
| Tiptap: `@tiptap/react` + StarterKit | 400.3 KB | 126.8 KB |
| Lexical: `@lexical/react` composer, ContentEditable, PlainText, History | 303.8 KB | 101.8 KB |
| Slate: `slate` + `slate-react` + `slate-history` | 244.3 KB | 69.6 KB |
| ProseMirror: view/state/model/history/keymap/commands | 202.4 KB | 62.5 KB |

These sizes are not tree-shaken against real app usage, so treat them as upper-bound ballparks. For an app on localhost, any of them is fine.

---

## 5. Risks and open points

- **React Compiler:** none of the libraries documents React Compiler compatibility on the pages I checked. Editor instances are mutable objects held outside React. If the compiler mis-memoizes a component that reads from the editor, the documented escape hatch is the `"use no memo"` directive on that component. This should be tested once a prototype exists. **Not verified.**
- **Storage format:** if the editor is Tiptap, store `getJSON()` per section (a database JSON column or text). Optionally also store a derived plain-text `[Image: …]` form for search and export.
- **Speaking time:** compute it from `words()` per section at an assumed words-per-minute rate. The rate is a product decision, not a library one.

## Sources
- npm registry metadata: `npm view @tiptap/react|lexical|@lexical/react|slate|slate-react|prosemirror-view|@dnd-kit/react|@dnd-kit/sortable|@tiptap/extension-drag-handle-react version peerDependencies license`
- GitHub API: `repos/ueberdosis/tiptap`, `repos/facebook/lexical`, `repos/ianstormtaylor/slate`, `repos/ProseMirror/prosemirror`
- Tiptap docs: https://tiptap.dev/docs/editor/extensions/custom-extensions/create-new/node, https://tiptap.dev/docs/editor/api/editor, https://tiptap.dev/docs/editor/getting-started/install/nextjs
- Tiptap source: `@tiptap/core@3.32.0/dist/index.d.ts` (`renderText`, `textSerializers`), `@tiptap/extensions@3.32.0/dist/character-count/index.js` (`words()`)
- ProseMirror source: `prosemirror-model/dist/index.js` (`Fragment.textBetween`)
- Lexical docs: https://lexical.dev/docs/concepts/nodes, and source `lexical@0.52.0/src/nodes/LexicalDecoratorNode.ts`, `src/LexicalNode.ts`
- Slate docs: https://docs.slatejs.org/concepts/02-nodes, and README at https://github.com/ianstormtaylor/slate
