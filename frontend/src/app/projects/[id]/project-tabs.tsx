"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { startTransition, useState } from "react";
import { deleteProject } from "../actions";

type ProjectTabsProps = {
  projectId: string;
  projectTitle: string;
  sourceCount: number;
};

/** Script | Sources (n), with Delete project on the tab bar. */
export function ProjectTabs({
  projectId,
  projectTitle,
  sourceCount,
}: ProjectTabsProps) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;
  const onSources = pathname === `${base}/sources`;
  const [confirming, setConfirming] = useState(false);

  const tabs = [
    { href: base, label: "Script", icon: "scroll", active: !onSources },
    {
      href: `${base}/sources`,
      label: `Sources · ${sourceCount}`,
      icon: "book",
      active: onSources,
    },
  ];

  return (
    <>
      <nav
        aria-label="Project tabs"
        className="flex items-start gap-7 border-border-soft border-b"
      >
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            scroll={false}
            aria-current={tab.active ? "page" : undefined}
            className={`-mb-px flex items-center gap-2 border-b-2 px-0.5 pb-3 font-bold font-heading text-[15px] ${
              tab.active
                ? "border-accent text-fg"
                : "border-transparent text-fg-faint hover:text-fg-muted"
            }`}
          >
            <Image
              src={`/design/tab-${tab.icon}-${tab.active ? "active" : "inactive"}.svg`}
              alt=""
              width={18}
              height={18}
            />
            {tab.label}
          </Link>
        ))}
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="font-label font-medium text-[13px] text-danger hover:underline"
        >
          Delete project
        </button>
      </nav>

      {confirming && (
        <section
          aria-label="Delete project"
          className="flex items-center gap-4 rounded-[18px] border border-danger bg-surface-1 px-5 py-4"
        >
          <div className="flex flex-1 flex-col gap-1">
            <h2 className="font-bold font-heading text-[17px] text-danger">
              Delete “{projectTitle}”?
            </h2>
            <p className="text-[16px] text-fg-muted">
              Its script and category links are deleted for good. Its sources
              stay in the source library.
            </p>
          </div>
          <button
            type="button"
            onClick={() => startTransition(() => deleteProject(projectId))}
            className="rounded-xl bg-danger px-[18px] py-2.5 font-bold font-heading text-[13px] text-canvas tracking-[0.78px]"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="rounded-xl px-[18px] py-2.5 font-bold font-heading text-[13px] text-accent-glow tracking-[0.78px]"
          >
            Cancel
          </button>
        </section>
      )}
    </>
  );
}
