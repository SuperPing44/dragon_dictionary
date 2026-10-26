import { beforeEach, describe, expect, it } from "vitest";
import {
  addIdeaCategory,
  categoriesByIdea,
  createCategory,
  deleteCategory,
  findCategoryByName,
  listCategories,
  listCategoriesWithUsage,
  mergeCategory,
  nextCategoryColour,
  removeIdeaCategory,
  renameCategory,
  setCategoryColour,
} from "./categories";
import { type Db, openDb } from "./connection";
import { createIdea, deleteIdea, listIdeas } from "./ideas";
import { CATEGORY_COLOURS, type CategoryColour } from "./schema";

let db: Db;
let clock: number;
const tick = () => new Date(Date.UTC(2026, 9, 1) + clock++ * 1000);

beforeEach(() => {
  db = openDb(":memory:");
  clock = 0;
});

const make = (name: string, colour: CategoryColour) =>
  createCategory(db, name, colour, tick());

describe("createCategory", () => {
  it("creates a category with a trimmed name", () => {
    expect(make("  Norse Mythology ", "violet")).toMatchObject({
      name: "Norse Mythology",
      colour: "violet",
    });
  });

  it("returns the existing category for the same name in other case", () => {
    const norse = make("Norse Mythology", "violet");
    expect(make("norse mythology", "rose")).toEqual(norse);
    expect(listCategories(db)).toHaveLength(1);
  });

  it("rejects a blank name and an unknown colour", () => {
    expect(() => make("  ", "violet")).toThrow();
    expect(() => make("Pop", "gold" as CategoryColour)).toThrow();
  });

  it("finds by name ignoring case", () => {
    const pop = make("Pop Culture", "fuchsia");
    expect(findCategoryByName(db, " POP CULTURE ")).toEqual(pop);
  });
});

describe("listCategories", () => {
  it("sorts A–Z ignoring case", () => {
    make("slavic", "rose");
    make("Celtic", "teal");
    make("norse", "violet");
    expect(listCategories(db).map((c) => c.name)).toEqual([
      "Celtic",
      "norse",
      "slavic",
    ]);
  });
});

describe("nextCategoryColour", () => {
  it("starts with the first palette colour", () => {
    expect(nextCategoryColour(db)).toBe("emerald");
  });

  it("takes the next unused colour after the newest category's", () => {
    make("a", "emerald");
    expect(nextCategoryColour(db)).toBe("teal");
    make("b", "sky");
    expect(nextCategoryColour(db)).toBe("indigo");
  });

  it("skips used colours and wraps around", () => {
    make("a", "teal");
    make("b", "slate");
    expect(nextCategoryColour(db)).toBe("emerald");
  });

  it("repeats colours once all are used, after the newest", () => {
    for (const [i, colour] of CATEGORY_COLOURS.entries()) make(`c${i}`, colour);
    expect(nextCategoryColour(db)).toBe("emerald");
    make("again", "sky");
    expect(nextCategoryColour(db)).toBe("indigo");
  });
});

describe("idea categories", () => {
  it("adds, lists A–Z and removes an idea's categories", () => {
    const hunt = createIdea(db, "The Wild Hunt");
    const norse = make("Norse Mythology", "violet");
    const folk = make("European Folklore", "emerald");
    const id = hunt?.id ?? "";

    addIdeaCategory(db, id, norse.id);
    addIdeaCategory(db, id, folk.id);
    addIdeaCategory(db, id, folk.id);
    expect(
      categoriesByIdea(db, [id])
        .get(id)
        ?.map((c) => c.name),
    ).toEqual(["European Folklore", "Norse Mythology"]);

    removeIdeaCategory(db, id, norse.id);
    expect(
      categoriesByIdea(db, [id])
        .get(id)
        ?.map((c) => c.name),
    ).toEqual(["European Folklore"]);
  });

  it("keeps an unused category, and deleting an idea removes its links", () => {
    const idea = createIdea(db, "Krampus");
    const folk = make("European Folklore", "emerald");
    addIdeaCategory(db, idea?.id ?? "", folk.id);

    deleteIdea(db, idea?.id ?? "");

    expect(listCategories(db)).toEqual([folk]);
    expect(
      db.$client.prepare("select count(*) as n from idea_category").get(),
    ).toEqual({ n: 0 });
  });
});

