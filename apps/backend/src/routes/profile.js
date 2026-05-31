const express = require("express");
const { z } = require("zod");
const { asyncHandler } = require("../middleware/asyncHandler");
const { AppError } = require("../lib/errors");

const DEFAULT_DAILY_MINUTES = 30;

const patchProfileSchema = z
  .object({
    display_name: z.string().trim().min(1).max(100).optional(),
    daily_minutes_goal: z.number().int().min(5).max(480).optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (val.display_name === undefined && val.daily_minutes_goal === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide at least one field to update.",
      });
    }
  });

function defaultDisplayName(user) {
  const meta = user?.user_metadata?.display_name;
  if (typeof meta === "string" && meta.trim()) {
    return meta.trim();
  }
  const email = user?.email ?? "";
  const local = email.split("@")[0]?.trim();
  return local || "Learner";
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} sb
 * @param {string} userId
 * @param {import("@supabase/supabase-js").User} user
 */
async function ensureProfileRow(sb, userId, user) {
  const { data, error } = await sb.from("profiles").select("*").eq("id", userId).maybeSingle();

  if (error) {
    throw new AppError(500, "DB_ERROR", error.message);
  }

  if (data) {
    return data;
  }

  const { data: inserted, error: insErr } = await sb
    .from("profiles")
    .insert({
      id: userId,
      display_name: defaultDisplayName(user),
      daily_minutes_goal: DEFAULT_DAILY_MINUTES,
    })
    .select("*")
    .single();

  if (insErr) {
    throw new AppError(500, "DB_ERROR", insErr.message);
  }

  return inserted;
}

function createProfileRouter() {
  const router = express.Router();

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const sb = req.auth.supabase;
      const userId = req.auth.user.id;
      const profile = await ensureProfileRow(sb, userId, req.auth.user);
      res.json({ profile });
    }),
  );

  router.patch(
    "/",
    asyncHandler(async (req, res) => {
      const parsed = patchProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, "VALIDATION_ERROR", "Invalid body.", {
          issues: parsed.error.flatten(),
        });
      }

      const sb = req.auth.supabase;
      const userId = req.auth.user.id;

      await ensureProfileRow(sb, userId, req.auth.user);

      const { data, error } = await sb
        .from("profiles")
        .update(parsed.data)
        .eq("id", userId)
        .select("*")
        .single();

      if (error) {
        throw new AppError(500, "DB_ERROR", error.message);
      }

      res.json({ profile: data });
    }),
  );

  return router;
}

module.exports = { createProfileRouter };
