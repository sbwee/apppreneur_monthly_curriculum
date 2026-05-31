const { z } = require("zod");

const SYLLABUS_SCHEMA_VERSION = "ledger.syllabus.v1";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const gapSuggestionSchema = z.object({
  title: z.string().min(1).max(400),
  rationale: z.string().min(1).max(4000),
  suggested_search_query: z.string().min(1).max(500),
});

const syllabusItemSchema = z.object({
  resource_id: z.string().uuid(),
  week_index: z.number().int().min(0).max(12),
  day_index: z.number().int().min(0).max(6),
  sequence: z.number().int().min(0),
  consumption_minutes: z.number().int().nonnegative().nullable(),
  practice_minutes: z.number().int().nonnegative().nullable(),
  rationale: z.string().min(1).max(6000),
});

const DEFAULT_SKELETON_RATIONALE = "Complete this resource as part of your learning path.";

/**
 * @param {Record<string, unknown>} item
 */
function syllabusItemRichnessScore(item) {
  let score = 0;
  const rationale = typeof item.rationale === "string" ? item.rationale : "";
  if (rationale && rationale !== DEFAULT_SKELETON_RATIONALE) {
    score += 100 + rationale.length;
  }
  if (item.consumption_minutes != null) {
    score += 5;
  }
  if (item.practice_minutes != null) {
    score += 5;
  }
  if (item.week_index != null) {
    score += 1;
  }
  if (item.day_index != null) {
    score += 1;
  }
  return score;
}

/**
 * @param {unknown} id
 */
function normalizeResourceId(id) {
  if (typeof id !== "string") {
    return null;
  }
  const trimmed = id.trim();
  return UUID_RE.test(trimmed) ? trimmed : null;
}

/**
 * Keep exactly one item per resource_id; prefer richer entries over UUID skeletons.
 * @param {Record<string, unknown>[]} items
 */
function dedupeSyllabusItemsByResourceId(items) {
  /** @type {Map<string, { item: Record<string, unknown>; order: number }>} */
  const bestByResourceId = new Map();

  items.forEach((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return;
    }

    const resourceId = normalizeResourceId(item.resource_id);
    if (!resourceId) {
      return;
    }

    const order = typeof item.sequence === "number" ? item.sequence : index;
    const normalizedItem = { ...item, resource_id: resourceId };
    const existing = bestByResourceId.get(resourceId);

    if (!existing) {
      bestByResourceId.set(resourceId, { item: normalizedItem, order });
      return;
    }

    const keepIncoming =
      syllabusItemRichnessScore(normalizedItem) > syllabusItemRichnessScore(existing.item) ||
      (syllabusItemRichnessScore(normalizedItem) === syllabusItemRichnessScore(existing.item) &&
        order < existing.order);

    if (keepIncoming) {
      bestByResourceId.set(resourceId, { item: normalizedItem, order: Math.min(existing.order, order) });
    } else {
      bestByResourceId.set(resourceId, {
        item: existing.item,
        order: Math.min(existing.order, order),
      });
    }
  });

  return [...bestByResourceId.entries()]
    .sort((a, b) => a[1].order - b[1].order)
    .map(([, entry], index) => ({
      ...entry.item,
      sequence: index,
    }));
}

/**
 * @param {unknown} ids
 */
function dedupeResourceIds(ids) {
  if (!Array.isArray(ids)) {
    return ids;
  }

  const seen = new Set();
  const deduped = [];

  for (const id of ids) {
    const normalized = normalizeResourceId(id);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    deduped.push(normalized);
  }

  return deduped;
}

/**
 * Coerce a single LLM item entry into an object when the model returns strings.
 * @param {unknown} item
 * @param {number} index
 */
function coerceSyllabusItemEntry(item, index) {
  if (item && typeof item === "object" && !Array.isArray(item)) {
    const record = /** @type {Record<string, unknown>} */ (item);
    const resourceId = normalizeResourceId(record.resource_id ?? record.id);
    if (!resourceId) {
      return null;
    }
    return { ...record, resource_id: resourceId };
  }

  if (typeof item !== "string") {
    return null;
  }

  const trimmed = item.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return coerceSyllabusItemEntry(parsed, index);
      }
    } catch {
      /* fall through */
    }
  }

  const resourceId = normalizeResourceId(trimmed);
  if (resourceId) {
    return {
      resource_id: resourceId,
      week_index: 0,
      day_index: 0,
      sequence: index,
      consumption_minutes: null,
      practice_minutes: null,
      rationale: DEFAULT_SKELETON_RATIONALE,
    };
  }

  return null;
}

/**
 * Normalize raw LLM JSON before Zod validation (defaults, coercions, deduplication).
 * @param {unknown} raw
 */
function normalizeLlmSyllabusJson(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return raw;
  }

  /** @type {Record<string, unknown>} */
  const out = { ...raw };

  if (out.gap_suggestions === undefined || out.gap_suggestions === null) {
    out.gap_suggestions = [];
  }

  if (Array.isArray(out.source_resource_ids)) {
    out.source_resource_ids = dedupeResourceIds(out.source_resource_ids);
  }

  if (Array.isArray(out.items)) {
    const coerced = out.items
      .map((item, index) => coerceSyllabusItemEntry(item, index))
      .filter(Boolean);
    out.items = dedupeSyllabusItemsByResourceId(coerced);
  }

  return out;
}

const syllabusPayloadV1Schema = z
  .object({
    schema: z.literal(SYLLABUS_SCHEMA_VERSION),
    overview: z.string().min(1).max(12000),
    source_resource_ids: z.array(z.string().uuid()).min(1),
    items: z.array(syllabusItemSchema).min(1),
    gap_suggestions: z.array(gapSuggestionSchema).max(2).default([]),
  })
  .superRefine((payload, ctx) => {
    if (new Set(payload.source_resource_ids).size !== payload.source_resource_ids.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["source_resource_ids"],
        message: "source_resource_ids must be unique.",
      });
    }

    const seenItemResources = new Set();
    for (const it of payload.items) {
      if (seenItemResources.has(it.resource_id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items"],
          message: `Each resource_id may appear only once in items (duplicate ${it.resource_id}).`,
        });
      }
      seenItemResources.add(it.resource_id);
    }

    const allowed = new Set(payload.source_resource_ids);

    for (const id of allowed) {
      if (!payload.items.some((it) => it.resource_id === id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items"],
          message: `Each source_resource_id must appear in items (missing ${id}).`,
        });
      }
    }

    for (const it of payload.items) {
      if (!allowed.has(it.resource_id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items"],
          message: `Item references resource_id not listed in source_resource_ids (${it.resource_id}).`,
        });
      }
    }

    const sequences = payload.items.map((i) => i.sequence);
    if (new Set(sequences).size !== sequences.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["items"],
        message: "sequence values must be unique.",
      });
    }
  });

module.exports = {
  SYLLABUS_SCHEMA_VERSION,
  syllabusPayloadV1Schema,
  gapSuggestionSchema,
  syllabusItemSchema,
  normalizeLlmSyllabusJson,
  coerceSyllabusItemEntry,
  dedupeSyllabusItemsByResourceId,
  dedupeResourceIds,
};
