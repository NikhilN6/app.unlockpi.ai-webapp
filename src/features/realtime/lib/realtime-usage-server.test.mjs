import { describe, expect, test } from "bun:test";

import { getRealtimeUsageRecord } from "./realtime-usage-server.ts";

describe("getRealtimeUsageRecord", () => {
  test("estimates gpt-realtime-2 cost from detailed token usage", () => {
    const record = getRealtimeUsageRecord(
      {
        input_token_details: {
          text_tokens: 1_000_000,
          audio_tokens: 1_000_000,
          cached_tokens_details: {
            text_tokens: 100_000,
            audio_tokens: 200_000,
          },
        },
        output_token_details: {
          text_tokens: 500_000,
          audio_tokens: 250_000,
        },
      },
      "gpt-realtime-2",
    );

    expect(record.estimated_cost_usd).toBeCloseTo(57.32, 8);
  });

  test("does not guess a price for an unknown model", () => {
    const record = getRealtimeUsageRecord(
      { output_token_details: { text_tokens: 1_000 } },
      "future-realtime-model",
    );

    expect(record.estimated_cost_usd).toBeNull();
  });
});
