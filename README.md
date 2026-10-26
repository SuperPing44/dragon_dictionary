# Dragon Dictionary

A personal web app for planning, researching, writing and presenting videos for the YouTube channel **Forest Dragon**: an idea list, video projects with a script editor, and a shared source library. It runs locally on one laptop; there are no accounts and no cloud.

- Concept and glossary: [`docs/CONTEXT.md`](docs/CONTEXT.md)
- MVP v1 spec: [`docs/spec/mvp-v1.md`](docs/spec/mvp-v1.md)
- Decisions: [`docs/adr/`](docs/adr/)
- The app itself (Next.js): [`frontend/`](frontend/)

## Everyday use: the daily copy

The app you use every day runs from a **separate clone**, always on `main`, as a production build. Development happens in another clone, so a half-finished change never touches your data.

### Set it up once

You need [Git](https://git-scm.com/) and [Node.js](https://nodejs.org/) 26, the version the app is developed and tested with.

1. Clone the repository into `C:\Users\kirch\DragonDictionaryApp`, on `main`:

   ```cmd
   git clone --branch main https://github.com/SuperPing44/dragon_dictionary.git C:\Users\kirch\DragonDictionaryApp
   ```

2. Install and build it: double-click `update.cmd` in that folder.
3. Create the desktop shortcut:

   ```cmd
   cd C:\Users\kirch\DragonDictionaryApp
   powershell -ExecutionPolicy Bypass -File create-shortcut.ps1
   ```

### Start and stop

- **Start:** double-click **Dragon Dictionary** on the desktop. A console window opens, the app starts on <http://localhost:3210> and the browser opens it. If the app is already running, the shortcut only opens the browser tab.
- **Stop:** close the console window.

### Update

1. Close the app's console window.
2. Double-click `update.cmd`. It refuses to run while the app is running, then pulls `main`, installs and builds.
3. Start the app again. Database changes from the update are applied at this start, after a backup.

If an update fails, fix the cause shown in the window and run `update.cmd` again before starting the app.

## Your data

| What | Where | Change it with |
|---|---|---|
| Database and PDFs | `%USERPROFILE%\DragonDictionary\` (`app.db`, `files\<source>\<file>.pdf`) | the `DATA_DIR` environment variable |
| Backups | `%USERPROFILE%\OneDrive\DragonDictionary Backups\` | the `BACKUP_DIR` environment variable |

Both live outside the repository, so updating or re-cloning never touches them.

### Backups

A backup is a dated folder, for example `2026-10-26_09-12-05`, holding a copy of the database (`app.db`) and of the `files` folder. Backups are made:

- when the app starts, if the last backup is more than 24 hours old;
- always before an update changes the database;
- when you press **Back up now** in the sidebar.

The newest 10 are kept. The sidebar shows when the last backup ran; if one fails, a warning with the age of the last good backup stays there until a backup succeeds.

### Restore a backup

1. **Stop the app** (close its console window).
2. Open the data folder, `%USERPROFILE%\DragonDictionary\`.
3. Move the current `app.db`, `app.db-wal`, `app.db-shm` and `files` somewhere safe, for example into a folder named `before-restore`. The `-wal` and `-shm` files must not stay next to a restored `app.db`.
4. Copy `app.db` and the `files` folder from the backup you want into the data folder.
5. **Start the app.**

## Development

Work happens in a separate clone on a feature branch, merged into `development`; `development` is merged into `main` when a version is ready. From `frontend/`:

| Command | What it does |
|---|---|
| `npm run dev` | Development server on <http://localhost:3000> |
| `npm test` | Unit tests (Vitest) |
| `npm run lint` | Biome lint and format check |
| `npm run build` | Production build |
| `npm run db:generate` | Create a migration after changing `src/db/schema.ts` |

Use `DATA_DIR` and `BACKUP_DIR` to keep development data away from your real data, for example:

```cmd
set DATA_DIR=%TEMP%\dragon-dev-data
set BACKUP_DIR=%TEMP%\dragon-dev-backups
npm run dev
```
