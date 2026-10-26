import path from "node:path";
import Image from "next/image";
import { Suspense } from "react";
import { getBackupStatus } from "@/db";
import { backupAge, backupWhen } from "@/lib/format";
import { BackUpNowButton } from "./back-up-now-button";

/** The sidebar's backup card: when and where, any failure, Back up now. */
export function BackupCard() {
  return (
    <section
      aria-label="Backup"
      className="flex flex-col gap-2.5 rounded-[14px] border border-border-soft bg-surface-2 p-3.5"
    >
      <div className="flex items-center gap-2">
        <Image src="/design/icon-moon.svg" alt="" width={16} height={16} />
        <h2 className="font-label font-semibold text-[11px] text-fg-muted uppercase tracking-[0.88px]">
          Last backup
        </h2>
      </div>
      <Suspense fallback={<p className="text-[16px] text-fg-muted">…</p>}>
        <BackupDetails />
      </Suspense>
      <BackUpNowButton />
    </section>
  );
}

/** The folder people recognise, e.g. "OneDrive" for the default location. */
function place(dir: string): string {
  return path.basename(path.dirname(dir)) || path.basename(dir) || dir;
}

async function BackupDetails() {
  const status = await getBackupStatus();
  const now = new Date();
  return (
    <>
      <p className="text-[16px] text-fg" title={status.dir}>
        {status.lastAt
          ? `${backupWhen(status.lastAt, now)} · ${place(status.dir)}`
          : "No backup yet"}
      </p>
      {status.error && (
        <div
          role="alert"
          className="flex flex-col gap-1 rounded-lg border border-danger/60 bg-danger/10 px-2.5 py-2"
        >
          <p className="font-label font-semibold text-danger text-xs">
            Backup failed
          </p>
          <p className="break-words font-label text-[11px] text-fg-muted">
            {status.error.message}
          </p>
          <p className="font-label text-[11px] text-fg">
            {status.lastAt
              ? `Last good backup: ${backupAge(status.lastAt, now)}`
              : "No backup has succeeded yet."}
          </p>
        </div>
      )}
    </>
  );
}
