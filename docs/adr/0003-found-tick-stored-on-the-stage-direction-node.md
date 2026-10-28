# Found tick stored on the stage-direction node

The B-roll list lets each item be ticked as found. For items that come from the script, the tick is stored as an optional `found` attribute on the `stageDirection` node inside the section's Tiptap JSON, not in a table of its own. Ticking an item in the B-roll list therefore saves that section's JSON. This extends [ADR 0002](0002-script-text-stored-as-tiptap-json.md): a stage direction stays one record in one place, so its tick moves with it, survives rewording, and goes when the direction is deleted, with no IDs to keep in sync. The cost is that a piece of production status now lives inside the script text, and anything that rewrites section content has to carry the attribute along.

## Considered Options

- **A stable ID attribute on each node, plus a `broll_status` table keyed by it:** keeps status out of the script JSON. But it needs orphan cleanup when directions are deleted, and duplicate IDs when a direction is copy-pasted, because Tiptap copies attributes.
- **Matching by description text:** needs no change to the node. But rewording a direction loses its tick, and two directions with the same text would share one.

## Consequences

- A missing attribute reads as not found, so existing scripts need no data migration.
- Copy-pasting a direction copies its tick.
- The script editor shows a small ✓ on found chips, which it reads straight from the node. The teleprompter ignores the attribute.
- Extra B-roll items have no place in the script, so they live in their own `broll_item` table with a `found` column.
