const { OpenAI } = require("openai");
const { resourceAiMetadataSchema } = require("../schemas/resourceMetadata");

/**
 * @param {{
 *   apiKey: string;
 *   model: string;
 *   url: string;
 *   kind: string;
 *   excerpt: string;
 *   fetchMeta?: { contentType?: string | null; fetchError?: string };
 *   timeoutMs?: number;
 *   maxRetries?: number;
 *   maxCompletionTokens?: number;
 * }} input
 * @returns {Promise<{ ok: true; data: import("zod").infer<typeof resourceAiMetadataSchema> } | { ok: false; error: string }>}
 */
async function enrichResourceMetadata(input) {
  const timeoutMs = input.timeoutMs ?? 120_000;
  const maxRetries = input.maxRetries ?? 1;
  const client = new OpenAI({
    apiKey: input.apiKey,
    timeout: timeoutMs,
    maxRetries,
  });

  const userPayload = [
    `Resource URL: ${input.url}`,
    `Heuristic kind: ${input.kind}`,
    input.fetchMeta?.contentType ? `Content-Type: ${input.fetchMeta.contentType}` : "",
    input.fetchMeta?.fetchError ? `Fetch note: ${input.fetchMeta.fetchError}` : "",
    "Page excerpt (may be empty or partial):",
    input.excerpt || "(empty)",
  ]
    .filter(Boolean)
    .join("\n");

  const maxTok = input.maxCompletionTokens;
  const completionParams = {
    model: input.model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You extract learning-resource metadata for a personal learning app. " +
          "Return ONLY JSON matching keys: title, summary, estimated_duration_minutes (integer minutes or null), " +
          "content_kind (one of: video, audio, reading, interactive, unknown). " +
          "If duration is unknown, use null. Be concise but specific.",
      },
      { role: "user", content: userPayload },
    ],
  };
  if (Number.isFinite(maxTok) && maxTok > 0) {
    completionParams.max_completion_tokens = maxTok;
  }

  const completion = await client.chat.completions.create(completionParams);

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    return { ok: false, error: "Empty model response." };
  }

  let parsedJson;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Model response was not valid JSON." };
  }

  const parsed = resourceAiMetadataSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.message };
  }

  return { ok: true, data: parsed.data };
}

module.exports = { enrichResourceMetadata };
