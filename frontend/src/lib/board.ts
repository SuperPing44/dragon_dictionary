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

/** A card move: to a stage, before a card in it (or null for the end). */
export type BoardMove = {
  id: string;
  stage: BoardStage;
  beforeId: string | null;
};

/**
 * A column's order with one card moved before another (or to the end when
 * `beforeId` is null or not in the column).
 */
export function reorderColumn(
  ids: string[],
  id: string,
  beforeId: string | null,
): string[] {
  const rest = ids.filter((x) => x !== id);
  const at = beforeId === null ? -1 : rest.indexOf(beforeId);
  return at < 0 ? [...rest, id] : [...rest.slice(0, at), id, ...rest.slice(at)];
}

/**
 * The board after a move, for showing it at once: within its column the
 * card goes before `beforeId`; into another column it lands on top,
 * wherever it was dropped.
 */
export function applyBoardMove<T extends { id: string; stage: VideoStage }>(
  projects: T[],
  { id, stage, beforeId }: BoardMove,
): T[] {
  const card = projects.find((p) => p.id === id);
  if (!card) return projects;
  if (card.stage !== stage) {
    const rest = projects.filter((p) => p.id !== id);
    return [{ ...card, stage }, ...rest];
  }
  const column = projects.filter((p) => p.stage === stage);
  const order = reorderColumn(
    column.map((p) => p.id),
    id,
    beforeId,
  );
  const byId = new Map(column.map((p) => [p.id, p]));
  const others = projects.filter((p) => p.stage !== stage);
  return [...order.map((x) => byId.get(x) as T), ...others];
}
