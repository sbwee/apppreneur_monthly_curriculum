const express = require("express");
const { z } = require("zod");
const { asyncHandler } = require("../middleware/asyncHandler");
const { AppError } = require("../lib/errors");
const { isUuid } = require("../lib/uuid");

const createNoteSchema = z
  .object({
    resource_id: z.string().uuid(),
    curriculum_item_id: z.union([z.string().uuid(), z.null()]).optional(),
    body_markdown: z.string().max(200_000).optional().default(""),
    is_public_asset: z.boolean().optional().default(false),
  })
  .strict();

const patchNoteSchema = z
  .object({
    body_markdown: z.string().max(200_000).optional(),
    is_public_asset: z.boolean().optional(),
    curriculum_item_id: z.union([z.string().uuid(), z.null()]).optional(),
  })
  .strict();

const listQuerySchema = z.object({
  resource_id: z.string().uuid(),
  curriculum_item_id: z.string().uuid().optional(),
});

function createNotesRouter() {
  const router = express.Router();

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const parsed = listQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new AppError(400, "VALIDATION_ERROR", "Query must include resource_id (uuid).", {
          issues: parsed.error.flatten(),
        });
      }

      const sb = req.auth.supabase;
      let q = sb.from("notes").select("*").eq("resource_id", parsed.data.resource_id).order("created_at", {
        ascending: false,
      });

      if (parsed.data.curriculum_item_id) {
        q = q.eq("curriculum_item_id", parsed.data.curriculum_item_id);
      }

      const { data, error } = await q;
      if (error) {
        throw new AppError(500, "DB_ERROR", error.message);
      }

      res.json({ notes: data ?? [] });
    }),
  );

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const parsed = createNoteSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, "VALIDATION_ERROR", "Invalid body.", {
          issues: parsed.error.flatten(),
        });
      }

      const sb = req.auth.supabase;
      const userId = req.auth.user.id;

      const insertRow = {
        user_id: userId,
        resource_id: parsed.data.resource_id,
        curriculum_item_id: parsed.data.curriculum_item_id ?? null,
        body_markdown: parsed.data.body_markdown,
        is_public_asset: parsed.data.is_public_asset,
      };

      const { data, error } = await sb.from("notes").insert(insertRow).select("*").single();

      if (error) {
        throw new AppError(500, "DB_ERROR", error.message);
      }

      res.status(201).json({ note: data });
    }),
  );

  router.get(
    "/:id",
    asyncHandler(async (req, res) => {
      if (!isUuid(req.params.id)) {
        throw new AppError(400, "VALIDATION_ERROR", "Invalid note id.");
      }

      const sb = req.auth.supabase;
      const { data, error } = await sb.from("notes").select("*").eq("id", req.params.id).maybeSingle();

      if (error) {
        throw new AppError(500, "DB_ERROR", error.message);
      }
      if (!data) {
        throw new AppError(404, "NOT_FOUND", "Note not found.");
      }

      res.json({ note: data });
    }),
  );

  router.patch(
    "/:id",
    asyncHandler(async (req, res) => {
      if (!isUuid(req.params.id)) {
        throw new AppError(400, "VALIDATION_ERROR", "Invalid note id.");
      }

      const parsed = patchNoteSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, "VALIDATION_ERROR", "Invalid body.", {
          issues: parsed.error.flatten(),
        });
      }

      const sb = req.auth.supabase;

      const { data: existing, error: lErr } = await sb.from("notes").select("*").eq("id", req.params.id).maybeSingle();

      if (lErr) {
        throw new AppError(500, "DB_ERROR", lErr.message);
      }
      if (!existing) {
        throw new AppError(404, "NOT_FOUND", "Note not found.");
      }

      const patch = parsed.data;
      const next = {
        body_markdown: patch.body_markdown !== undefined ? patch.body_markdown : existing.body_markdown,
        is_public_asset: patch.is_public_asset !== undefined ? patch.is_public_asset : existing.is_public_asset,
        curriculum_item_id:
          patch.curriculum_item_id !== undefined ? patch.curriculum_item_id : existing.curriculum_item_id,
      };

      const { data, error } = await sb.from("notes").update(next).eq("id", req.params.id).select("*").single();

      if (error) {
        throw new AppError(500, "DB_ERROR", error.message);
      }

      res.json({ note: data });
    }),
  );

  router.delete(
    "/:id",
    asyncHandler(async (req, res) => {
      if (!isUuid(req.params.id)) {
        throw new AppError(400, "VALIDATION_ERROR", "Invalid note id.");
      }

      const sb = req.auth.supabase;
      const { error, count } = await sb.from("notes").delete({ count: "exact" }).eq("id", req.params.id);

      if (error) {
        throw new AppError(500, "DB_ERROR", error.message);
      }
      if (count == null || count === 0) {
        throw new AppError(404, "NOT_FOUND", "Note not found.");
      }

      res.status(204).send();
    }),
  );

  return router;
}

module.exports = { createNotesRouter };
