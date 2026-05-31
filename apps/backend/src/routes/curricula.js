const express = require("express");
const { z } = require("zod");
const { asyncHandler } = require("../middleware/asyncHandler");
const { AppError } = require("../lib/errors");
const { isUuid } = require("../lib/uuid");
const { syllabusPayloadV1Schema } = require("../schemas/syllabusPayload");
const { enrichAndPersistResource } = require("../services/resourceEnrichmentRunner");
const { generateFullSyllabusWithLlm, patchSyllabusWithNewResources } = require("../services/syllabusLlm");
const { persistSyllabusVersionAndItems } = require("../services/syllabusPersist");
const { clampSprintDays, computeSprintRebalanceUpdates } = require("../services/schedulingEngine");
const { formatIsoDateOnly } = require("../lib/calendarDates");
const { registerCurriculumScheduleRoutes } = require("./curriculaSchedule");
const { registerCurriculumPublishRoutes } = require("./curriculaPublish");
const { llmBodyBudgetMiddleware, sharedLlmUserLimiter } = require("../middleware/rateLimits");
const { llmEnrichTransportEnv, llmSyllabusCallOpts } = require("../lib/llmRuntimeEnv");

const llmChain = [llmBodyBudgetMiddleware, sharedLlmUserLimiter];

const createCurriculumSchema = z
  .object({
    title: z.string().trim().min(1).max(300),
    month_start: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.null()]).optional(),
    auto_enrich: z.boolean().optional(),
    folder_id: z.string().uuid().optional(),
    resource_ids: z.array(z.string().uuid()).min(1).max(200).optional(),
  })
  .superRefine((val, ctx) => {
    const hasFolder = typeof val.folder_id === "string";
    const hasIds = Array.isArray(val.resource_ids) && val.resource_ids.length > 0;
    if (hasFolder === hasIds) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide exactly one of folder_id or resource_ids.",
      });
    }
  });

const patchSyllabusBodySchema = z.object({
  resource_ids: z.array(z.string().uuid()).min(1).max(50),
});

const regenerateBodySchema = z
  .object({
    auto_enrich: z.boolean().optional(),
    sprint_days: z.number().int().min(7).max(90).optional(),
  })
  .strict();

const draftCurriculumSchema = z
  .object({
    title: z.string().trim().min(1).max(300),
    month_start: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.null()]).optional(),
  })
  .strict();

const patchCurriculumSchema = z
  .object({
    status: z.enum(["draft", "active", "archived"]).optional(),
    sprint_days: z.number().int().min(7).max(90).optional(),
  })
  .strict()
  .refine((body) => body.status !== undefined || body.sprint_days !== undefined, {
    message: "Provide at least one of status or sprint_days.",
  });

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} sb
 * @param {{ folder_id?: string; resource_ids?: string[] }} body
 */
async function loadResourcesForCurriculum(sb, body) {
  if (body.folder_id) {
    const { data, error } = await sb.from("resources").select("*").eq("folder_id", body.folder_id);
    if (error) {
      throw new AppError(500, "DB_ERROR", error.message);
    }
    return data ?? [];
  }

  const { data, error } = await sb.from("resources").select("*").in("id", body.resource_ids ?? []);
  if (error) {
    throw new AppError(500, "DB_ERROR", error.message);
  }
  return data ?? [];
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} sb
 * @param {Record<string, unknown>[]} resources
 * @param {{ openaiApiKey: string; openaiModel: string }} env
 */
async function autoEnrichResources(sb, resources, env) {
  for (const row of resources) {
    if (row.ingest_status === "enriched") {
      continue;
    }
    await enrichAndPersistResource(sb, llmEnrichTransportEnv(env), row);
  }

  const ids = resources.map((r) => String(r.id));
  if (!ids.length) {
    return [];
  }

  const { data, error } = await sb.from("resources").select("*").in("id", ids);
  if (error) {
    throw new AppError(500, "DB_ERROR", error.message);
  }
  return data ?? [];
}

function assertLlmConfigured(env) {
  const key = env?.openaiApiKey?.trim();
  if (!key) {
    throw new AppError(
      503,
      "LLM_NOT_CONFIGURED",
      "OPENAI_API_KEY is not set; syllabus generation is unavailable.",
    );
  }
}

