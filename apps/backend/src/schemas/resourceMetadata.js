const { z } = require("zod");

/** Structured LLM output merged into resources.metadata.ai */
const resourceAiMetadataSchema = z.object({
  title: z.string().min(1).max(500),
  summary: z.string().min(1).max(8000),
  estimated_duration_minutes: z.number().int().nonnegative().nullable(),
  content_kind: z.enum(["video", "audio", "reading", "interactive", "unknown"]),
});

module.exports = { resourceAiMetadataSchema };
