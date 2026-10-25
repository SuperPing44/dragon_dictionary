import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-0.5">
      <h1 className="font-bold font-heading text-[34px] text-fg">{title}</h1>
      <p className="min-h-[1lh] text-[17px] text-fg-muted italic">{subtitle}</p>
    </header>
  );
}
