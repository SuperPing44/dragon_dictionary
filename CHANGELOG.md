# Changelog

All notable changes to Dragon Dictionary are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Script emphasis: bold, italic and underline with Ctrl+B / Ctrl+I / Ctrl+U or the new B / I / U buttons in the writing-area header, which show when a mark is active. The header now stays in view while a long section scrolls. Emphasis shows in the teleprompter too, and stage directions keep their own look. Strikethrough is turned off; old strikethrough is dropped and its text kept (#63).
- Script tab: a Sections | Full script toggle in the writing-area header, remembered across projects. Full script shows every section in outline order in one centred column, each under its heading (subsection titles editable in place) and still saved on its own; empty sections can be typed into. The outline stays: clicking an entry scrolls to it, and the section with the cursor (or at the top of the screen) is highlighted. Switching views keeps the place. B / I / U and Image act on the section with the cursor, ▷ Teleprompter starts there (or at the beginning), and B-roll jumps scroll to the direction. The writing-area header now wraps on narrow windows instead of scrolling sideways (#64).

## [0.5.0] - 2026-11-07

The Archive, as specified in [`docs/spec/v2.md`](docs/spec/v2.md) §5.4. Its migration runs at startup, with a backup taken first.

### Added

- Publishing: the seventh stage star opens a publish dialog with an optional YouTube link (an http(s) URL; a non-YouTube link gets a hint) and the publish date, prefilled with today or the kept date. Cancel leaves the project where it was. The link and date are kept when a project goes back to the board. The 0.5.0 migration adds both fields (#58).
- Archive screen: published projects, newest publish date first (no date last), each row with its final thumbnail or the dimmed dragon emblem, categories, publish date, length, and the YouTube link or an amber "Add link". The sidebar has an Archive entry with a count (#59).
- Archive filters: a title search, a category filter (any picked category, as on the board) and a year filter offering only years with published videos. The header reads "n of m shown · Clear filters" while filtering, and all filters reset when you leave the Archive (#60).
- Published projects: a Published row in the project header shows the publish date and YouTube link, both editable (the link can be cleared), plus "Open on YouTube ↗". The back link reads "← Archive" for a published project (#61).
- Kanban board: while a card is dragged, a gold Publish → Archive zone appears at the right edge. Dropping a card there opens the publish dialog; Cancel leaves the card where it was. A stage change now also renumbers the column the project left (#62).

## [0.4.0] - 2026-11-07

The Kanban board, as specified in [`docs/spec/v2.md`](docs/spec/v2.md) §5.3. Its migration runs at startup, with a backup taken first.

### Changed

- Video projects is now a Kanban board: one column per stage from Research to Upload, in manual order, with cards showing the final thumbnail, title, category dots, length and source count. Published projects leave the board, and the sidebar count covers the board only. New projects and stage changes land on top of their column (#55).
- Kanban board: drag a card to another column to change its stage (it lands on top), or within a column to reorder it. The target column is highlighted while dragging (#56).
- Kanban board: search titles and filter by categories. Non-matching cards are hidden, the counts show matches, and the header reads "n of m shown · Clear filters". The filter resets when you leave the board (#57).

## [0.3.0] - 2026-11-05

Video project fields, as specified in [`docs/spec/v2.md`](docs/spec/v2.md) §5.2. Its migration runs at startup, with a backup taken first.

### Added

- Publishing and Editing tabs on the video project page, with editing notes on the Editing tab, saved as you type. The database gains the 0.3.0 project fields (title options, tags, thumbnail drafts, B-roll items), and every existing project gets its title as its first title option (#46).
- Title options on the Publishing tab: add, edit, drag to reorder and delete title ideas, each with a length counter against YouTube's 100 characters. Mark as final sets the project title, the final option shows a gold Final badge, and renaming the project keeps the options in step (#47).
- Tags on the Publishing tab: chips added with Enter or a comma, kept as typed and unique ignoring case, removed with ✕ or Backspace. Typing suggests tags from other projects with how many use them, and Copy gives them comma-separated with a counter against YouTube's 500 characters (#48).
- Settings screen, opened from the bottom of the sidebar, with the description footer: plain text added after the source list in every project's copied description, saved as you type (#49).
- Description on the Publishing tab: your own text, saved as you type, with a live preview of the source list and footer that Copy description adds. Copy gives your text, the source list and the footer separated by blank lines, with a counter against YouTube's 5,000 characters (#50).
- Thumbnail drafts on the Publishing tab: upload PNG, JPEG, WebP or GIF images up to 20 MB by Upload or drag and drop, shown in a 16:9 grid with their pixel size (amber when not 16:9 or under 1280×720). Mark one as final, add a one-line note, and delete with a confirmation. Files are stored under files/thumbnails/ and removed with their draft or project (#51).
- Thumbnail drafts, enlarged: clicking a card opens it over the dimmed page, with ←/→ between drafts, Esc to close, its size and file details, Mark as final, Download under the original name, Delete and an editable note. Ctrl+V anywhere on the Publishing tab adds a pasted image as a draft (#52).
- B-roll list on the Editing tab: the script's image directions, live and in script order under their section headings, plus extra items of your own. Tick items as found (a progress bar shows n/m found), and Copy list gives lines like "Hook: wolf eye close-up". A found direction shows a small ✓ on its chip in the script editor (#53).
- B-roll list: clicking a script item opens the Script tab at its entry and scrolls to the image direction, which glows briefly. If the direction is gone, the entry still opens (#54).

## [0.2.0] - 2026-11-05

The teleprompter, as specified in [`docs/spec/v2.md`](docs/spec/v2.md) §5.1.

### Added

- Teleprompter: opened from the Script tab at the selected entry, it shows the script read-only in the "Broadcast" look and scrolls with Space to pause and resume (#43).
- Teleprompter keys: ↑/↓ speed (levels 1–20), +/− text size (32–96 px), ←/→ previous and next entry, Home back to the top and ? for the key hints. Speed and size are remembered app-wide (#44).
- Teleprompter fullscreen and wake lock: opening enters fullscreen, Esc there pauses, F goes back into fullscreen, and the screen stays awake while the teleprompter is open (#45).

## [0.1.0] - 2026-10-26

MVP v1, as specified in [`docs/spec/mvp-v1.md`](docs/spec/mvp-v1.md).

### Added

- Idea list with quick capture, an optional 1–10 rating, sorting, a category filter and a details panel.
- Shared coloured categories on ideas and video projects, with a categories screen to rename, merge and delete them.
- Video projects made from an idea, with a project list and a project page showing the stage and the original idea.
- Script editor with sections, subsections, drag reordering in the outline, and stage directions as inline image chips.
- Speaking-time estimate per section and for the whole script, using one app-wide speaking rate.
- Source library with one shared form for every source type and a duplicate-link warning.
- PDFs and quotes on a source.
- Sources tab on a video project with a copyable source list.
- Automatic backups to OneDrive: on start, before migrations and on demand, with the status shown in the sidebar.
- Daily copy started from a desktop shortcut, plus an update script.

[Unreleased]: https://github.com/SuperPing44/dragon_dictionary/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/SuperPing44/dragon_dictionary/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/SuperPing44/dragon_dictionary/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/SuperPing44/dragon_dictionary/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/SuperPing44/dragon_dictionary/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/SuperPing44/dragon_dictionary/releases/tag/v0.1.0
