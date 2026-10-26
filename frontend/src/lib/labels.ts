import type { SectionKind, VideoStage } from "@/db/schema";

export const STAGE_LABELS: Record<VideoStage, string> = {
  research: "Research",
  script: "Script",
  recording: "Recording",
  editing: "Editing",
  thumbnail: "Thumbnail",
  upload: "Upload",
  published: "Published",
};

export const SECTION_KIND_LABELS: Record<SectionKind, string> = {
  opening_story: "Opening story sketch",
  hook: "Hook",
  intro: "Intro",
  main: "Main part",
  outro: "Outro",
  closing_story: "Closing story sketch",
};
