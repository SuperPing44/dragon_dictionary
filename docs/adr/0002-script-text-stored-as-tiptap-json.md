# Script text stored as Tiptap JSON

Each section's text is stored in SQLite as the Tiptap editor's own JSON document, and stage directions exist only inside it, as `stageDirection` inline nodes with a `description` attribute. There is no separate stage direction table: the B-roll list and teleprompter ("Next" features) read the directions out of the JSON when they need them, so there is one source of truth that can't drift. The cost is lock-in: the stored text is tied to Tiptap's (ProseMirror's) document format, so switching editors later means converting every section's content.

## Considered Options

- **A `stage_direction` table kept in sync on every save**: easier to query across a script, but two copies of the same fact that can disagree after a failed or partial save.
- **Plain text with `[Image: …]` markup**: editor-independent, but every reader would have to parse the markup, and a typed `[` in spoken text becomes ambiguous.

## Consequences

- The section's word count is computed by the editor (which already skips stage directions) and stored alongside the JSON on save, so lists never need to parse the content.
