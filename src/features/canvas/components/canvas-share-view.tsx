"use client";

import { CanvasPresenter } from "@/features/canvas/components/canvas-presenter";
import type { CanvasRecord } from "@/features/canvas/lib/canvas-records";

export function CanvasShareView({ canvas }: { canvas: CanvasRecord }) {
  return (
    <CanvasPresenter
      document={canvas.document}
      initialFrameId={canvas.activeFrameId}
      publicView
      title={canvas.title}
    />
  );
}
