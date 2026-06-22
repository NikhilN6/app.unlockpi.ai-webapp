import type { RealtimeUsageResponse } from "@/features/realtime/types/realtime-usage";

export function trackRealtimeResponse(
  usageSessionId: string | null,
  response: RealtimeUsageResponse | undefined,
) {
  if (!usageSessionId || !response?.id || !response.usage) return;

  void fetch("/api/openai/realtime/usage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "response",
      usageSessionId,
      responseId: response.id,
      usage: response.usage,
    }),
    keepalive: true,
  });
}

export function finishRealtimeUsageSession(
  usageSessionId: string | null,
  status: "completed" | "failed" = "completed",
) {
  if (!usageSessionId) return;

  void fetch("/api/openai/realtime/usage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "finish", usageSessionId, status }),
    keepalive: true,
  });
}

