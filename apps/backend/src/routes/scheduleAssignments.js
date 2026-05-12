const express = require("express");
const { z } = require("zod");
const { asyncHandler } = require("../middleware/asyncHandler");
const { AppError } = require("../lib/errors");
const { isUuid } = require("../lib/uuid");

const patchAssignmentSchema = z
  .object({
    status: z.enum(["planned", "done", "skipped", "deferred"]).optional(),
    scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (!val.status && !val.scheduled_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide at least one of status or scheduled_date.",
      });
    }
  });

function createScheduleAssignmentPatchRouter() {
  const router = express.Router();

  router.patch(
    "/:id",
    asyncHandler(async (req, res) => {
      if (!isUuid(req.params.id)) {
        throw new AppError(400, "VALIDATION_ERROR", "Invalid assignment id.");
      }

      const parsed = patchAssignmentSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, "VALIDATION_ERROR", "Invalid body.", {
          issues: parsed.error.flatten(),
        });
      }

      const sb = req.auth.supabase;
      const assignmentId = req.params.id;

      const { data: row, error: lErr } = await sb
        .from("schedule_assignments")
        .select("*")
        .eq("id", assignmentId)
        .maybeSingle();

      if (lErr) {
        throw new AppError(500, "DB_ERROR", lErr.message);
      }
      if (!row) {
        throw new AppError(404, "NOT_FOUND", "Assignment not found.");
      }

      const nextStatus = parsed.data.status ?? row.status;
      const nextDate = parsed.data.scheduled_date ?? row.scheduled_date;

      let completed_at = row.completed_at;
      if (nextStatus === "done" && row.status !== "done") {
        completed_at = new Date().toISOString();
      } else if (nextStatus !== "done") {
        completed_at = null;
      }

      const { data, error } = await sb
        .from("schedule_assignments")
        .update({
          status: nextStatus,
          scheduled_date: nextDate,
          completed_at,
        })
        .eq("id", assignmentId)
        .select("*")
        .single();

      if (error) {
        throw new AppError(500, "DB_ERROR", error.message);
      }

      res.json({ assignment: data });
    }),
  );

  return router;
}

module.exports = { createScheduleAssignmentPatchRouter };
