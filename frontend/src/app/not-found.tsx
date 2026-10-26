import Link from "next/link";
import { PageHeader } from "@/components/page-header";

export default function NotFound() {
  return (
    <>
      <PageHeader
        title="Not found"
        subtitle="This page has wandered off into the mist."
      />
      <Link
        href="/ideas"
        className="text-[17px] text-accent-glow hover:underline"
      >
        Back to the idea list
      </Link>
    </>
  );
}
