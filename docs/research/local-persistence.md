# Research: local persistence for a laptop-only Next.js 16 app

Ticket: #2 (child of map #1). Researched 2026-10-23.

**Question.** How can Dragon Dictionary store its data (ideas, videos, scripts, sources, categories) and uploaded files (PDF sources, later thumbnail drafts) on the one Windows laptop it runs on, from Next.js 16 server code? For each option this note covers Next.js 16 compatibility, setup effort, migrations and backups.

**Constraints, from `docs/CONTEXT.md` and the repo.** The app has one user and no auth, runs on one Windows laptop, and holds a small amount of data (hundreds of rows, some PDFs). The stack is Next.js 16.4.2, React 19.3, Node 26.11.1 on the laptop, and `frontend/next.config.ts` turns on **`cacheComponents: true`**, which matters for synchronous drivers (see §1).

---

## TL;DR / recommendation

- **Database:** a single SQLite file, opened by **`better-sqlite3`** and accessed through **Drizzle ORM (stable 0.45.x)**. Run migrations with `drizzle-kit generate`, which writes SQL files that are committed to the repo, and apply them at startup with `migrate()`.
  - Second choice: **`node:sqlite`** with no extra dependency. It is a Release Candidate in Node, and Drizzle supports it only in the 1.0 RC line. It becomes the better choice once both are stable.
