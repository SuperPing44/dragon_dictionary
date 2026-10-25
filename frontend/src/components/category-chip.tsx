import type { CSSProperties, ReactNode } from "react";
import type { CategoryColour } from "@/db/schema";

/** The palette shade for a colour name, as a CSS colour. */
export function categoryColour(colour: CategoryColour): string {
  return `var(--color-category-${colour})`;
}

type CategoryChipProps = {
  name: string;
  colour: CategoryColour;
  /** Dimmed, e.g. a filter chip that is switched off. */
  dimmed?: boolean;
  /** Extra content after the name, such as a remove button. */
  children?: ReactNode;
};

export function CategoryChip({
  name,
  colour,
  dimmed,
  children,
}: CategoryChipProps) {
  const shade = categoryColour(colour);
  const style = {
    backgroundColor: `color-mix(in srgb, ${shade} 16%, transparent)`,
    borderColor: `color-mix(in srgb, ${shade} 55%, transparent)`,
  } satisfies CSSProperties;
  return (
    <span
      style={style}
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border py-[3px] pr-2.5 pl-2 font-label font-medium text-fg text-xs transition-opacity ${
        dimmed ? "opacity-40" : ""
      }`}
    >
      <span
        aria-hidden
        className="size-[7px] rounded-full"
        style={{ backgroundColor: shade }}
      />
      {name}
      {children}
    </span>
  );
}
