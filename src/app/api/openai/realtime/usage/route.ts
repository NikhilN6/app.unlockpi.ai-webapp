import { NextRequest, NextResponse } from "next/server";

import { getRealtimeUsageRecord } from "@/features/realtime/lib/realtime-usage-server";
import type { RealtimeTokenUsage } from "@/features/realtime/types/realtime-usage";
import { createClient } from "@/lib/server";

export const runtime = "nodejs";

type UsageRequest =
  | {
      action: "response";
      usageSessionId: string;
      responseId: string;
      usage: RealtimeTokenUsage;
    }
  | {
      action: "finish";
      usageSessionId: string;
      status?: "completed" | "failed";
    };

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as UsageRequest | null;
  if (!body?.usageSessionId) {
    return NextResponse.json({ error: "Invalid usage event" }, { status: 400 });
  }

  if (body.action === "response") {
    const { data: usageSession, error: sessionError } = await supabase
      .from("ai_realtime_sessions")
      .select("model")
      .eq("id", body.usageSessionId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (sessionError || !usageSession) {
      return NextResponse.json(
        { error: sessionError?.message ?? "Realtime session not found" },
        { status: sessionError ? 400 : 404 },
      );
    }

    const { error } = await supabase.from("ai_realtime_responses").upsert(
      {
        usage_session_id: body.usageSessionId,
        owner_id: user.id,
        response_id: body.responseId,
        ...getRealtimeUsageRecord(body.usage, usageSession.model),
      },
      { onConflict: "usage_session_id,response_id", ignoreDuplicates: true },
    );
    return error
      ? NextResponse.json({ error: error.message }, { status: 400 })
      : NextResponse.json({ ok: true });
  }

  if (body.action === "finish") {
    const { error } = await supabase
      .from("ai_realtime_sessions")
      .update({
        status: body.status === "failed" ? "failed" : "completed",
        ended_at: new Date().toISOString(),
      })
      .eq("id", body.usageSessionId)
      .eq("owner_id", user.id);
    return error
      ? NextResponse.json({ error: error.message }, { status: 400 })
      : NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown usage action" }, { status: 400 });
}
