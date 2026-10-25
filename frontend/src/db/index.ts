import { io } from "next/cache";
import { getDb } from "./connection";
import * as ideaQueries from "./ideas";

// Every query goes through here. better-sqlite3 is synchronous, so each read
// awaits io() first; otherwise cacheComponents would prerender it.

export async function listIdeas() {
  await io();
  return ideaQueries.listIdeas(getDb());
}

export async function createIdea(title: string) {
  await io();
  return ideaQueries.createIdea(getDb(), title);
}

export type SidebarCounts = {
  ideas: number;
  videoProjects: number;
  sources: number;
  categories: number;
};

export async function sidebarCounts(): Promise<SidebarCounts> {
  await io();
  const db = getDb();
  // Video projects, sources and categories arrive with their own tickets.
  return {
    ideas: ideaQueries.countIdeas(db),
    videoProjects: 0,
    sources: 0,
    categories: 0,
  };
}

export type { Idea } from "./schema";
