import { beforeEach, describe, expect, it } from "vitest";
import {
  finalOption,
  isDuplicateOption,
  matchesTitle,
} from "@/lib/title-options";
import { type Db, openDb } from "./connection";
import { createIdea } from "./ideas";
import {
  getVideoProject,
  makeVideoProject,
  updateVideoProject,
} from "./projects";
import {
  addTitleOption,
  deleteTitleOption,
  editTitleOption,
  listTitleOptions,
  markTitleOptionFinal,
  reorderTitleOptions,
} from "./title-options";

let db: Db;
let projectId: string;

beforeEach(() => {
  db = openDb(":memory:");
  const ideaId = createIdea(db, "Ragnarök: How the World Ends")?.id ?? "";
  projectId = makeVideoProject(db, ideaId)?.id ?? "";
});

const texts = () => listTitleOptions(db, projectId).map((o) => o.text);
const title = () => getVideoProject(db, projectId)?.title;
const final = () =>
  finalOption(listTitleOptions(db, projectId), title() ?? "")?.text;
const add = (text: string) => {
  const result = addTitleOption(db, projectId, text);
  if (!result.ok) throw new Error(result.reason);
  return result.option;
};

describe("matching rules", () => {
  it("ignores surrounding spaces but nothing else", () => {
    expect(matchesTitle("  Loki ", "Loki")).toBe(true);
    expect(matchesTitle("loki", "Loki")).toBe(false);
    expect(matchesTitle("Loki!", "Loki")).toBe(false);
  });

  it("finds duplicates ignoring case, except the option itself", () => {
    const options = [
      { id: "a", text: "Loki" },
      { id: "b", text: "Fenrir" },
    ];
    expect(isDuplicateOption(options, " loki ")).toBe(true);
    expect(isDuplicateOption(options, "LOKI", "a")).toBe(false);
    expect(isDuplicateOption(options, "Odin")).toBe(false);
  });
});

describe("a new project", () => {
  it("starts with one option, its title, already final", () => {
    expect(texts()).toEqual(["Ragnarök: How the World Ends"]);
    expect(final()).toBe("Ragnarök: How the World Ends");
  });
});

describe("adding", () => {
  it("appends a trimmed option", () => {
    add("  The Norse Apocalypse Explained ");
    expect(texts()).toEqual([
      "Ragnarök: How the World Ends",
      "The Norse Apocalypse Explained",
    ]);
  });

  it("refuses a duplicate ignoring case, and blank text", () => {
    add("The Norse Apocalypse Explained");
    expect(
      addTitleOption(db, projectId, "the norse apocalypse explained"),
    ).toEqual({ ok: false, reason: "duplicate" });
    expect(addTitleOption(db, projectId, "   ")).toEqual({
      ok: false,
      reason: "blank",
    });
    expect(texts()).toHaveLength(2);
  });
});

describe("mark as final", () => {
  it("sets the project title to the option's text", () => {
    const option = add("The Norse Apocalypse Explained");
    markTitleOptionFinal(db, option.id);
    expect(title()).toBe("The Norse Apocalypse Explained");
    expect(final()).toBe("The Norse Apocalypse Explained");
    expect(texts()).toHaveLength(2);
  });

  it("keeps an old title that wasn't an option", () => {
    const other = add("Fimbulwinter");
    // The title matches no option, as after a rename with no final option.
    db.$client
      .prepare(
        "update video_project set title = 'Old working title' where id = ?",
      )
      .run(projectId);
    markTitleOptionFinal(db, other.id);
    expect(title()).toBe("Fimbulwinter");
    expect(texts()).toEqual([
      "Ragnarök: How the World Ends",
      "Fimbulwinter",
      "Old working title",
    ]);
  });
});

describe("renaming in the header", () => {
  it("renames the final option so it stays final", () => {
    add("Fimbulwinter");
    updateVideoProject(db, projectId, { title: "Ragnarök Explained" });
    expect(texts()).toEqual(["Ragnarök Explained", "Fimbulwinter"]);
    expect(final()).toBe("Ragnarök Explained");
  });

  it("makes a matching other option final, keeping the old one's text", () => {
    add("Fimbulwinter");
    updateVideoProject(db, projectId, { title: " Fimbulwinter " });
    expect(texts()).toEqual(["Ragnarök: How the World Ends", "Fimbulwinter"]);
    expect(final()).toBe("Fimbulwinter");
  });

  it("only renames the project when no option is final", () => {
    db.$client
      .prepare("update video_project set title = 'Working title' where id = ?")
      .run(projectId);
    updateVideoProject(db, projectId, { title: "New title" });
    expect(title()).toBe("New title");
    expect(texts()).toEqual(["Ragnarök: How the World Ends"]);
  });
});

describe("editing in the list", () => {
  it("renames the project when the final option is edited", () => {
    const [seed] = listTitleOptions(db, projectId);
    editTitleOption(db, seed.id, "Ragnarök: The End of the Gods");
    expect(title()).toBe("Ragnarök: The End of the Gods");
    expect(final()).toBe("Ragnarök: The End of the Gods");
  });

  it("leaves the project title alone for another option", () => {
    const other = add("Fimbulwinter");
    editTitleOption(db, other.id, "The Fimbulwinter");
    expect(title()).toBe("Ragnarök: How the World Ends");
    expect(texts()).toEqual([
      "Ragnarök: How the World Ends",
      "The Fimbulwinter",
    ]);
  });

  it("refuses a duplicate but allows a change of case to itself", () => {
    const other = add("Fimbulwinter");
    expect(
      editTitleOption(db, other.id, "ragnarök: how the world ends"),
    ).toEqual({ ok: false, reason: "duplicate" });
    expect(editTitleOption(db, other.id, "FIMBULWINTER")).toMatchObject({
      ok: true,
    });
  });
});

describe("deleting and reordering", () => {
  it("can't delete the final option", () => {
    const [seed] = listTitleOptions(db, projectId);
    expect(() => deleteTitleOption(db, seed.id)).toThrow();
    expect(texts()).toHaveLength(1);
  });

  it("deletes another option at once", () => {
    const other = add("Fimbulwinter");
    deleteTitleOption(db, other.id);
    expect(texts()).toEqual(["Ragnarök: How the World Ends"]);
  });

  it("reorders, and refuses an order that isn't exactly the options", () => {
    const [seed] = listTitleOptions(db, projectId);
    const a = add("Fimbulwinter");
    const b = add("Odin's Last Stand");
    reorderTitleOptions(db, projectId, [b.id, seed.id, a.id]);
    expect(texts()).toEqual([
      "Odin's Last Stand",
      "Ragnarök: How the World Ends",
      "Fimbulwinter",
    ]);
    expect(() => reorderTitleOptions(db, projectId, [a.id, b.id])).toThrow();
  });
});
