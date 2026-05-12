const { OpenAI } = require("openai");
const { SYLLABUS_SCHEMA_VERSION, syllabusPayloadV1Schema } = require("../schemas/syllabusPayload");

/**
 * @param {{ apiKey: string; timeoutMs?: number; maxRetries?: number }} input
 */
function createOpenAiClient(input) {
  const timeoutMs = input.timeoutMs ?? 120_000;
  const maxRetries = input.maxRetries ?? 1;
  return new OpenAI({
    apiKey: input.apiKey,
    timeout: timeoutMs,
    maxRetries,
  });
}

/**
 * @param {Record<string, unknown>} params
 * @param {number | undefined} maxCompletionTokens
 */
function withMaxCompletionTokens(params, maxCompletionTokens) {
  if (Number.isFinite(maxCompletionTokens) && maxCompletionTokens > 0) {
    return { ...params, max_completion_tokens: maxCompletionTokens };
  }
  return params;
}

/**
 * @param {Record<string, unknown>[]} resources
 */
function summarizeResourcesForPrompt(resources) {
  return resources.map((r) => ({
    id: r.id,
    url: r.url,
    kind: r.kind,
    title: r.title,
    description: r.description,
    ingest_status: r.ingest_status,
    ai: r.metadata && typeof r.metadata === "object" && r.metadata.ai ? r.metadata.ai : null,
  }));
}

/**
 * @param {{
 *   apiKey: string;
 *   model: string;
 *   curriculumTitle: string;
 *   monthStart?: string | null;
 *   resources: Record<string, unknown>[];
 *   timeoutMs?: number;
 *   maxRetries?: number;
 *   maxCompletionTokens?: number;
 * }} input
 */
async function generateFullSyllabusWithLlm(input) {
  const client = createOpenAiClient({
    apiKey: input.apiKey,
    timeoutMs: input.timeoutMs,
    maxRetries: input.maxRetries,
  });
  const catalog = summarizeResourcesForPrompt(input.resources);

  const system = [
    "You design a 4-week (28-day style) personal learning syllabus from a set of saved web resources.",
    "Return ONLY valid JSON (no markdown) with this shape:",
    `{`,
    `  "schema": "${SYLLABUS_SCHEMA_VERSION}",`,
    `  "overview": string,`,
    `  "source_resource_ids": string[], // must list EVERY input resource id exactly once`,
    `  "items": [`,
    `    {`,
    `      "resource_id": string (uuid),`,
    `      "week_index": 0-3,`,
    `      "day_index": 0-6 (0=Monday convention is fine; stay consistent),`,
    `      "sequence": integer starting at 0, unique, total order across the month,`,
    `      "consumption_minutes": integer or null,`,
    `      "practice_minutes": integer or null,`,
    `      "rationale": string (why this ordering / week placement / cognitive load),`,
    `    }`,
    `  ],`,
    `  "gap_suggestions": up to 2 objects: { "title", "rationale", "suggested_search_query" } for missing concepts.`,
    `}`,
    "Rules:",
    "- Use every input resource exactly once across items.",
    "- Spread workload; heavier items should pair with lighter adjacent days when possible.",
    "- consumption_minutes / practice_minutes should reflect realistic time; use null if unknown.",
    "- gap_suggestions must be short and actionable; 0-2 entries only.",
  ].join("\n");

  const user = [
    `Curriculum title: ${input.curriculumTitle}`,
    input.monthStart ? `Month anchor (YYYY-MM-DD): ${input.monthStart}` : "Month anchor: not specified.",
    "Resources JSON:",
    JSON.stringify(catalog, null, 2),
  ].join("\n\n");

  const completion = await client.chat.completions.create(
    withMaxCompletionTokens(
      {
        model: input.model,
        temperature: 0.35,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      },
      input.maxCompletionTokens,
    ),
  );

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    return { ok: false, error: "Empty model response." };
  }

  let json;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Model output was not valid JSON." };
  }

  const parsed = syllabusPayloadV1Schema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.message };
  }

  return { ok: true, payload: parsed.data };
}

/**
 * @param {{
 *   apiKey: string;
 *   model: string;
 *   existingPayload: import("zod").infer<typeof syllabusPayloadV1Schema>;
 *   newResources: Record<string, unknown>[];
 *   timeoutMs?: number;
 *   maxRetries?: number;
 *   maxCompletionTokens?: number;
 * }} input
 */
async function patchSyllabusWithNewResources(input) {
  const client = createOpenAiClient({
    apiKey: input.apiKey,
    timeoutMs: input.timeoutMs,
    maxRetries: input.maxRetries,
  });
  const newCatalog = summarizeResourcesForPrompt(input.newResources);

  const system = [
    "You revise an existing 4-week syllabus when new resources are added.",
    "Return ONLY valid JSON with the SAME shape as before:",
    `{ "schema": "${SYLLABUS_SCHEMA_VERSION}", "overview", "source_resource_ids", "items", "gap_suggestions" }`,
    "Rules:",
    "- Include ALL previous resource ids PLUS every new resource id in source_resource_ids and schedule them in items.",
    "- Do NOT drop existing resources from the plan.",
    "- Prefer minimal changes: keep week/day placements stable when sensible; re-sequence `sequence` to be contiguous unique integers.",
    "- Integrate new resources where they best fit conceptually.",
    "- gap_suggestions: 0-2 entries only.",
  ].join("\n");

  const user = [
    "Existing syllabus JSON:",
    JSON.stringify(input.existingPayload, null, 2),
    "New resources to integrate (not yet in the old plan):",
    JSON.stringify(newCatalog, null, 2),
  ].join("\n\n");

  const completion = await client.chat.completions.create(
    withMaxCompletionTokens(
      {
        model: input.model,
        temperature: 0.25,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      },
      input.maxCompletionTokens,
    ),
  );

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    return { ok: false, error: "Empty model response." };
  }

  let json;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Model output was not valid JSON." };
  }

  const parsed = syllabusPayloadV1Schema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.message };
  }

  const prevIds = new Set(input.existingPayload.source_resource_ids);
  const newIds = new Set(input.newResources.map((r) => String(r.id)));
  const union = new Set([...prevIds, ...newIds]);

  for (const id of prevIds) {
    if (!parsed.data.source_resource_ids.includes(id)) {
      return { ok: false, error: `Patch dropped existing resource: ${id}` };
    }
  }
  for (const id of newIds) {
    if (!parsed.data.source_resource_ids.includes(id)) {
      return { ok: false, error: `Patch missing new resource: ${id}` };
    }
  }

  const got = new Set(parsed.data.source_resource_ids);
  if (got.size !== union.size || ![...union].every((id) => got.has(id))) {
    return {
      ok: false,
      error: "source_resource_ids must exactly match the union of existing and new resource IDs.",
    };
  }

  return { ok: true, payload: parsed.data };
}

module.exports = {
  generateFullSyllabusWithLlm,
  patchSyllabusWithNewResources,
  summarizeResourcesForPrompt,
};
