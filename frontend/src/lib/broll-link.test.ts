import { getSchema } from "@tiptap/core";
import { Node } from "@tiptap/pm/model";
import { describe, expect, it } from "vitest";
import { directionPosition, scriptItemHref, scriptItemTarget } from "./broll";
import { scriptExtensions } from "./script-schema";

const schema = getSchema(scriptExtensions);
const dir = (description: string) => ({
  type: "stageDirection",
  attrs: { description },
});
const doc = Node.fromJSON(schema, {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: "Long ago " }, dir("longship")],
    },
    { type: "paragraph", content: [dir(""), dir("old woman by a fire")] },
  ],
});

describe("open in script", () => {
  it("links to the Script tab with the entry and direction", () => {
    const href = scriptItemHref("p1", { sectionId: "s/1", index: 2 });
    expect(href).toBe("/projects/p1?entry=s%2F1&direction=2");
    const params = new URL(href, "http://x").searchParams;
    expect(scriptItemTarget(params)).toEqual({ sectionId: "s/1", index: 2 });
  });

  it("reads a link without a usable direction as just the entry", () => {
    expect(
      scriptItemTarget(new URLSearchParams("entry=s1&direction=x")),
    ).toEqual({ sectionId: "s1", index: undefined });
    expect(scriptItemTarget(new URLSearchParams("direction=1"))).toBe(
      undefined,
    );
  });

  it("finds a direction by its position among the entry's directions", () => {
    const at = (index: number) =>
      doc.nodeAt(directionPosition(doc, index) ?? -1)?.attrs.description;
    expect(at(0)).toBe("longship");
    // The empty direction still counts, as in the B-roll list.
    expect(at(1)).toBe("");
    expect(at(2)).toBe("old woman by a fire");
  });

  it("finds nothing when the script has changed", () => {
    expect(directionPosition(doc, 3)).toBeUndefined();
  });
});
