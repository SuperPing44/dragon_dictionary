"use client";

// PROTOTYPE — throwaway. Bare HTML5 drag-to-reorder for one list. The handle is
// what you grab; the target is what you drop on (kept apart so a draggable
// ancestor never breaks text selection inside an editor).

import { useState } from "react";

export function useDragList(onMove: (from: number, to: number) => void) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);

  const reset = () => {
    setDragging(null);
    setOver(null);
  };

  return {
    dragging,
    over,
    isOver: (index: number) => over === index && dragging !== index,
    handleProps: (index: number) => ({
      draggable: true,
      onDragStart: (e: React.DragEvent) => {
        e.dataTransfer.effectAllowed = "move";
        e.stopPropagation();
        setDragging(index);
      },
      onDragEnd: reset,
    }),
    targetProps: (index: number) => ({
      onDragOver: (e: React.DragEvent) => {
        if (dragging === null) return;
        e.preventDefault();
        e.stopPropagation();
        setOver(index);
      },
      onDrop: (e: React.DragEvent) => {
        if (dragging === null) return;
        e.preventDefault();
        e.stopPropagation();
        if (dragging !== index) onMove(dragging, index);
        reset();
      },
    }),
  };
}
