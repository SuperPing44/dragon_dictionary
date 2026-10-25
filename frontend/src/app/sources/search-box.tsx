"use client";

import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const DELAY_MS = 250;

/** Searches title and author as you type, keeping the rest of the URL. */
export function SearchBox() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [text, setText] = useState(params.get("q") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function change(value: string) {
    setText(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const next = new URLSearchParams(params);
      if (value.trim()) next.set("q", value.trim());
      else next.delete("q");
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    }, DELAY_MS);
  }

  return (
    <label className="flex w-[320px] items-center gap-2.5 rounded-xl border border-border-strong bg-surface-2 px-3.5 py-[9px] focus-within:border-accent">
      <Image src="/design/icon-search.svg" alt="" width={18} height={18} />
      <input
        type="search"
        value={text}
        onChange={(e) => change(e.target.value)}
        placeholder="Search title or author"
        aria-label="Search title or author"
        className="min-w-0 flex-1 bg-transparent text-[17px] text-fg outline-none placeholder:text-fg-faint"
      />
    </label>
  );
}
