// PROTOTYPE — throwaway. Sample script so every variant starts populated.

import type { JSONContent } from "@tiptap/react";
import type { Body, Section } from "./script-model";

type Part = string | { img: string };

function body(...paragraphs: Part[][]): Body {
  const directions: string[] = [];
  let words = 0;
  const content: JSONContent[] = paragraphs.map((parts) => ({
    type: "paragraph",
    content: parts.map((p) => {
      if (typeof p === "string") {
        words += p.split(/\s+/).filter(Boolean).length;
        return { type: "text", text: p };
      }
      directions.push(p.img);
      return { type: "stageDirection", attrs: { description: p.img } };
    }),
  }));
  return { doc: { type: "doc", content }, words, directions };
}

export const SAMPLE: Section[] = [
  {
    id: "opening",
    kind: "opening",
    subsections: [],
    ...body([
      "The wolf was only a pup when the gods first noticed him. ",
      { img: "wolf pup in a dark forest, painted style" },
      " Tyr alone dared to feed him, and every day the pup grew larger.",
    ]),
  },
  {
    id: "hook",
    kind: "hook",
    subsections: [],
    ...body([
      "What do you do with a monster that hasn't done anything wrong yet? The Norse gods had an answer, and it cost one of them his hand.",
    ]),
  },
  {
    id: "intro",
    kind: "intro",
    subsections: [],
    ...body([
      "Welcome back to Forest Dragon. Today we're looking at Fenrir, ",
      { img: "map of Scandinavia" },
      " the giant wolf of Norse mythology, and the chain that held him.",
    ]),
  },
  {
    id: "main",
    kind: "main",
    ...body([
      "Most of what we know comes from the Prose Edda, written down by Snorri Sturluson around 1220.",
    ]),
    subsections: [
      {
        id: "sub1",
        title: "The children of Loki",
        ...body([
          "Fenrir is one of three children Loki had with the giantess Angrboda. ",
          { img: "Loki, Angrboda and their three children" },
        ]),
      },
      {
        id: "sub2",
        title: "The binding of Fenrir",
        ...body(
          [
            "The gods tried two chains, Leyding and Dromi, and Fenrir broke both. ",
            { img: "Fenrir breaking a chain" },
          ],
          [
            "Then the dwarves made Gleipnir, ",
            { img: "Gleipnir, a thin silk ribbon" },
            " from the sound of a cat's footsteps and the beard of a woman.",
          ],
        ),
      },
    ],
  },
  {
    id: "outro",
    kind: "outro",
    subsections: [],
    ...body([
      "If you want more Norse monsters, the Midgard Serpent video is linked right here.",
    ]),
  },
  {
    id: "closing",
    kind: "closing",
    subsections: [],
    ...body([
      "Somewhere, deep under the earth, a wolf is still waiting. ",
      { img: "chained wolf under the earth, glowing eyes" },
    ]),
  },
];
