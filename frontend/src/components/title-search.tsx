import Image from "next/image";

/** The title search of the board and the Archive. */
export function TitleSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (query: string) => void;
}) {
  return (
    <label className="flex w-[240px] items-center gap-2.5 rounded-xl border border-border-strong bg-surface-2 px-3.5 py-[9px] focus-within:border-accent">
      <Image src="/design/icon-search.svg" alt="" width={18} height={18} />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search titles…"
        aria-label="Search titles"
        className="min-w-0 flex-1 bg-transparent text-[15px] text-fg outline-none placeholder:text-fg-faint"
      />
    </label>
  );
}
