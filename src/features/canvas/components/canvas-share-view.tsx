"use client";

import { Render } from "@puckeditor/core";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

import { canvasPuckConfig } from "@/features/canvas/lib/canvas-puck-config";
import type { CanvasRecord } from "@/features/canvas/lib/canvas-records";

export function CanvasShareView({ canvas }: { canvas: CanvasRecord }) {
  return (
    <main className="min-h-screen bg-[#edf0f5] px-3 py-6 text-foreground dark:bg-[#050607] sm:px-4 lg:px-6">
      <div className="mx-auto mb-6 flex w-full max-w-5xl items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Public canvas
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{canvas.title}</h1>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium transition hover:bg-accent"
        >
          <ArrowLeftIcon className="size-4" />
          Dashboard
        </Link>
      </div>

      <Render config={canvasPuckConfig} data={canvas.document} />
    </main>
  );
}
