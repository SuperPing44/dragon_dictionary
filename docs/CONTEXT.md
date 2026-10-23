# Dragon Dictionary – Project Context

> A personal web app for planning, researching, writing and presenting YouTube videos for the channel **Forest Dragon**.
> This document describes the **concept**. Technical decisions (stack, database, hosting) come later.

---

## 1. Background

**Forest Dragon** is a YouTube channel about **mythology and folklore**, along with fantasy, religion and pop culture. The videos tell and explain legends, figures and belief systems, and trace their influence on modern pop culture.

**Typical structure of a video:**
- **Opening story sketch:** a short narrated scene as the opener
- **Explanation:** hook, intro, main part, outro
- **Closing story sketch:** a short scene to wrap up

The name "Dragon Dictionary" is a nod to the channel name. The app is the reference book and workshop behind the channel.

## 2. Users

- **Single user:** the channel owner
- No multi-user support, no roles, no sharing, no collaboration
- The app is used on a **laptop**, including for presenting.

## 3. Guiding Principles

1. **No AI.** The app does not write, research or rephrase anything itself. It organizes, stores and supports; the creative and content work stays with the creator.
2. **A tool, not an autopilot.** The app takes over admin work such as source lists or status tracking, but not the thinking.
3. **Focus on pre-production.** No YouTube integration for now. Everything ends with finished material ready to upload.
4. **Simple over complete.** Better a few features that work well than many half-finished ones.

## 4. Video Lifecycle

Every video goes through these stages:

```
Idea → Research → Script → Recording → Editing → Thumbnail → Upload → Published
```

- A video is in exactly **one** stage at any time.
- The stages are shown as a **Kanban board**, one column per stage.
- Ideas only become "real" videos once they are taken over from the idea list (see 5.1).

## 5. Feature Areas

### 5.1 Idea List with Rating *(MVP)*
- Quickly capture an idea: title or topic and a short note
- Each idea gets a **rating on a scale from 1 to 10**, and the list can be sorted by it
- Each idea gets one or more **categories** (e.g. "Norse Mythology", "Pop Culture") to filter by
- With one click an idea becomes a **video project** and moves onto the Kanban board
- The idea list is the backlog; the Kanban board is active production.

### 5.2 Script Editor *(MVP)*
- The script is divided into **sections**:
  - Story sketch (opening)
  - Hook
  - Intro
  - Main part (can have its own subsections)
  - Outro
  - Story sketch (closing)
- Sections can be added, removed and reordered.
- **Stage directions** sit directly in the text. There is only one kind: **show image**, e.g. "[Image: map of Scandinavia]". They are visually distinct from the spoken text.
- Optional: an **estimated speaking time** per section and for the whole script, calculated from the word count. Stage directions are not counted.

### 5.3 Source Management *(MVP)*
- Supported source types: **websites, books, PDFs, YouTube videos, scientific papers**
- Each source stores the relevant details: title, author, link or publisher, date and a personal note.
- PDFs can be stored as files.
- Sources are linked to one or more videos.
- Direct quotes are the exception. Where needed, a quote can be saved with a source.
- **Automatic source list:** from all sources of a video, the app generates a **simple link list** (title + link) to copy into the video description. No citation style is needed.

### 5.4 Video Management
Each video project bundles:
- Status (stage on the Kanban board)
- Categories (taken over from the idea, filterable)
- Script
- Sources
- **Title ideas** (several, one of them can be marked as final)
- **Thumbnail drafts** (upload images or sketches)
- **Tags**
- **Description** (including the automatically inserted source list)
- **Editing notes**
- **B-roll list**: images and clips needed; ideally the stage directions from the script are collected here automatically

### 5.5 Teleprompter
- Shows the script large and easy to read on the laptop.
- **Adjustable scroll speed**
- **Pause and resume**
- Controlled **by keyboard only** (e.g. space bar to pause, arrow keys for speed).
- Stage directions are hidden in the teleprompter or shown only subtly.
- Option to start directly at a specific section

### 5.6 Archive
- Published videos move to the **archive** and stay searchable there, e.g. by title or category.
- Each archived video stores the **link to the YouTube video**, entered by hand. This is the only connection to YouTube; there are no statistics or data pulled from it.

## 6. Scope of the First Version (MVP)

| Priority | Feature |
|---|---|
| **MVP** | Script editor with sections and stage directions |
| **MVP** | Source management including automatic source list |
| **MVP** | Idea list with rating |
| Next | Kanban board with the video lifecycle |
| Next | Video project with titles, thumbnails, tags, description, editing notes, B-roll |
| Next | Teleprompter with speed control and pause |
| Next | Archive of published videos with YouTube link |
| Later | Possible YouTube integration (deliberately left open) |

## 7. Out of Scope (Non-Goals)

- **No AI features.** No generating, rephrasing, summarizing or suggesting.
- **No automatic research.** The app does not search for sources or content.
- **No YouTube integration** in the first phase: no uploading, no statistics, no comments.
- **No multi-user support.**
- **No cross-video knowledge base**, i.e. no glossary of terms or characters. Beyond sharing topics, the videos are not linked to each other.

## 8. Glossary

| Term | Meaning |
|---|---|
| **Idea** | A video topic not yet started, kept in the idea list with a rating from 1 to 10 |
| **Video project** | A video in production, bundled with all its content |
| **Stage** | A step in the video lifecycle, i.e. a column on the Kanban board. The Idea stage is the idea list itself: a video project starts in Research and never returns to Idea |
| **Section** | Top-level part of the script, always of one fixed section kind; a script holds at most one section of each kind |
| **Section kind** | One of: opening story sketch, hook, intro, main part, outro, closing story sketch |
| **Subsection** | Freely titled part of the main part, one level deep; only the main part has subsections |
| **Story sketch** | Short narrated scene at the start and end of every video |
| **Stage direction** | Marker in the script where an image is shown; not spoken |
| **Source** | Website, book, PDF, YouTube video or paper linked to a video |
| **Source list** | Automatically generated link list of sources for the video description |
| **Category** | Topic of an idea or video (e.g. "Norse Mythology") with a colour, used for filtering; one shared list for ideas and video projects, names unique ignoring case |
| **Archive** | Collection of published videos, searchable, with a link to the YouTube video |
