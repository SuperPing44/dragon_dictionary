# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`docs/CONTEXT.md`**: the project concept. It is this repo's glossary: §8 **Glossary** defines the domain terms (Idea, Video project, Stage, Section, Story sketch, Stage direction, Source, Source list, Category, Archive). Use it wherever a skill expects `GLOSSARY.md`.
- **`docs/adr/`**: read ADRs that touch the area you're about to work in.

If `docs/adr/` doesn't exist, **proceed silently**. Don't flag its absence; don't suggest creating it upfront. The `/domain-modeling` skill creates ADRs lazily when decisions actually get resolved. When it resolves new terms, add them to the glossary table in `docs/CONTEXT.md` §8 rather than creating a separate `GLOSSARY.md`.

## File structure

Single-context repo:

```
/
├── CLAUDE.md
├── docs/
│   ├── CONTEXT.md        ← concept + glossary (§8)
│   ├── adr/
│   │   └── 0001-....md
│   └── agents/
└── frontend/             ← Next.js app
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `docs/CONTEXT.md` §8. Don't drift to synonyms (e.g. say **Video project**, not "episode"; **Stage direction**, not "cue").

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Respect the guiding principles and non-goals

`docs/CONTEXT.md` §3 (Guiding Principles) and §7 (Out of Scope) are hard constraints: no AI features, no automatic research, no YouTube integration in the first phase, no multi-user support, no cross-video knowledge base. Treat a conflict with them like an ADR conflict.

## Flag ADR conflicts

If your output contradicts an existing ADR or the principles above, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (…), but worth reopening because…_
