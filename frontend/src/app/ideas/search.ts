import { IDEA_SORTS, type IdeaSort } from "@/db/ideas";

export type IdeaSearch = { sort: IdeaSort; idea?: string };

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

/** Reads the idea list's URL state; anything unknown falls back to defaults. */
export function parseIdeaSearch(
  params: Record<string, string | string[] | undefined>,
): IdeaSearch {
  const sort = first(params.sort);
  return {
    sort: IDEA_SORTS.includes(sort as IdeaSort) ? (sort as IdeaSort) : "rating",
    idea: first(params.idea) || undefined,
  };
}

/** The idea list URL for a sort and selection; defaults are left out. */
export function ideaHref({ sort, idea }: IdeaSearch): string {
  const params = new URLSearchParams();
  if (sort !== "rating") params.set("sort", sort);
  if (idea) params.set("idea", idea);
  const query = params.toString();
  return query ? `/ideas?${query}` : "/ideas";
}
