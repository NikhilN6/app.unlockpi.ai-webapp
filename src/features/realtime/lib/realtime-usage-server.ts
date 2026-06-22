import type { SupabaseClient } from "@supabase/supabase-js";

import type { RealtimeTokenUsage } from "@/features/realtime/types/realtime-usage";
import { getRealtimeTokenRates } from "@/features/realtime/lib/realtime-pricing";

type CreateUsageSessionArgs = {
  supabase: SupabaseClient;
  ownerId: string;
  source: "canvas" | "course";
  lessonTitle: string;
  mode: string;
  model: string;
  canvasId?: string | null;
  openaiSessionId?: string | null;
};

type TokenRecord = {
  input_text_tokens: number;
  input_audio_tokens: number;
  cached_text_tokens: number;
  cached_audio_tokens: number;
  output_text_tokens: number;
  output_audio_tokens: number;
};

export async function createRealtimeUsageSession({
  supabase,
  ownerId,
  source,
  lessonTitle,
  mode,
  model,
  canvasId,
  openaiSessionId,
}: CreateUsageSessionArgs) {
  const { data, error } = await supabase
    .from("ai_realtime_sessions")
    .insert({
      owner_id: ownerId,
      source,
      lesson_title: lessonTitle.trim() || "Untitled lesson",
      mode,
      model,
      canvas_id: canvasId || null,
      openai_session_id: openaiSessionId || null,
    })
    .select("id")
    .single();

  return error ? null : data.id;
}

export function getRealtimeUsageRecord(usage: RealtimeTokenUsage, model: string) {
  const input = usage.input_token_details;
  const output = usage.output_token_details;
  const record = {
    input_text_tokens: positiveInteger(input?.text_tokens),
    input_audio_tokens: positiveInteger(input?.audio_tokens),
    cached_text_tokens: positiveInteger(
      input?.cached_tokens_details?.text_tokens,
    ),
    cached_audio_tokens: positiveInteger(
      input?.cached_tokens_details?.audio_tokens,
    ),
    output_text_tokens: positiveInteger(output?.text_tokens),
    output_audio_tokens: positiveInteger(output?.audio_tokens),
  };

  return {
    ...record,
    estimated_cost_usd: estimateCost(record, model),
  };
}

function estimateCost(tokens: TokenRecord, model: string) {
  const rates = getRealtimeTokenRates(model);
  if (!rates) return null;

  const categories = [
    {
      tokens: Math.max(tokens.input_text_tokens - tokens.cached_text_tokens, 0),
      rate: rates.textInput,
    },
    {
      tokens: tokens.cached_text_tokens,
      rate: rates.cachedTextInput,
    },
    {
      tokens: Math.max(tokens.input_audio_tokens - tokens.cached_audio_tokens, 0),
      rate: rates.audioInput,
    },
    {
      tokens: tokens.cached_audio_tokens,
      rate: rates.cachedAudioInput,
    },
    {
      tokens: tokens.output_text_tokens,
      rate: rates.textOutput,
    },
    {
      tokens: tokens.output_audio_tokens,
      rate: rates.audioOutput,
    },
  ];

  let total = 0;
  for (const category of categories) {
    if (category.tokens === 0) continue;
    total += (category.tokens / 1_000_000) * category.rate;
  }
  return total;
}

function positiveInteger(value: number | undefined) {
  return Number.isFinite(value) ? Math.max(0, Math.round(value ?? 0)) : 0;
}
