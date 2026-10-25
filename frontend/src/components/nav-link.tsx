"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLinkProps = {
  href: string;
  label: string;
  icon: string;
  count?: number;
};

/** A sidebar entry, highlighted when the current URL is inside it. */
export function NavLink(props: NavLinkProps) {
  const pathname = usePathname();
  const active =
    pathname === props.href || pathname.startsWith(`${props.href}/`);
  return <NavLinkView {...props} active={active} />;
}

/** A sidebar entry that doesn't read the URL (used while it streams in). */
export function NavLinkView({
  href,
  label,
  icon,
  count,
  active = false,
}: NavLinkProps & { active?: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
        active
          ? "border-border-strong bg-surface-3 shadow-[0_0_16px_rgb(157_107_255/0.25)]"
          : "border-transparent hover:bg-surface-2"
      }`}
    >
      <Image src={icon} alt="" width={20} height={20} />
      <span
        className={`flex-1 font-semibold text-lg ${active ? "text-fg" : "text-fg-muted"}`}
      >
        {label}
      </span>
      <span
        className={`font-label font-medium text-xs ${active ? "text-accent-glow" : "text-fg-faint"}`}
      >
        {count}
      </span>
    </Link>
  );
}
