import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { getDescriptionFooter } from "@/db";
import { FooterCard } from "./footer-card";

const SUBTITLE =
  "App-wide settings. For now there is one: the footer added to every video description.";

/** Settings (spec §5.2, Figma F4). */
export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" subtitle={SUBTITLE} />
      <Suspense>
        <Footer />
      </Suspense>
    </>
  );
}

async function Footer() {
  return <FooterCard saved={await getDescriptionFooter()} />;
}
