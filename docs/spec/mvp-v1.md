# Dragon Dictionary – MVP v1 Spec

> The build-ready spec for the first version of Dragon Dictionary. It gathers the decisions made on the map [Map: Dragon Dictionary MVP spec](https://github.com/SuperPing44/dragon_dictionary/issues/1). Each section links the ticket that holds the full reasoning.
> Concept and glossary: [`docs/CONTEXT.md`](../CONTEXT.md). Terms in **bold** are glossary terms.
> Design: [Figma mockups](https://www.figma.com/design/noDRCbSEOAeXATPnnjUqrJ/Untitled?node-id=0-1), page *MVP screens*.

---

## 1. Scope

MVP v1 delivers four things:

1. the **idea list** with rating and **categories**;
2. a minimal **video project** (title, categories, **stage**, script, sources) shown as a plain list;
3. the **script editor** with **sections**, **subsections**, **stage directions** and a speaking-time estimate;
4. **source** management: the **source library**, PDFs, **quotes** and the automatic **source list**.

It also covers how the app is run, stored and backed up.

**Hard constraints** (`CONTEXT.md` §3, §7):
- no AI features;
- no automatic research;
- no YouTube integration;
- single user, no auth;
- laptop only;
- English UI only, no i18n.

**Out of scope for v1:**
- the Kanban board;
- the remaining video project fields (title ideas, thumbnail drafts, tags, description, editing notes, B-roll list);
- teleprompter;
- archive;
- any YouTube integration;
- access from other devices.

**Leave room for "Next":**
- the **stage** value already covers the full lifecycle;
- stage directions are stored so a teleprompter and B-roll list can read them later.

Nothing is designed for those features yet, and there are no placeholder tables or columns.

## 2. Runtime and storage

Decided in [Choose persistence and file storage](https://github.com/SuperPing44/dragon_dictionary/issues/3), [ADR 0001](../adr/0001-local-sqlite-and-files-on-disk.md) and [Running and backing up the app](https://github.com/SuperPing44/dragon_dictionary/issues/10).

### Stack

- **Frontend:** Next.js 16, React 19, Tailwind 4, Biome; the app lives in `frontend/`. `reactCompiler: true` and `cacheComponents` are on.
- **Database:** one SQLite file via **better-sqlite3 + Drizzle ORM**, in WAL mode.
- **Script editor:** **Tiptap 3**. It works with the React Compiler. `useEditor` needs `immediatelyRender: false`, and routes using `useSearchParams` need a `Suspense` boundary.

### Data location

- **Location:** `%USERPROFILE%\DragonDictionary\`, overridable with `DATA_DIR`. It holds:
  - `app.db`;
  - `files/<source-id>/<file-id>.pdf`.

  It lives outside the repo.
- **Data access:** every query goes through a `db/` module that calls `await io()` first, because `cacheComponents` would otherwise prerender synchronous reads.
- **File transfer:** uploads and file downloads go through **Route Handlers**, since Server Actions cap at 1 MB.
- **Migrations:** `drizzle-kit` SQL files committed to the repo, applied automatically at startup, with a backup taken first (see below).

### Running the app

- **Daily copy:** the app runs from a separate clone at `C:\Users\kirch\DragonDictionaryApp\`, always on `main`, as a production build.
- **Starting:** a desktop shortcut, "Dragon Dictionary", runs `next start` on port **3210** and opens `http://localhost:3210`.
  - Closing the console window stops the app.
  - If the app is already running, the shortcut only opens the browser tab.
- **Updating:** run `update.cmd` by hand. It refuses to run while the app is running, then pulls `main`, installs and builds.

### Backups

- **When:**
  - at startup, if the last backup is more than 24 h old;
  - always before applying a pending migration;
  - on **Back up now**.
- **Where:** `C:\Users\kirch\OneDrive\DragonDictionary Backups\`, overridable with `BACKUP_DIR`. There is no settings screen.
- **What:** a dated folder holding a `VACUUM INTO` copy of the database and a full copy of `files/`.
  - Only finished snapshots are written there, never the live database file.
  - The newest **10** are kept; older ones are deleted automatically.
- **Status:** the time of the last backup and the last error are stored in `app_meta` and shown in the sidebar.
- **Failure:** a visible warning with the last good backup's age stays until a backup succeeds. The app keeps working.
- **Restore:** a manual procedure in the README: stop the app, copy a backup's `app.db` and `files/` into the data folder, start the app.

## 3. Data model

Decided in [Settle the MVP data model](https://github.com/SuperPing44/dragon_dictionary/issues/9) and [ADR 0002](../adr/0002-script-text-stored-as-tiptap-json.md).

```
category          id, name (unique ignoring case), colour (palette name), created
idea              id, title, note?, rating? (1–10), created, updated
idea_category     idea → category
video_project     id, title, stage, original_note?, original_rating?, created, updated
project_category  video_project → category
section           id, video_project, kind | parent+title, position, content (Tiptap JSON), word_count
source            id, type, title, author?, link?, publisher?, date? (partial ISO text), note?, created, updated
source_file       id, source, original_name, size, uploaded   → files/<source-id>/<file-id>.pdf
quote             id, source, text, location?, created
project_source    video_project → source, linked (sets source-list order)
app_meta          key → value (last backup at, last backup error, speaking rate)
```

### Fields

- **IDs:** UUID v7, stored as text. "Newest" sorts use `created`, never the ID.
- **Stage:** one value on the project: Research, Script, Recording, Editing, Thumbnail, Upload or Published. There's no history table. Idea is not a project stage: the Idea stage *is* the idea list.
- **Script:** the project's sections. There is no separate script record.
  - Top-level sections have a `kind` and no parent.
  - Subsections have a `parent` (the Main part) and a `title`.
  - `position` orders siblings.
- **Section content:** stored as Tiptap JSON. Stage directions exist only inside it, as `stageDirection` inline nodes with a `description`. `word_count` is computed by the editor, which excludes stage directions, and is stored on save.
- **Category colour:** stored as a palette name (for example `emerald`), so the shades can change without a migration.
- **Source date:** partial ISO text: `1220`, `1220-05` or `1220-05-03`.

### Deletes

Each delete runs in one transaction.

| Deleted | Also removed | Kept |
|---|---|---|
| Idea | its category links | — |
| Category | its links to ideas and projects | the items |
| Video project | its sections, category links and source links | the sources (they stay in the library) |
| Source | its quotes, project links, file records and PDFs on disk | — |

When a source is deleted, its PDFs on disk are removed only after the database change succeeds.

### Idea → video project

One transaction:

1. create the project: stage Research, the idea's title, its note and rating as `original_note` and `original_rating`;
2. copy the category links;
3. create the six empty template sections;
4. delete the idea.

## 4. App shell and navigation

Decided in [Design mockups in Figma for the MVP screens](https://github.com/SuperPing44/dragon_dictionary/issues/12).

- **Sidebar** on every screen (256 px wide, left):
  - the logo;
  - four entries with counts: **Idea list**, **Video projects**, **Source library**, **Categories**;
  - at the bottom, the backup card: "Last backup", when and where, the failure warning when there is one, and **Back up now**.
- **Video project page:**
  - **Header:**
    - a back link to Video projects;
    - the title;
    - category chips with "+ category";
    - the estimated length and word count;
    - the **stage** as a row of seven stars, where clicking a star sets the stage.
  - **Original idea:** a collapsed, read-only strip under the header (rating and note). It can be expanded and appears only on projects converted from an idea.
  - **Tabs:** **Script | Sources (n)**, with "Delete project" on the tab bar. Opening a project from the list lands on **Script**.
- **Source pages:** a new or existing source opens as a full page with a back link. When it's opened from a project, the page says which project the source will be linked to.

## 5. Features

### 5.1 Idea list

Decided in [Idea list behaviour](https://github.com/SuperPing44/dragon_dictionary/issues/7).

- **Quick capture:** a field across the top. Type a title and press Enter. Only the title is needed.
- **Fields:**
  - title (required);
  - note (optional plain text);
  - rating;
  - categories;
  - creation date (automatic).

  All fields can be edited at any time, in a **right-hand panel** for the selected idea.
- **Rating:** an optional whole number from 1 to 10, set with a row of ten buttons. It can be changed or cleared, and unrated ideas sort below all rated ones.
- **Sort:** rating, highest first (the default); newest first; or title A–Z. Ties go to the newest.
- **Filter:** by category. Several selected categories show ideas with **any** of them (OR). There's no text search.
- **Make video project:**
  - One click, no confirmation; available on the selected row and in the panel.
  - The idea leaves the list and becomes a project in Research (see §3).
  - There's no converting back.
- **Delete:** asks for confirmation and is permanent.

### 5.2 Categories

Decided in [Idea list behaviour](https://github.com/SuperPing44/dragon_dictionary/issues/7).

- **One shared list** for ideas and video projects. Names are unique ignoring case. A category stays until it is deleted, even when unused.
- **Colour:** each category has one colour from a fixed palette of 12: emerald, teal, sky, indigo, violet, fuchsia, rose, red, orange, amber, lime and slate.
  - Colours can repeat.
  - The default is the next unused colour, wrapping around.
  - The colour shows on category chips everywhere. There are no icons.
- **Creating while typing:** in a category input, pressing Enter on a new name shows the palette with the next unused colour selected. Enter again confirms.
- **Categories screen:** an A–Z table of colour, name and usage ("4 ideas, 2 video projects"). From it you can:
  - **create** a category in advance (name and colour);
  - **change a colour**;
  - **rename** in place, which changes it everywhere. Renaming onto an existing name (ignoring case) offers to **merge** the two; items that had both keep one;
  - **delete**, even when the category is in use, after a confirmation showing the count. It is removed from every item, and the items keep everything else.

### 5.3 Video projects

- **List:** a plain list of title, stage, categories, estimated length (§5.5) and number of sources.
- **New projects:** they are created only from the idea list. A hint on the list says so.
- **Project page:** see §4. Title, stage and categories are editable on the project page.

### 5.4 Script editor (Script tab)

Decided in [Script structure rules](https://github.com/SuperPing44/dragon_dictionary/issues/5) and [Script editor interaction and stage-direction input](https://github.com/SuperPing44/dragon_dictionary/issues/6). A throwaway prototype is on branch `prototype/script-editor`.

**Structure**
- **New script:** starts with all six sections, empty, in canonical order: opening story sketch, hook, intro, main part, outro, closing story sketch.
- **Section kinds:** every top-level section has one fixed **section kind**.
  - There are no custom top-level titles.
  - A script has at most one section of each kind.
  - A section's kind never changes.
- **Removing:** every section is removable, and an empty script is allowed.
  - Removing a section or subsection that has text or stage directions asks for confirmation; an empty one goes immediately.
  - Removing the Main part removes its subsections.
  - There is no undo or trash.
- **Adding sections:** **Add section** offers only the missing kinds. A re-added section goes to its canonical position: after the nearest preceding canonical kind that exists, otherwise at the top. It can then be dragged anywhere.
- **Subsections:**
  - Only the Main part has them, one level deep.
  - Each has a free title, starting as "Untitled subsection"; an empty title shows as "Untitled".
  - They are reordered only within the Main part and never promoted to the top level.
- **Main part body:** the Main part always keeps its own body, a lead-in shown above its subsections. Adding the first subsection never moves text.

**Layout:** an outline on the left, and a writing area that shows **one entry at a time** in large text.

- **Outline:**
  - Rows list the sections in order, with subsections nested under the Main part. The Main part's row is its lead-in, and each subsection is its own entry.
  - **Reorder** by dragging rows only: sections among sections, subsections within the Main part.
  - **Remove** with ✕ on hover.
  - **+ Subsection** sits under the Main part; **+ Add section** opens a menu of the missing kinds.
  - Each row shows its speaking time (§5.5).
- **Writing area:**
  - The heading is the entry's name. A subsection's title is edited right there.
  - A bar shows the entry's words, time and number of images.
  - The **Image** button sits above the text.

**Stage directions**
- **Look:** an amber inline **chip**, for example "Image: map of Scandinavia".
- **Inserting:** both ways produce the same chip:
  - type the notation `[Image: …]`, which converts on `]`;
  - or press the **Image** button or **Alt+I**, which inserts an empty chip ready to type into. Ctrl+Shift+I is not used: it opens the browser dev tools.
- **Editing:** click the chip and type into it; there's no popover. Enter saves, Esc cancels, and an empty description removes the direction.
- **Counting:** stage directions are never counted as words.

**Implementation notes from the prototype:**
- one Tiptap editor per entry;
- `stageDirection` is a custom inline node;
- drag handles must be separate from drop targets, because a `draggable` ancestor around an editor breaks text selection. Outline rows hold no editor, so this doesn't come up in this layout.

### 5.5 Speaking-time estimate

Decided in [Speaking-time estimate](https://github.com/SuperPing44/dragon_dictionary/issues/11).

- **Rate:** one rate for the whole app, **150 wpm** by default, stored in `app_meta`.
  - Click "at 150 wpm" in the outline footer to edit it.
  - It must be a whole number from 60 to 300.
- **Time:** words ÷ rate, using the stored word counts.
- **Format:** `≈ m:ss`, rounded to the nearest 5 s; `≈ h:mm:ss` above an hour.
- **Where it shows:**
  - **Outline rows** show time. The Main part's row includes all its subsections.
  - The **bar above the writing area** shows the entry's words and time. For the Main part, that is the lead-in only.
  - The **outline footer** shows the script total (words and time) and the editable rate.
  - The **video project list** and the project header show the total.
- **Not in v1:** a target length.

### 5.6 Sources

Decided in [Source model and source list](https://github.com/SuperPing44/dragon_dictionary/issues/8).

**A source**
- **One form for every type:**
  - **type**: website, book, PDF, YouTube video or scientific paper. It is just a label.
  - **title** (required);
  - **author**: free text. For YouTube, the channel.
  - **link**: optional URL;
  - **publisher**: optional. For papers, the journal.
  - **date**: optional, as precise as known, and shown as entered;
  - **note**.

  Everything is editable at any time.
- **PDFs:**
  - Any number per source, listed by original filename in upload order.
  - They open in the browser's built-in viewer.
  - Removing one asks for confirmation. There's no rename or reorder.
  - Only PDFs are allowed.
- **Quotes:** any number per source. Each is a piece of text with an optional location ("p. 42", "12:30"). Quotes belong to the source, not to a project.

**Source library**
- **Shared:** every source exists once and links to any number of video projects, or to none. Sources never link to ideas.
- **Library screen:**
  - a table of type, title, author and number of linked projects;
  - sort by title or newest;
  - filter by type;
  - search title and author.
- **Duplicate warning:** a link that already exists in the library shows a warning under the Link field, with an offer to link the existing source instead. It doesn't block saving, and titles aren't checked.
- **Deleting** a source asks for confirmation showing how many projects use it (see §3).

**On a project (Sources tab)**
- **Linking:**
  - A search box finds library sources by the same search and links one in a single click.
  - "Create new source … and link it" opens the source page and links the new source on save.
- **Unlinking** needs no confirmation.
- **Source list:**
  - Shown in a side card on the Sources tab.
  - One line per source, `Title – link`, for linked sources that have a link only, in the order they were linked.
  - A **Copy** button puts it on the clipboard.
  - It always reflects the current sources, so there's no regenerate step.
  - A note says how many linked sources were left out for having no link.

## 6. Visual design

Approved in [Design mockups in Figma for the MVP screens](https://github.com/SuperPing44/dragon_dictionary/issues/12). The [Figma file](https://www.figma.com/design/noDRCbSEOAeXATPnnjUqrJ/Untitled?node-id=0-1) is the reference for every screen.

- **Style:** purple and black, whimsical fantasy:
  - a faint starfield behind the content;
  - a soft violet glow at the top right;
  - ornamental "✦ · ✧ · ✦" dividers;
  - the hexagon dragon emblem.
- **Theme:** dark only.
- **Type:**
  - **Cinzel** for headings, buttons and tab labels;
  - **Cinzel Decorative** for the logo;
  - **Crimson Pro** for body text and the script;
  - **Inter** for small labels, counts and metadata.
- **Colours:** the Figma variable collection `Dragon colours` becomes the Tailwind theme tokens.

  | Token | Value |
  |---|---|
  | `bg/base` | `#0B0811` |
  | `surface/1` | `#140E1D` |
  | `surface/2` | `#1C1528` |
  | `surface/3` | `#271D38` |
  | `border/strong` | `#3D2D5A` |
  | `border/soft` | `#2A2040` |
  | `accent/primary` | `#9D6BFF` |
  | `accent/glow` | `#C6A6FF` |
  | `text/primary` | `#EFE8FB` |
  | `text/muted` | `#AA9DC4` |
  | `text/faint` | `#6F6389` |
  | `gold` (ratings, original idea) | `#E9C46A` |
  | `amber` (stage directions) | `#F2A93B` |
  | `danger` | `#FF6B8A` |

  The 12 category colours are under `category/*`.
- **Screens in Figma:**
  1. Idea list
  2. Categories
  3. Video projects
  4. Video project, Sources tab
  5. Video project, Script tab
  6. Source library
  7. New source, opened from a project

## 7. Spec-time assumptions

These were not decided on a ticket. They are filled in here so the spec is complete. Confirm or change them when reviewing.

1. **Saving:** everything saves automatically. Script text saves on change, debounced to about 1 s, together with its `word_count`. There is no Save button except on the source form.
2. **Video project list order:** most recently updated first, with no sort or filter controls (as in the mockup).
3. **Deleting a video project** asks for a confirmation that names the project and says its sources stay in the library.
4. **Category colours on a dark-only theme:** the palette only has to be readable on dark. The earlier "light and dark" requirement fell away with the dark-only decision.
5. **Empty states:** each list shows a short line of text when it has nothing to show, for example "No ideas yet — capture one above." These follow the style of the hint on the project list.
