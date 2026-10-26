import { IDEA_SORTS, type IdeaSort } from "@/db/ideas";

export type IdeaSearch = {
  sort: IdeaSort;
  idea?: string;
  /** Category filter (OR); empty shows every idea. */
  cats: string[];
};

type Params = Record<string, string | string[] | undefined>;

const all = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value : value ? [value] : []).filter(Boolean);

/** Reads the idea list's URL state; anything unknown falls back to defaults. */
export function parseIdeaSearch(params: Params): IdeaSearch {
  const [sort] = all(params.sort);
  return {
    sort: IDEA_SORTS.includes(sort as IdeaSort) ? (sort as IdeaSort) : "rating",
    idea: all(params.idea)[0],
    cats: [...new Set(all(params.cat))],
  };
}

/** The idea list URL for a sort, selection and filter; defaults are left out. */
export function ideaHref({ sort, idea, cats }: IdeaSearch): string {
  const params = new URLSearchParams();
  if (sort !== "rating") params.set("sort", sort);
  for (const cat of cats) params.append("cat", cat);
  if (idea) params.set("idea", idea);
  const query = params.toString();
  return query ? `/ideas?${query}` : "/ideas";
}

/** The filter with one category switched on or off. */
export function toggleCat(cats: string[], id: string): string[] {
  return cats.includes(id) ? cats.filter((c) => c !== id) : [...cats, id];
}