- **Files:** store plain files in a data folder outside the repo (for example `%USERPROFILE%\DragonDictionary\files\`), named by generated id. The database stores only the relative path and metadata. Serve the files through a Route Handler, not `public/`.
- **Backups:** the whole app state is one folder (`app.db` plus `files/`). Copy the database with the SQLite online-backup API or `VACUUM INTO`, never by copying the raw file while the app has it open. Copy `files/` as-is.
- **Avoid Prisma here.** v7 needs a driver adapter, a generated client, `prisma.config.ts` and ESM. That is all overhead with no benefit at this scale.
- **Avoid libSQL here.** Its async client and Turso features target remote or edge use, which this app doesn't need.

---

## 1. Next.js 16 constraints that apply to every option

1. **Native/DB packages are already externalised.** Next bundles server dependencies by default, but it keeps a built-in list of packages that stay unbundled and are loaded with native `require`. The list includes `better-sqlite3`, `sqlite3`, `libsql`, `@libsql/client`, `prisma` and `@prisma/client`. So none of them needs `serverExternalPackages` config.
   Source: `frontend/node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverExternalPackages.md`; `next/dist/lib/server-external-packages.jsonc`.
2. **Synchronous drivers interact with Cache Components.** With `cacheComponents` on, synchronous I/O is treated as "predictable" and gets **prerendered into the static shell at build time**: "This includes queries to embedded databases with synchronous APIs, such as `better-sqlite3` or Node.js's built-in `node:sqlite`." Pages that read live data must therefore call `await connection()` (`next/server`) or `await io()` (`next/cache`, added in v16.3.0) before the query, inside a `<Suspense>` boundary. The `io()` docs name `node:sqlite` explicitly, and they say to "Prefer `io()` over `connection()`". Async drivers (libSQL, Prisma) suspend on their own `await`, but a sync driver needs this one-line guard in its data-access layer.
   Source: `next/dist/docs/01-app/01-getting-started/08-caching.md` ("Predictable values"); `next/dist/docs/01-app/03-api-reference/04-functions/io.md`.
   **Implication:** put DB reads behind a small `db/` module whose query functions are `async` and start with `await io()`.
3. **Upload size.** "Action requests are capped at 1MB by default". PDFs and images will exceed that, so either raise `serverActions.bodySizeLimit` or upload through a Route Handler with `await request.formData()`.
   Source: `next/dist/docs/01-app/02-guides/server-actions.md`; `.../next-config-js/serverActions.md`; `.../file-conventions/route.md`.
4. **`public/` is for static assets.** Next serves files from `public/` at `/` with `Cache-Control: public, max-age=0`. User uploads written there at runtime would mix user data into the source tree. Keep uploads outside the repo and stream them through a Route Handler (`GET /files/[id]`).
   Source: `next/dist/docs/01-app/03-api-reference/03-file-conventions/public-folder.md`.

## 2. SQLite drivers

| | `better-sqlite3` 13.0.3 | `node:sqlite` (built into Node 26) | `@libsql/client` 0.18.0 |
|---|---|---|---|
| API | Synchronous | Synchronous (`Database`, `Statement`; `DatabaseSync` is now a deprecated alias) | Async (Promise-based) |
| Status | Stable, mature | **Stability 1.2, Release Candidate** (since v25.7.0); unflagged since v22.13 / v23.4 | Stable; built for Turso/remote |
| Next.js 16 | On the auto-external list. Needs `io()`/`connection()` (§1.2) | Built-in, nothing to bundle. Needs `io()`/`connection()` (§1.2) | On the auto-external list. Suspends naturally |
| Install on Windows | Prebuilt `win32-x64` binary ships **inside** the npm package (13.x uses `node-addon-api`, `gypfile: false`), so no Visual Studio build tools are needed | None | Native binary via npm |
| Backup | `db.backup(path)` (online backup API) or `VACUUM INTO` | `sqlite.backup(sourceDb, path)` returns a Promise (added v23.8 / v22.16); or `VACUUM INTO` | `VACUUM INTO` via `execute` |
| Bundled SQLite | Own copy | 3.53.4 on this laptop (`process.versions.sqlite`) | Own fork (libSQL) |

Sources:
- better-sqlite3: npm tarball `better-sqlite3@13.0.3` (`package.json` engines `node >=22`, `prebuilds/win32-x64.node`, `dependencies: node-addon-api`), published 2026-08-05; [troubleshooting.md](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/troubleshooting.md).
- node:sqlite: [nodejs.org/api/sqlite.html](https://nodejs.org/api/sqlite.html), including the stability index, history table and `sqlite.backup()` section. Verified locally with `require('node:sqlite')` exports on Node 26.11.1.
- libSQL: [docs.turso.tech/sdk/ts/reference](https://docs.turso.tech/sdk/ts/reference) ("Each method … returns a `Promise<ResultSet>`"; `url: "file:path/to/db-file.db"` is supported, but not from `/web`).

**Assessment.**
- **better-sqlite3** is the most proven choice, and the old Windows pain point (native compilation) is gone in 13.x.
- **node:sqlite** has no dependency and its API is close to better-sqlite3's. But it is still RC, and it renamed `DatabaseSync` to `Database` recently, so the API is still moving.
- **libSQL** gives a single user on one laptop nothing that plain SQLite doesn't.

## 3. ORMs / query builders

| | Drizzle ORM 0.45.4 + drizzle-kit 0.31.11 | Prisma ORM 7.10.1 (8.0 in RC) | Raw SQL / Kysely 0.29 |
|---|---|---|---|
| SQLite drivers | `drizzle-orm/better-sqlite3`, `drizzle-orm/libsql`. **`drizzle-orm/node-sqlite` exists only in 1.0 RC** (`drizzle-orm@rc` = 1.0.0-rc.5); it is not in 0.45.4 (checked in the tarball) | v7 **requires a driver adapter for all databases**, e.g. `@prisma/adapter-better-sqlite3` or `@prisma/adapter-libsql` | Any driver |
| Setup | Schema in TS, `drizzle.config.ts`, no codegen step | `schema.prisma` + `prisma.config.ts`; the `prisma-client` generator needs an **`output` path**; client is generated into the repo; "ships as an ES module", and the guide says to set `"type": "module"` | Minimal; Kysely needs hand-written table types |
| Migrations | `drizzle-kit generate` writes `drizzle/<timestamp>/migration.sql` + `snapshot.json`. Apply with `drizzle-kit migrate`, or `migrate()` at startup. `drizzle-kit push` is for prototyping | `prisma migrate dev` (SQL files in `prisma/migrations`) | Hand-rolled, e.g. numbered `.sql` files + `PRAGMA user_version` |
| Fit here | Thin, sync-friendly, type-safe, SQL-shaped | Heaviest toolchain. v7/v8 churn (8.0 RC is `latest` on npm) | Fine for a tiny schema, but you own the migration runner |

Sources: [orm.drizzle.team/docs/get-started-sqlite](https://orm.drizzle.team/docs/get-started-sqlite); [orm.drizzle.team/docs/migrations](https://orm.drizzle.team/docs/migrations); [prisma.io/docs/orm/overview/databases/sqlite](https://www.prisma.io/docs/orm/overview/databases/sqlite); [prisma.io/docs/guides/upgrade-prisma-orm/v7](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7); `npm view <pkg> dist-tags` on 2026-10-23.

**Note on versions.** Drizzle's docs now tell readers to install `drizzle-orm@rc`. The stable `latest` tag is still 0.45.4, and the 1.0 RC changes migration folder layout and driver support. Pin to stable 0.45.x + `better-sqlite3` now. If the project wants `node:sqlite` later, moving to Drizzle 1.0 and swapping the driver is a small change, because the schema and query code stay the same.

## 4. File storage (PDFs, thumbnail drafts)

There are two realistic options:

1. **Files on disk, metadata in SQLite (recommended).**
   - **Upload:** a Route Handler reads `await request.formData()`, writes each file with `node:fs/promises` into `<dataDir>/files/<uuid>.<ext>`, then inserts a row with the original name, MIME type, size and relative path.
   - **Serve:** a Route Handler streams the file with the right `Content-Type`, which lets the browser's built-in PDF viewer open PDFs in a tab.
   - **Trade-offs:** the database stays small, files open in any tool, and backup is a plain folder copy. The one risk is an orphaned file or a dangling row, so delete the row and the file together.
2. **BLOBs in SQLite.** Everything lives in one file, which makes backup atomic. But the database grows with every PDF, every backup copies all PDFs, and Next has no ready-made streaming for this. This is workable at this scale but offers little gain.

**Where the data lives.** Read one root directory from an env var (e.g. `DATA_DIR`) and default it to a folder outside `frontend/`, so `git clean` or a re-clone can't delete user data. Add the data folder to `.gitignore` if it is ever placed inside the repo.

## 5. Backup friendliness

- SQLite in WAL mode (recommended for concurrent reads during writes) keeps committed transactions in `app.db-wal` until a checkpoint. The SQLite docs warn: "If a database file is separated from its WAL file, then transactions that were previously committed to the database might be lost, or the database file might become corrupted." Never back up by copying `app.db` alone while the app runs. [sqlite.org/wal.html](https://www.sqlite.org/wal.html)
- **Safe live snapshots:**
  - The online backup API (`better-sqlite3` `db.backup()`, or `node:sqlite` `backup()`), which is incremental, and "The backed-up database can be used normally during the backup process."
  - `VACUUM INTO 'backup.db'`, which gives "a consistent snapshot of the original database". It is compact, and the target file must not already exist.

  Sources: [nodejs.org/api/sqlite.html](https://nodejs.org/api/sqlite.html#sqlitebackupsourcedb-path-options), [sqlite.org/lang_vacuum.html](https://www.sqlite.org/lang_vacuum.html).
- **Suggested MVP:**
  - A "Back up now" action (or `npm run backup` script) runs `VACUUM INTO <backupDir>/app-<date>.db` and copies `files/` next to it.
  - The data folder can also sit in a OneDrive-synced location, as long as the live `.db` and its `-wal` are excluded from the sync and only the snapshots are synced.
- **Copying the folder while the app is stopped is also safe.** On a clean close, SQLite checkpoints the WAL and deletes it.

## 6. Open points for the implementer

- Decide `DATA_DIR` default and backup location (user decision).
- Pick WAL vs default rollback journal. WAL is the usual choice, and either works for one user.
- Confirm in a spike that `await io()` before sync queries works under `cacheComponents` in dev and in `next build` + `next start`.
