import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { listCategoriesWithUsage, nextCategoryColour } from "@/db";
import { CategoriesManager } from "./categories-manager";

export default function CategoriesPage() {
  return (
    <Suspense
      fallback={
        <PageHeader
          title="Categories"
          subtitle="One shared list for ideas and video projects"
        />
      }
    >
      <Categories />
    </Suspense>
  );
}

async function Categories() {
  return (
    <CategoriesManager
      categories={await listCategoriesWithUsage()}
      defaultColour={await nextCategoryColour()}
    />
  );
}