function utcTodayIsoDate() {
  return formatIsoDateOnly(new Date());
}

function resolveSprintStartDate(curriculum, assignments) {
  if (curriculum.month_start) {
    return String(curriculum.month_start);
  }
  const dates = (assignments ?? []).map((row) => row.scheduled_date).filter(Boolean).sort();
  if (dates.length) {
    return dates[0];
  }
  return utcTodayIsoDate();
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} sb
 * @param {string} curriculumId
 * @param {Record<string, unknown>} curriculum
 * @param {number} sprintDays
 */
async function rebalanceScheduleForSprintDays(sb, curriculumId, curriculum, sprintDays) {
  const { data: items, error: iErr } = await sb
    .from("curriculum_items")
    .select("id, position")
    .eq("curriculum_id", curriculumId)
    .order("position", { ascending: true });

  if (iErr) {
    throw new AppError(500, "DB_ERROR", iErr.message);
  }
  if (!items?.length) {
    return 0;
  }

  const { data: rows, error: sErr } = await sb
    .from("schedule_assignments")
    .select("id, curriculum_item_id, scheduled_date, status")
    .eq("curriculum_id", curriculumId);

  if (sErr) {
    throw new AppError(500, "DB_ERROR", sErr.message);
  }
  if (!rows?.length) {
    return 0;
  }

  const startDate = resolveSprintStartDate(curriculum, rows);
  const updates = computeSprintRebalanceUpdates(items, rows, startDate, sprintDays);

  for (const update of updates) {
    const { error: uErr } = await sb
      .from("schedule_assignments")
      .update({ scheduled_date: update.scheduled_date })
      .eq("id", update.id)
      .eq("curriculum_id", curriculumId);

    if (uErr) {
      throw new AppError(500, "DB_ERROR", uErr.message);
    }
  }

  return updates.length;
}

function assertPayloadMatchesInputResources(payload, resources) {
  const input = new Set(resources.map((r) => String(r.id)));
  const src = new Set(payload.source_resource_ids);
  if (input.size !== src.size || ![...input].every((id) => src.has(id))) {
    throw new AppError(
      502,
      "SYLLABUS_INVALID",
      "Model returned source_resource_ids that do not match the selected resources.",
    );
  }
}

