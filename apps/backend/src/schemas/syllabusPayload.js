const { z } = require("zod");

const SYLLABUS_SCHEMA_VERSION = "ledger.syllabus.v1";

const gapSuggestionSchema = z.object({
  title: z.string().min(1).max(400),
  rationale: z.string().min(1).max(4000),
  suggested_search_query: z.string().min(1).max(500),
});

const syllabusItemSchema = z.object({
  resource_id: z.string().uuid(),
  week_index: z.number().int().min(0).max(3),
  day_index: z.number().int().min(0).max(6),
  sequence: z.number().int().min(0),
  consumption_minutes: z.number().int().nonnegative().nullable(),
  practice_minutes: z.number().int().nonnegative().nullable(),
  rationale: z.string().min(1).max(6000),
});

const syllabusPayloadV1Schema = z
  .object({
    schema: z.literal(SYLLABUS_SCHEMA_VERSION),
    overview: z.string().min(1).max(12000),
    source_resource_ids: z.array(z.string().uuid()).min(1),
    items: z.array(syllabusItemSchema).min(1),
    gap_suggestions: z.array(gapSuggestionSchema).max(2),
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
};
