import Image from "next/image";
import { Suspense } from "react";
import { type SidebarCounts, sidebarCounts } from "@/db";
import { BackupCard } from "./backup-card";
import { NavLink, NavLinkView } from "./nav-link";

const ENTRIES = [
  {
    href: "/ideas",
    label: "Idea list",
    icon: "/design/icon-sparkle-nav.svg",
    count: "ideas",
  },
  {
    href: "/projects",
    label: "Video projects",
    icon: "/design/icon-scroll.svg",
    count: "videoProjects",
  },
  {
    href: "/sources",
    label: "Source library",
    icon: "/design/icon-book.svg",
    count: "sources",
  },
  {
    href: "/categories",
    label: "Categories",
    icon: "/design/icon-tag.svg",
    count: "categories",
  },
] as const;

export function Sidebar() {
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col gap-1.5 border-border-soft border-r bg-surface-1 px-[18px] pt-7 pb-6">
      <div className="flex items-center gap-3 px-1.5 pb-[18px]">
        <Image
          src="/design/emblem.svg"
          alt=""
          width={44}
          height={44}
          priority
        />
        <div className="flex flex-col font-bold font-logo text-[19px] leading-[22px]">
          <span className="text-accent-glow">Dragon</span>
          <span className="text-fg">Dictionary</span>
        </div>
      </div>
      <p
        aria-hidden
        className="whitespace-pre text-center font-label text-[11px] text-accent tracking-[2.2px]"
      >
        {"✦  ·  ✧  ·  ✦"}
      </p>
      <div className="h-3.5" />
      <nav className="flex flex-col gap-1.5">
        <Suspense fallback={<NavEntries placeholder />}>
          <CountedNavEntries />
        </Suspense>
      </nav>
      <span className="flex-1" />
      <BackupCard />
    </aside>
  );
}

async function CountedNavEntries() {
  return <NavEntries counts={await sidebarCounts()} />;
}

function NavEntries({
  counts,
  placeholder,
}: {
  counts?: SidebarCounts;
  placeholder?: boolean;
}) {
  const Entry = placeholder ? NavLinkView : NavLink;
  return ENTRIES.map((entry) => (
    <Entry
      key={entry.href}
      href={entry.href}
      label={entry.label}
      icon={entry.icon}
      count={counts?.[entry.count]}
    />
  ));
}
