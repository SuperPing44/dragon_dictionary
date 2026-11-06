# Changelog

All notable changes to Dragon Dictionary are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Video projects is now a Kanban board: one column per stage from Research to Upload, in manual order, with cards showing the final thumbnail, title, category dots, length and source count. Published projects leave the board, and the sidebar count covers the board only. New projects and stage changes land on top of their column (#55).
- Kanban board: drag a card to another column to change its stage (it lands on top), or within a column to reorder it. The target column is highlighted while dragging (#56).

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

[Unreleased]: https://github.com/SuperPing44/dragon_dictionary/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/SuperPing44/dragon_dictionary/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/SuperPing44/dragon_dictionary/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/SuperPing44/dragon_dictionary/releases/tag/v0.1.0
