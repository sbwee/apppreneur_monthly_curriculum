const express = require("express");
const { z } = require("zod");
const { asyncHandler } = require("../middleware/asyncHandler");
const { AppError } = require("../lib/errors");

const createBodySchema = z.object({
  name: z.string().trim().min(1).max(200),
});

function createFoldersRouter() {
  const router = express.Router();

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const sb = req.auth.supabase;
      const { data, error } = await sb
        .from("folders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw new AppError(500, "DB_ERROR", error.message);
      }

      res.json({ folders: data ?? [] });
    }),
  );

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const parsed = createBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, "VALIDATION_ERROR", "Invalid body.", {
          issues: parsed.error.flatten(),
        });
      }

      const sb = req.auth.supabase;
      const userId = req.auth.user.id;

      const { data, error } = await sb
        .from("folders")
        .insert({ user_id: userId, name: parsed.data.name })
        .select("*")
        .single();

      if (error) {
        throw new AppError(500, "DB_ERROR", error.message);
      }

      res.status(201).json({ folder: data });
    }),
  );

  return router;
}

module.exports = { createFoldersRouter };
