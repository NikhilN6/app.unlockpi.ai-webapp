import { notFound } from "next/navigation";

import { CanvasPageClient } from "@/features/canvas/components/canvas-page-client";
import { mapCanvasRecord, mapCanvasSummary } from "@/features/canvas/lib/canvas-records";
import { createClient } from "@/lib/server";

export default async function CanvasEditorPage({
  params,
}: {
  params: Promise<{ canvasId: string }>;
}) {
  const { canvasId } = await params;
  const supabase = await createClient();

  const [{ data: summaries }, { data: canvas }] = await Promise.all([
    supabase
      .from("teaching_canvases")
      .select("id, title, subject, template_key, updated_at, status, share_slug, is_public, topic")
      .order("updated_at", { ascending: false }),
    supabase
      .from("teaching_canvases")
      .select(
        "id, title, subject, template_key, updated_at, status, share_slug, is_public, topic, document, active_frame_id"
      )
      .eq("id", canvasId)
      .single(),
  ]);

  if (!canvas) {
    notFound();
  }

  return (
    <CanvasPageClient
      initialCanvas={mapCanvasRecord(canvas)}
      initialCanvases={(summaries ?? []).map(mapCanvasSummary)}
    />
  );
}
