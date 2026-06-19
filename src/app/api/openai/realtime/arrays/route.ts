import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const DEFAULT_REALTIME_MODEL = "gpt-realtime";
const DEFAULT_REALTIME_VOICE = "marin";
const DEFAULT_OUTPUT_MODALITIES = "text";

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY on the server." },
      { status: 500 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    lessonTitle?: string;
    lessonGoal?: string;
    responseMode?: "audio" | "listen_only";
  };

  const model = process.env.OPENAI_REALTIME_MODEL ?? DEFAULT_REALTIME_MODEL;
  const voice = process.env.OPENAI_REALTIME_VOICE ?? DEFAULT_REALTIME_VOICE;
  const outputModalities = getOutputModalities(body.responseMode);

  const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      expires_after: {
        anchor: "created_at",
        seconds: 600,
      },
      session: {
        type: "realtime",
        model,
        output_modalities: outputModalities,
        instructions: buildArrayTutorInstructions(body.lessonTitle, body.lessonGoal),
        audio: {
          output: {
            voice,
          },
        },
        tools: [
          {
            type: "function",
            name: "control_array_lesson",
            description:
              "Change the Arrays lesson UI while teaching. Use this whenever the learner asks to move, inspect an index, highlight indices/elements, or try a new array example.",
            parameters: {
              type: "object",
              additionalProperties: false,
              properties: {
                action: {
                  type: "string",
                  enum: [
                    "next",
                    "previous",
                    "goto",
                    "highlight_index",
                    "highlight_indices",
                    "highlight_elements",
                    "set_array",
                    "set_array_name",
                    "show_indices",
                    "hide_indices",
                    "set_caption",
                    "reset_array",
                  ],
                  description: "The UI action to perform.",
                },
                frame_index: {
                  type: "integer",
                  description: "Zero-based frame index for the goto action.",
                },
                index: {
                  type: "integer",
                  description: "Array index to highlight.",
                },
                values: {
                  type: "array",
                  description: "New array values to display.",
                  items: {
                    type: "string",
                  },
                },
                caption: {
                  type: "string",
                  description: "Short teaching caption to show under the array.",
                },
                array_name: {
                  type: "string",
                  description: "Short array variable name to show beside the current array.",
                },
              },
              required: ["action"],
            },
          },
        ],
        tool_choice: "auto",
      },
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return NextResponse.json(
      {
        error: "Unable to create OpenAI Realtime client secret.",
        details: data,
      },
      { status: response.status }
    );
  }

  return NextResponse.json({ ...data, model, output_modalities: outputModalities });
}

function buildArrayTutorInstructions(lessonTitle?: string, lessonGoal?: string) {
  return [
    "You are UnlockPi's interactive Arrays tutor.",
    "Teach by controlling the screen. Prefer tool calls over long explanations.",
    "The client will continually update you with CURRENT SCREEN STATE. Treat that state as the source of truth before answering.",
    "If the learner says next, previous, go back, explain this, show indices, show elements, highlight an index, or change the array, call control_array_lesson.",
    "For 'highlight all indexes/indices', use action highlight_indices. For 'highlight all elements/array values/boxes', use action highlight_elements.",
    "For 'show indexes/indices', use action show_indices. For 'hide indexes/indices', use action hide_indices.",
    "For 'rename the array' or 'change the array name to X', use action set_array_name with array_name.",
    "For 'explain this/current screen', use set_caption with a short caption about the current screen.",
    "Use simple array language: slot, value, index, update, shift, traverse.",
    "Keep captions short: one sentence.",
    lessonTitle ? `Current lesson: ${lessonTitle}.` : "",
    lessonGoal ? `Lesson goal: ${lessonGoal}.` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function getOutputModalities(responseMode?: "audio" | "listen_only") {
  if (responseMode === "audio") {
    return ["audio"];
  }

  if (responseMode === "listen_only") {
    return ["text"];
  }

  return parseOutputModalities(
    process.env.OPENAI_REALTIME_OUTPUT_MODALITIES ?? DEFAULT_OUTPUT_MODALITIES
  );
}

function parseOutputModalities(value: string) {
  const modalities = value
    .split(",")
    .map((modality) => modality.trim())
    .filter((modality): modality is "text" | "audio" => modality === "text" || modality === "audio");

  return modalities.length > 0 ? modalities : ["text"];
}
