import { beforeEach, describe, expect, it } from "vitest";
import {
  addIdeaCategory,
  categoriesByIdea,
  createCategory,
  findCategoryByName,
  listCategories,
  nextCategoryColour,
  removeIdeaCategory,
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
