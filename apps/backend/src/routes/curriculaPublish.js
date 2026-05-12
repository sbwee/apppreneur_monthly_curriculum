const { z } = require("zod");
const { asyncHandler } = require("../middleware/asyncHandler");
const { AppError } = require("../lib/errors");
const { isUuid } = require("../lib/uuid");

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const putPublishSchema = z
  .object({
    is_published: z.boolean(),
    public_slug: z.union([z.string().min(3).max(80).regex(slugRegex), z.null()]).optional(),
  })
  .strict();

/**
 * @param {import("express").Router} router
 */
function registerCurriculumPublishRoutes(router) {
  router.get(
    "/:id/publish",
    asyncHandler(async (req, res) => {
      if (!isUuid(req.params.id)) {
        throw new AppError(400, "VALIDATION_ERROR", "Invalid curriculum id.");
      }

      const sb = req.auth.supabase;
      const curriculumId = req.params.id;

      const { data: curriculum, error: cErr } = await sb.from("curricula").select("id").eq("id", curriculumId).maybeSingle();

      if (cErr) {
        throw new AppError(500, "DB_ERROR", cErr.message);
      }
      if (!curriculum) {
        throw new AppError(404, "NOT_FOUND", "Curriculum not found.");
      }

      const { data: settings, error: sErr } = await sb
        .from("publish_settings")
        .select("*")
        .eq("curriculum_id", curriculumId)
        .maybeSingle();

      if (sErr) {
        throw new AppError(500, "DB_ERROR", sErr.message);
      }

      res.json({
        publish_settings:
          settings ??
          ({
            curriculum_id: curriculumId,
            is_published: false,
            public_slug: null,
            published_at: null,
          }),
      });
    }),
  );

  router.put(
    "/:id/publish",
    asyncHandler(async (req, res) => {
      if (!isUuid(req.params.id)) {
        throw new AppError(400, "VALIDATION_ERROR", "Invalid curriculum id.");
      }

      const parsed = putPublishSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, "VALIDATION_ERROR", "Invalid body.", {
          issues: parsed.error.flatten(),
        });
      }

      const sb = req.auth.supabase;
      const curriculumId = req.params.id;

      const { data: curriculum, error: cErr } = await sb.from("curricula").select("id").eq("id", curriculumId).maybeSingle();

      if (cErr) {
        throw new AppError(500, "DB_ERROR", cErr.message);
      }
      if (!curriculum) {
        throw new AppError(404, "NOT_FOUND", "Curriculum not found.");
      }

      const { data: existing, error: lErr } = await sb
        .from("publish_settings")
        .select("*")
        .eq("curriculum_id", curriculumId)
        .maybeSingle();

      if (lErr) {
        throw new AppError(500, "DB_ERROR", lErr.message);
      }

      const body = parsed.data;

      let public_slug;
      if (body.is_published) {
        const fromBody =
          body.public_slug === undefined
            ? undefined
            : body.public_slug === null
              ? null
              : String(body.public_slug).trim().toLowerCase();

        public_slug =
          fromBody !== undefined
            ? fromBody
            : existing?.public_slug
              ? String(existing.public_slug).toLowerCase()
              : null;

        if (!public_slug) {
          throw new AppError(
            400,
            "VALIDATION_ERROR",
            "public_slug is required when publishing (or save a slug first).",
          );
        }
      } else {
        public_slug = null;
      }

      let published_at = existing?.published_at ?? null;
      if (body.is_published) {
        published_at = published_at || new Date().toISOString();
      } else {
        published_at = null;
      }

      const row = {
        curriculum_id: curriculumId,
        is_published: body.is_published,
        public_slug,
        published_at,
      };

      const { data, error } = await sb.from("publish_settings").upsert(row, { onConflict: "curriculum_id" }).select("*").single();

      if (error) {
        if (String(error.message || "").includes("duplicate") || error.code === "23505") {
          throw new AppError(409, "SLUG_TAKEN", "That public_slug is already in use.");
        }
        throw new AppError(500, "DB_ERROR", error.message);
      }

      res.json({ publish_settings: data });
    }),
  );
}

module.exports = { registerCurriculumPublishRoutes };