function createCurriculaRouter() {
  const router = express.Router();

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const sb = req.auth.supabase;
      const { data, error } = await sb.from("curricula").select("*").order("created_at", { ascending: false });
      if (error) {
        throw new AppError(500, "DB_ERROR", error.message);
      }
      res.json({ curricula: data ?? [] });
    }),
  );

  router.post(
    "/draft",
    asyncHandler(async (req, res) => {
      const parsed = draftCurriculumSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, "VALIDATION_ERROR", "Invalid body.", {
          issues: parsed.error.flatten(),
        });
      }

      const sb = req.auth.supabase;
      const userId = req.auth.user.id;
      const body = parsed.data;

      const { data: folder, error: folderErr } = await sb
        .from("folders")
        .insert({ user_id: userId, name: body.title })
        .select("*")
        .single();

      if (folderErr) {
        throw new AppError(500, "DB_ERROR", folderErr.message);
      }

      const { data: curriculum, error: curriculumErr } = await sb
        .from("curricula")
        .insert({
          user_id: userId,
          title: body.title,
          folder_id: folder.id,
          month_start: body.month_start ?? null,
          status: "draft",
        })
        .select("*")
        .single();

      if (curriculumErr) {
        await sb.from("folders").delete().eq("id", folder.id);
        throw new AppError(500, "DB_ERROR", curriculumErr.message);
      }

      res.status(201).json({ curriculum, folder });
    }),
  );

  router.post(
    "/",
    ...llmChain,
    asyncHandler(async (req, res) => {
      const parsed = createCurriculumSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, "VALIDATION_ERROR", "Invalid body.", {
          issues: parsed.error.flatten(),
        });
      }
      const body = parsed.data;

      assertLlmConfigured(req.app.locals.runtimeEnv);

      const sb = req.auth.supabase;
      const userId = req.auth.user.id;
      const env = req.app.locals.runtimeEnv;

      let resources = await loadResourcesForCurriculum(sb, body);
      if (!resources.length) {
        throw new AppError(400, "NO_RESOURCES", "No resources found for this folder or id list.");
      }

      if (body.auto_enrich) {
        resources = await autoEnrichResources(sb, resources, env);
      }

      const insertRow = {
        user_id: userId,
        title: body.title,
        month_start: body.month_start ?? null,
        folder_id: body.folder_id ?? null,
        status: "draft",
      };

      const { data: curriculum, error: cErr } = await sb
        .from("curricula")
        .insert(insertRow)
        .select("*")
        .single();

      if (cErr) {
        throw new AppError(500, "DB_ERROR", cErr.message);
      }

      const curriculumId = String(curriculum.id);

      let gen;
      try {
        gen = await generateFullSyllabusWithLlm({
          ...llmSyllabusCallOpts(env),
          curriculumTitle: body.title,
          monthStart: body.month_start ?? null,
          resources,
        });
      } catch (err) {
        await sb.from("curricula").delete().eq("id", curriculumId);
        const message = err instanceof Error ? err.message : String(err);
        throw new AppError(502, "LLM_ERROR", "Syllabus generation failed.", { details: message });
      }

      if (!gen.ok) {
        await sb.from("curricula").delete().eq("id", curriculumId);
        throw new AppError(502, "SYLLABUS_GENERATION_FAILED", gen.error);
      }

      assertPayloadMatchesInputResources(gen.payload, resources);

      let persisted;
      try {
        persisted = await persistSyllabusVersionAndItems(sb, {
          curriculumId,
          payload: gen.payload,
        });
      } catch (err) {
        await sb.from("curricula").delete().eq("id", curriculumId);
        throw err;
      }

      res.status(201).json({
        curriculum,
        syllabus_version: persisted.syllabus_version,
        items_count: gen.payload.items.length,
      });
    }),
  );

  router.post(
    "/:id/syllabus/patch",
    ...llmChain,
    asyncHandler(async (req, res) => {
      if (!isUuid(req.params.id)) {
        throw new AppError(400, "VALIDATION_ERROR", "Invalid curriculum id.");
      }

      const parsed = patchSyllabusBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, "VALIDATION_ERROR", "Invalid body.", {
          issues: parsed.error.flatten(),
        });
      }

      assertLlmConfigured(req.app.locals.runtimeEnv);
      const env = req.app.locals.runtimeEnv;
      const sb = req.auth.supabase;
      const curriculumId = req.params.id;

      const { data: curriculum, error: cErr } = await sb
        .from("curricula")
        .select("*")
        .eq("id", curriculumId)
        .maybeSingle();

      if (cErr) {
        throw new AppError(500, "DB_ERROR", cErr.message);
      }
      if (!curriculum) {
        throw new AppError(404, "NOT_FOUND", "Curriculum not found.");
      }

      const { data: versions, error: vErr } = await sb
        .from("syllabus_versions")
        .select("*")
        .eq("curriculum_id", curriculumId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (vErr) {
        throw new AppError(500, "DB_ERROR", vErr.message);
      }

      const latest = versions?.[0];
      if (!latest?.payload) {
        throw new AppError(400, "NO_SYLLABUS", "Generate a syllabus before patching.");
      }

      const existingPayload = syllabusPayloadV1Schema.safeParse(latest.payload);
      if (!existingPayload.success) {
        throw new AppError(500, "SYLLABUS_CORRUPT", "Latest syllabus payload failed validation.");
      }

      const existingIds = new Set(existingPayload.data.source_resource_ids);
      const requestedNew = parsed.data.resource_ids.filter((id) => !existingIds.has(id));

      if (!requestedNew.length) {
        throw new AppError(400, "NO_NEW_RESOURCES", "All provided resource_ids are already in the syllabus.");
      }

      const { data: newRows, error: rErr } = await sb.from("resources").select("*").in("id", requestedNew);
      if (rErr) {
        throw new AppError(500, "DB_ERROR", rErr.message);
      }

      if (!newRows || newRows.length !== requestedNew.length) {
        throw new AppError(400, "INVALID_RESOURCES", "Some resource_ids were not found or are not accessible.");
      }

      let gen;
      try {
        gen = await patchSyllabusWithNewResources({
          ...llmSyllabusCallOpts(env),
          existingPayload: existingPayload.data,
          newResources: newRows,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new AppError(502, "LLM_ERROR", "Syllabus patch failed.", { details: message });
      }

      if (!gen.ok) {
        throw new AppError(502, "SYLLABUS_PATCH_FAILED", gen.error);
      }

      const persisted = await persistSyllabusVersionAndItems(sb, {
        curriculumId,
        payload: gen.payload,
      });

      res.json({
        syllabus_version: persisted.syllabus_version,
        items_count: gen.payload.items.length,
      });
    }),
  );

  router.post(
    "/:id/syllabus/generate",
    ...llmChain,
    asyncHandler(async (req, res) => {
      if (!isUuid(req.params.id)) {
        throw new AppError(400, "VALIDATION_ERROR", "Invalid curriculum id.");
      }

      const body = regenerateBodySchema.safeParse(req.body);
      if (!body.success) {
        throw new AppError(400, "VALIDATION_ERROR", "Invalid body.", {
          issues: body.error.flatten(),
        });
      }

      assertLlmConfigured(req.app.locals.runtimeEnv);
      const env = req.app.locals.runtimeEnv;
      const sb = req.auth.supabase;
      const curriculumId = req.params.id;

      const { data: curriculum, error: cErr } = await sb
        .from("curricula")
        .select("*")
        .eq("id", curriculumId)
        .maybeSingle();

      if (cErr) {
        throw new AppError(500, "DB_ERROR", cErr.message);
      }
      if (!curriculum) {
        throw new AppError(404, "NOT_FOUND", "Curriculum not found.");
      }

      let resources = [];
      if (curriculum.folder_id) {
        const { data, error } = await sb.from("resources").select("*").eq("folder_id", curriculum.folder_id);
        if (error) {
          throw new AppError(500, "DB_ERROR", error.message);
        }
        resources = data ?? [];
      } else {
        const { data: versions, error: vErr } = await sb
          .from("syllabus_versions")
          .select("payload")
          .eq("curriculum_id", curriculumId)
          .order("created_at", { ascending: false })
          .limit(1);

        if (vErr) {
          throw new AppError(500, "DB_ERROR", vErr.message);
        }

        const latestPayload = versions?.[0]?.payload;
        const parsedLatest = latestPayload ? syllabusPayloadV1Schema.safeParse(latestPayload) : null;
        const ids = parsedLatest?.success ? parsedLatest.data.source_resource_ids : [];

        if (!ids.length) {
          throw new AppError(
            400,
            "NO_RESOURCE_SCOPE",
            "This curriculum has no folder_id and no prior syllabus to infer resource IDs from.",
          );
        }

        const { data, error } = await sb.from("resources").select("*").in("id", ids);
        if (error) {
          throw new AppError(500, "DB_ERROR", error.message);
        }
        resources = data ?? [];
      }

      if (!resources.length) {
        throw new AppError(400, "NO_RESOURCES", "No resources available to regenerate the syllabus.");
      }

      if (body.data.auto_enrich) {
        resources = await autoEnrichResources(sb, resources, env);
      }

      const sprintDays = clampSprintDays(body.data.sprint_days ?? curriculum.sprint_days ?? 30);

      if (sprintDays !== curriculum.sprint_days) {
        const { error: sprintErr } = await sb
          .from("curricula")
          .update({ sprint_days: sprintDays })
          .eq("id", curriculumId);
        if (sprintErr) {
          throw new AppError(500, "DB_ERROR", sprintErr.message);
        }
        curriculum.sprint_days = sprintDays;
      }

      let gen;
      try {
        gen = await generateFullSyllabusWithLlm({
          ...llmSyllabusCallOpts(env),
          curriculumTitle: String(curriculum.title),
          monthStart: curriculum.month_start ?? null,
          sprintDays,
          resources,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new AppError(502, "LLM_ERROR", "Syllabus regeneration failed.", { details: message });
      }

      if (!gen.ok) {
        throw new AppError(502, "SYLLABUS_GENERATION_FAILED", gen.error);
      }

      assertPayloadMatchesInputResources(gen.payload, resources);

      const persisted = await persistSyllabusVersionAndItems(sb, {
        curriculumId,
        payload: gen.payload,
      });

      res.json({
        syllabus_version: persisted.syllabus_version,
        items_count: gen.payload.items.length,
      });
    }),
  );

  registerCurriculumPublishRoutes(router);
  registerCurriculumScheduleRoutes(router);

  router.patch(
    "/:id",
    asyncHandler(async (req, res) => {
      if (!isUuid(req.params.id)) {
        throw new AppError(400, "VALIDATION_ERROR", "Invalid curriculum id.");
      }

      const parsed = patchCurriculumSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, "VALIDATION_ERROR", "Invalid body.", {
          issues: parsed.error.flatten(),
        });
      }

      const sb = req.auth.supabase;
      const curriculumId = req.params.id;

      const { data: existing, error: lErr } = await sb
        .from("curricula")
        .select("*")
        .eq("id", curriculumId)
        .maybeSingle();

      if (lErr) {
        throw new AppError(500, "DB_ERROR", lErr.message);
      }
      if (!existing) {
        throw new AppError(404, "NOT_FOUND", "Curriculum not found.");
      }

      const patch = { ...parsed.data };
      if (patch.sprint_days != null) {
        patch.sprint_days = clampSprintDays(patch.sprint_days);
      }

      const { data, error } = await sb
        .from("curricula")
        .update(patch)
        .eq("id", curriculumId)
        .select("*")
        .single();

      if (error) {
        throw new AppError(500, "DB_ERROR", error.message);
      }

      let rebalanced = 0;
      if (parsed.data.sprint_days != null) {
        rebalanced = await rebalanceScheduleForSprintDays(sb, curriculumId, data, data.sprint_days);
      }

      res.json({ curriculum: data, schedule_rebalanced: rebalanced });
    }),
  );

  router.delete(
    "/:id",
    asyncHandler(async (req, res) => {
      if (!isUuid(req.params.id)) {
        throw new AppError(400, "VALIDATION_ERROR", "Invalid curriculum id.");
      }

      const sb = req.auth.supabase;
      const curriculumId = req.params.id;

      const { error, count } = await sb
        .from("curricula")
        .delete({ count: "exact" })
        .eq("id", curriculumId);

      if (error) {
        throw new AppError(500, "DB_ERROR", error.message);
      }
      if (count == null || count === 0) {
        throw new AppError(404, "NOT_FOUND", "Curriculum not found.");
      }

      res.status(204).send();
    }),
  );

  router.get(
    "/:id",
    asyncHandler(async (req, res) => {
      if (!isUuid(req.params.id)) {
        throw new AppError(400, "VALIDATION_ERROR", "Invalid curriculum id.");
      }

      const sb = req.auth.supabase;
      const curriculumId = req.params.id;

      const { data: curriculum, error: cErr } = await sb
        .from("curricula")
        .select("*")
        .eq("id", curriculumId)
        .maybeSingle();

      if (cErr) {
        throw new AppError(500, "DB_ERROR", cErr.message);
      }
      if (!curriculum) {
        throw new AppError(404, "NOT_FOUND", "Curriculum not found.");
      }

      const { data: versions, error: vErr } = await sb
        .from("syllabus_versions")
        .select("*")
        .eq("curriculum_id", curriculumId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (vErr) {
        throw new AppError(500, "DB_ERROR", vErr.message);
      }

      const { data: items, error: iErr } = await sb
        .from("curriculum_items")
        .select("*")
        .eq("curriculum_id", curriculumId)
        .order("position", { ascending: true });

      if (iErr) {
        throw new AppError(500, "DB_ERROR", iErr.message);
      }

      res.json({
        curriculum,
        latest_syllabus_version: versions?.[0] ?? null,
        curriculum_items: items ?? [],
      });
    }),
  );

  return router;
}

module.exports = { createCurriculaRouter };
