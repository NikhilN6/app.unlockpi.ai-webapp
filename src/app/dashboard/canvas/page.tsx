import { CanvasPageClient } from "@/features/canvas/components/canvas-page-client";
import { mapCanvasSummary } from "@/features/canvas/lib/canvas-records";
import { createClient } from "@/lib/server";

export default async function CanvasLibraryPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("teaching_canvases")
    .select("id, title, subject, template_key, updated_at, status, share_slug, is_public, topic")
    .order("updated_at", { ascending: false });

  return <CanvasPageClient initialCanvases={(data ?? []).map(mapCanvasSummary)} />;
}
