export type RealtimeTokenRates = {
  audioInput: number;
  audioOutput: number;
  cachedAudioInput: number;
  cachedTextInput: number;
  textInput: number;
  textOutput: number;
};

// USD per one million tokens. Keep this versioned so stored estimates remain auditable.
const REALTIME_TOKEN_RATES: Record<string, RealtimeTokenRates> = {
  "gpt-realtime-2": {
    audioInput: 32,
    audioOutput: 64,
    cachedAudioInput: 0.4,
    cachedTextInput: 0.4,
    textInput: 4,
    textOutput: 24,
  },
};

export function getRealtimeTokenRates(model: string) {
  const normalizedModel = model.trim().toLowerCase();
  const modelFamily = Object.keys(REALTIME_TOKEN_RATES).find(
    (name) => normalizedModel === name || normalizedModel.startsWith(`${name}-`),
  );

  return modelFamily ? REALTIME_TOKEN_RATES[modelFamily] : null;
}
