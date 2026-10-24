"use client";

// PROTOTYPE — throwaway. In-memory script model implementing the rules from
// "Script structure rules" (#5). No persistence.

import type { JSONContent } from "@tiptap/react";
import { useState } from "react";

export const KINDS = [
  "opening",
  "hook",
  "intro",
  "main",
  "outro",
  "closing",
] as const;
export type Kind = (typeof KINDS)[number];

export const KIND_LABEL: Record<Kind, string> = {
  opening: "Story sketch (opening)",
  hook: "Hook",
  intro: "Intro",
  main: "Main part",
  outro: "Outro",
  closing: "Story sketch (closing)",
};

export type Body = {
  doc: JSONContent;
  words: number;
  directions: string[];
};

export type Subsection = Body & { id: string; title: string };
export type Section = Body & {
  id: string;
  kind: Kind;
  subsections: Subsection[];
};

export const WPM = 150; // placeholder until "Speaking-time estimate" (#11)

export function minutes(words: number) {
  const s = Math.round((words / WPM) * 60);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

let nextId = 1000;
const newId = () => `s${nextId++}`;

export const emptyBody = (): Body => ({
  doc: { type: "doc", content: [{ type: "paragraph" }] },
  words: 0,
  directions: [],
});

const hasContent = (b: Body) => b.words > 0 || b.directions.length > 0;

function move<T>(list: T[], from: number, to: number) {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function useScript(initial: Section[]) {
  const [sections, setSections] = useState(initial);

  const missingKinds = KINDS.filter(
    (k) => !sections.some((s) => s.kind === k),
  );

  function addSection(kind: Kind) {
    setSections((prev) => {
      // Canonical position: after the nearest preceding canonical kind that exists.
      const rank = KINDS.indexOf(kind);
      let insertAt = 0;
      for (let r = rank - 1; r >= 0; r--) {
        const i = prev.findIndex((s) => s.kind === KINDS[r]);
        if (i !== -1) {
          insertAt = i + 1;
          break;
        }
      }
      const section: Section = {
        id: newId(),
        kind,
        subsections: [],
        ...emptyBody(),
      };
      return [...prev.slice(0, insertAt), section, ...prev.slice(insertAt)];
    });
  }

  function removeSection(id: string) {
    const s = sections.find((x) => x.id === id);
    if (!s) return;
    const filled = hasContent(s) || s.subsections.some(hasContent);
    if (filled && !window.confirm(`Remove "${KIND_LABEL[s.kind]}"? Its text will be lost.`))
      return;
    setSections((prev) => prev.filter((x) => x.id !== id));
  }

  function moveSection(from: number, to: number) {
    setSections((prev) => move(prev, from, to));
  }

  function updateBody(id: string, body: Body) {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id === id) return { ...s, ...body };
        return {
          ...s,
          subsections: s.subsections.map((sub) =>
            sub.id === id ? { ...sub, ...body } : sub,
          ),
        };
      }),
    );
  }

  function mapMain(fn: (subs: Subsection[]) => Subsection[]) {
    setSections((prev) =>
      prev.map((s) =>
        s.kind === "main" ? { ...s, subsections: fn(s.subsections) } : s,
      ),
    );
  }

  function addSubsection() {
    const id = newId();
    mapMain((subs) => [
      ...subs,
      { id, title: "Untitled subsection", ...emptyBody() },
    ]);
    return id;
  }

  function removeSubsection(id: string) {
    const sub = sections
      .flatMap((s) => s.subsections)
      .find((x) => x.id === id);
    if (!sub) return;
    if (
      hasContent(sub) &&
      !window.confirm(`Remove "${sub.title || "Untitled"}"? Its text will be lost.`)
    )
      return;
    mapMain((subs) => subs.filter((x) => x.id !== id));
  }

  function moveSubsection(from: number, to: number) {
    mapMain((subs) => move(subs, from, to));
  }

  function renameSubsection(id: string, title: string) {
    mapMain((subs) => subs.map((x) => (x.id === id ? { ...x, title } : x)));
  }

  const totalWords = sections.reduce(
    (n, s) => n + s.words + s.subsections.reduce((m, x) => m + x.words, 0),
    0,
  );

  return {
    sections,
    missingKinds,
    totalWords,
    addSection,
    removeSection,
    moveSection,
    updateBody,
    addSubsection,
    removeSubsection,
    moveSubsection,
    renameSubsection,
  };
}

export type Script = ReturnType<typeof useScript>;
