import { VIDEO_STAGES, type VideoStage } from "@/db/schema";

/** The board's columns: every stage but Published, which is the archive. */
export const BOARD_STAGES = VIDEO_STAGES.filter(
  (s): s is Exclude<VideoStage, "published"> => s !== "published",
);
export type BoardStage = (typeof BOARD_STAGES)[number];

export type BoardColumn<T> = { stage: BoardStage; cards: T[] };

/**
 * Groups the board's projects into its six columns, keeping their order
 * (listVideoProjects returns them in board order). Published projects
 * aren't on the board.
 */
export function boardColumns<T extends { stage: VideoStage }>(
  projects: T[],
): BoardColumn<T>[] {
  return BOARD_STAGES.map((stage) => ({
    stage,
    cards: projects.filter((p) => p.stage === stage),
  }));
}