describe("listIdeas category filter", () => {
  it("shows ideas with any of the selected categories (OR)", () => {
    const norse = make("Norse", "violet");
    const folk = make("Folklore", "emerald");
    const pop = make("Pop", "fuchsia");
    const add = (title: string, ...cats: { id: string }[]) => {
      const idea = createIdea(db, title, tick());
      for (const c of cats) addIdeaCategory(db, idea?.id ?? "", c.id);
    };
    add("Loki", norse, pop);
    add("Krampus", folk);
    add("Fenrir", norse);
    add("Yggdrasil games", pop);
    add("Uncategorised");

    const titles = (ids: string[]) =>
      listIdeas(db, "title", ids).map((i) => i.title);
    expect(titles([norse.id])).toEqual(["Fenrir", "Loki"]);
    expect(titles([folk.id, pop.id])).toEqual([
      "Krampus",
      "Loki",
      "Yggdrasil games",
    ]);
    expect(titles([])).toHaveLength(5);
  });
});

describe("category management", () => {
  const link = (title: string, ...cats: { id: string }[]) => {
    const idea = createIdea(db, title, tick());
    for (const c of cats) addIdeaCategory(db, idea?.id ?? "", c.id);
    return idea?.id ?? "";
  };
  const namesOf = (ideaId: string) =>
    categoriesByIdea(db, [ideaId])
      .get(ideaId)
      ?.map((c) => c.name) ?? [];

  it("counts how many ideas use each category", () => {
    const norse = make("Norse", "violet");
    const pop = make("Pop", "fuchsia");
    make("Unused", "slate");
    link("Loki", norse, pop);
    link("Fenrir", norse);

    expect(
      listCategoriesWithUsage(db).map((c) => [
        c.name,
        c.ideas,
        c.videoProjects,
      ]),
    ).toEqual([
      ["Norse", 2, 0],
      ["Pop", 1, 0],
      ["Unused", 0, 0],
    ]);
  });

  it("changes a colour", () => {
    const norse = make("Norse", "violet");
    setCategoryColour(db, norse.id, "amber");
    expect(listCategories(db)[0].colour).toBe("amber");
    expect(() =>
      setCategoryColour(db, norse.id, "gold" as CategoryColour),
    ).toThrow();
  });

  it("renames everywhere, including a change of case", () => {
    const norse = make("Norse", "violet");
    const loki = link("Loki", norse);
    expect(renameCategory(db, norse.id, " Norse Mythology ")).toEqual({
      ok: true,
    });
    expect(renameCategory(db, norse.id, "norse mythology")).toEqual({
      ok: true,
    });
    expect(namesOf(loki)).toEqual(["norse mythology"]);
  });

  it("refuses a name another category has and reports it", () => {
    const norse = make("Norse Mythology", "violet");
    const myths = make("Norse Myths", "teal");
    expect(renameCategory(db, myths.id, "NORSE MYTHOLOGY")).toEqual({
      ok: false,
      conflict: norse,
    });
    expect(listCategories(db).map((c) => c.name)).toEqual([
      "Norse Mythology",
      "Norse Myths",
    ]);
    expect(() => renameCategory(db, myths.id, "  ")).toThrow();
  });

  it("merges links, keeping one where an item had both", () => {
    const norse = make("Norse Mythology", "violet");
    const myths = make("Norse Myths", "teal");
    const both = link("Loki", norse, myths);
    const onlyMyths = link("Fenrir", myths);
    const onlyNorse = link("Odin", norse);

    mergeCategory(db, myths.id, norse.id);

    expect(listCategories(db).map((c) => c.name)).toEqual(["Norse Mythology"]);
    expect(namesOf(both)).toEqual(["Norse Mythology"]);
    expect(namesOf(onlyMyths)).toEqual(["Norse Mythology"]);
    expect(namesOf(onlyNorse)).toEqual(["Norse Mythology"]);
  });

  it("deletes a category in use; the ideas keep everything else", () => {
    const norse = make("Norse", "violet");
    const pop = make("Pop", "fuchsia");
    const loki = link("Loki", norse, pop);

    deleteCategory(db, pop.id);

    expect(listCategories(db).map((c) => c.name)).toEqual(["Norse"]);
    expect(namesOf(loki)).toEqual(["Norse"]);
    expect(listIdeas(db).map((i) => i.title)).toEqual(["Loki"]);
  });
});
