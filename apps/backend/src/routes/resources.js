const express = require("express");
const { z } = require("zod");
const { asyncHandler } = require("../middleware/asyncHandler");
const { AppError } = require("../lib/errors");
const { isUuid } = require("../lib/uuid");
const { inferKindFromUrl } = require("../services/resourceKind");
const { enrichAndPersistResource } = require("../services/resourceEnrichmentRunner");
const { llmBodyBudgetMiddleware, sharedLlmUserLimiter } = require("../middleware/rateLimits");
const { llmEnrichTransportEnv } = require("../lib/llmRuntimeEnv");

const llmChain = [llmBodyBudgetMiddleware, sharedLlmUserLimiter];

const createResourceSchema = z.object({
  url: z.string().url().max(2048),
  folder_id: z.union([z.string().uuid(), z.null()]).optional(),
  kind: z.string().trim().min(1).max(64).optional(),
});

const patchResourceSchema = z
  .object({
    url: z.string().url().max(2048).optional(),
    folder_id: z.union([z.string().uuid(), z.null()]).optional(),
    kind: z.string().trim().min(1).max(64).optional(),
    title: z.union([z.string().max(500), z.null()]).optional(),
    description: z.union([z.string().max(20000), z.null()]).optional(),
    metadata: z.record(z.any()).optional(),
    ingest_status: z.enum(["pending", "enriched", "failed"]).optional(),
  })
  .strict();

function createResourcesRouter() {
  const router = express.Router();

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const folderId = typeof req.query.folder_id === "string" ? req.query.folder_id : undefined;
      if (folderId !== undefined && folderId !== "" && !isUuid(folderId)) {
        throw new AppError(400, "VALIDATION_ERROR", "Invalid folder_id query.");
      }

      const sb = req.auth.supabase;
      let query = sb.from("resources").select("*").order("created_at", { ascending: false });

      if (folderId) {
        query = query.eq("folder_id", folderId);
      }

      const { data, error } = await query;
      if (error) {
        throw new AppError(500, "DB_ERROR", error.message);
      }

      res.json({ resources: data ?? [] });
    }),
  );

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const parsed = createResourceSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, "VALIDATION_ERROR", "Invalid body.", {
          issues: parsed.error.flatten(),
        });
      }

      const sb = req.auth.supabase;
      const userId = req.auth.user.id;
      const kind = parsed.data.kind ?? inferKindFromUrl(parsed.data.url);

      const insertRow = {
        user_id: userId,
        url: parsed.data.url,
        folder_id: parsed.data.folder_id ?? null,
        kind,
        title: null,
        description: null,
        metadata: {},
        ingest_status: "pending",
      };

      const { data, error } = await sb.from("resources").insert(insertRow).select("*").single();

      if (error) {
        throw new AppError(500, "DB_ERROR", error.message);
      }

      res.status(201).json({ resource: data });
    }),
  );

  router.get(
    "/:id",
    asyncHandler(async (req, res) => {
      if (!isUuid(req.params.id)) {
        throw new AppError(400, "VALIDATION_ERROR", "Invalid resource id.");
      }

      const sb = req.auth.supabase;
      const { data, error } = await sb.from("resources").select("*").eq("id", req.params.id).maybeSingle();

      if (error) {
        throw new AppError(500, "DB_ERROR", error.message);
      }
      if (!data) {
        throw new AppError(404, "NOT_FOUND", "Resource not found.");
      }

      res.json({ resource: data });
    }),
  );

  router.patch(
    "/:id",
    asyncHandler(async (req, res) => {
      if (!isUuid(req.params.id)) {
        throw new AppError(400, "VALIDATION_ERROR", "Invalid resource id.");
      }

      const parsed = patchResourceSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, "VALIDATION_ERROR", "Invalid body.", {
          issues: parsed.error.flatten(),
        });
      }

      const sb = req.auth.supabase;

      const { data: existing, error: loadError } = await sb
        .from("resources")
        .select("*")
        .eq("id", req.params.id)
        .maybeSingle();

      if (loadError) {
        throw new AppError(500, "DB_ERROR", loadError.message);
      }
      if (!existing) {
        throw new AppError(404, "NOT_FOUND", "Resource not found.");
      }

      const patch = parsed.data;
      const next = {
        url: patch.url ?? existing.url,
        folder_id: patch.folder_id !== undefined ? patch.folder_id : existing.folder_id,
        kind: patch.kind ?? existing.kind,
        title: patch.title !== undefined ? patch.title : existing.title,
        description: patch.description !== undefined ? patch.description : existing.description,
        ingest_status: patch.ingest_status ?? existing.ingest_status,
      };

      let metadata = existing.metadata && typeof existing.metadata === "object" ? existing.metadata : {};
      if (patch.metadata) {
        metadata = { ...metadata, ...patch.metadata };
      }

      const { data, error } = await sb
        .from("resources")
        .update({
          ...next,
          metadata,
        })
        .eq("id", req.params.id)
        .select("*")
        .single();

      if (error) {
        throw new AppError(500, "DB_ERROR", error.message);
      }

      res.json({ resource: data });
    }),
  );

  router.delete(
    "/:id",
    asyncHandler(async (req, res) => {
      if (!isUuid(req.params.id)) {
        throw new AppError(400, "VALIDATION_ERROR", "Invalid resource id.");
      }

      const sb = req.auth.supabase;
      const { error, count } = await sb.from("resources").delete({ count: "exact" }).eq("id", req.params.id);

      if (error) {
        throw new AppError(500, "DB_ERROR", error.message);
      }
      if (count == null || count === 0) {
        throw new AppError(404, "NOT_FOUND", "Resource not found.");
      }

      res.status(204).send();
    }),
  );

  router.post(
    "/:id/enrich",
    ...llmChain,
    asyncHandler(async (req, res) => {
      if (!isUuid(req.params.id)) {
        throw new AppError(400, "VALIDATION_ERROR", "Invalid resource id.");
      }

      const env = req.app.locals.runtimeEnv;
      const apiKey = env?.openaiApiKey?.trim();
      if (!apiKey) {
        throw new AppError(
          503,
          "LLM_NOT_CONFIGURED",
          "OPENAI_API_KEY is not set; enrichment is unavailable.",
        );
      }

      const sb = req.auth.supabase;
      const { data: existing, error: loadError } = await sb
        .from("resources")
        .select("*")
        .eq("id", req.params.id)
        .maybeSingle();

      if (loadError) {
        throw new AppError(500, "DB_ERROR", loadError.message);
      }
      if (!existing) {
        throw new AppError(404, "NOT_FOUND", "Resource not found.");
      }

      const result = await enrichAndPersistResource(sb, llmEnrichTransportEnv({ ...env, openaiApiKey: apiKey }), existing);

      if (!result.ok) {
        return res.status(200).json({
          resource: result.resource,
          enrichment: { ok: false, error: result.error },
        });
      }

      return res.json({ resource: result.resource, enrichment: { ok: true } });
    }),
  );

  return router;
}

module.exports = { createResourcesRouter };
