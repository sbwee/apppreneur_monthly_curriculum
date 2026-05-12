const { z } = require("zod");
const { asyncHandler } = require("../middleware/asyncHandler");
const { AppError } = require("../lib/errors");
const { isUuid } = require("../lib/uuid");
const { formatIsoDateOnly } = require("../lib/calendarDates");
const {
  buildBootstrapRows,
  computeReslideUpdates,
  velocityWindow,
  countCompletedInWindow,
} = require("../services/schedulingEngine");

const bootstrapBodySchema = z
  .object({
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })
  .strict();

const scheduleQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const reslideBodySchema = z
  .object({
    missed_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    shift_days: z.number().int().min(1).max(14).optional(),
  })
  .strict();

const velocitySnapshotBodySchema = z
  .object({
    period_days: z.number().int().min(1).max(90).optional(),
  })
  .strict();

function utcTodayIsoDate() {
  return formatIsoDateOnly(new Date());
}

/**
 * @param {import("express").Router} router
 */
function registerCurriculumScheduleRoutes(router) {
  router.post(
    "/:id/schedule/bootstrap",
    asyncHandler(async (req, res) => {
      if (!isUuid(req.params.id)) {
        throw new AppError(400, "VALIDATION_ERROR", "Invalid curriculum id.");
      }

      const curriculumId = req.params.id;
      const sb = req.auth.supabase;

      const parsed = bootstrapBodySchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        throw new AppError(400, "VALIDATION_ERROR", "Invalid body.", {
          issues: parsed.error.flatten(),
        });
      }

      const force = req.query.force === "1" || req.query.force === "true";

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

      const { data: existingRows, error: existErr } = await sb
        .from("schedule_assignments")
        .select("id")
        .eq("curriculum_id", curriculumId)
        .limit(1);

      if (existErr) {
        throw new AppError(500, "DB_ERROR", existErr.message);
      }

      if ((existingRows?.length ?? 0) > 0 && !force) {
        throw new AppError(409, "SCHEDULE_EXISTS", "Schedule already exists. Pass ?force=1 to rebuild.");
      }

      if (force) {
        const { error: delErr } = await sb.from("schedule_assignments").delete().eq("curriculum_id", curriculumId);
        if (delErr) {
          throw new AppError(500, "DB_ERROR", delErr.message);
        }
      }

      const { data: items, error: iErr } = await sb
        .from("curriculum_items")
        .select("id, position, week_index, day_index")
        .eq("curriculum_id", curriculumId)
        .order("position", { ascending: true });

      if (iErr) {
        throw new AppError(500, "DB_ERROR", iErr.message);
      }
      if (!items?.length) {
        throw new AppError(400, "NO_ITEMS", "Add a syllabus (curriculum items) before bootstrapping a schedule.");
      }

      const startDate =
        parsed.data.start_date ??
        (curriculum.month_start ? String(curriculum.month_start) : utcTodayIsoDate());

      const built = buildBootstrapRows(items, startDate);
      const rows = built.map((r) => ({
        curriculum_id: curriculumId,
        curriculum_item_id: r.curriculum_item_id,
        scheduled_date: r.scheduled_date,
        position: r.position,
        status: "planned",
      }));

      const { data: inserted, error: insErr } = await sb
        .from("schedule_assignments")
        .insert(rows)
        .select("*");

      if (insErr) {
        throw new AppError(500, "DB_ERROR", insErr.message);
      }

      res.status(201).json({ assignments: inserted ?? [] });
    }),
  );

  router.get(
    "/:id/schedule",
    asyncHandler(async (req, res) => {
      if (!isUuid(req.params.id)) {
        throw new AppError(400, "VALIDATION_ERROR", "Invalid curriculum id.");
      }

      const curriculumId = req.params.id;
      const q = scheduleQuerySchema.safeParse(req.query);
      if (!q.success) {
        throw new AppError(400, "VALIDATION_ERROR", "Query requires from=YYYY-MM-DD and to=YYYY-MM-DD.", {
          issues: q.error.flatten(),
        });
      }

      const sb = req.auth.supabase;

      const { data: curriculum, error: cErr } = await sb
        .from("curricula")
        .select("id")
        .eq("id", curriculumId)
        .maybeSingle();

      if (cErr) {
        throw new AppError(500, "DB_ERROR", cErr.message);
      }
      if (!curriculum) {
        throw new AppError(404, "NOT_FOUND", "Curriculum not found.");
      }

      const { data: rows, error: sErr } = await sb
        .from("schedule_assignments")
        .select("*")
        .eq("curriculum_id", curriculumId)
        .gte("scheduled_date", q.data.from)
        .lte("scheduled_date", q.data.to)
        .order("scheduled_date", { ascending: true })
        .order("position", { ascending: true });

      if (sErr) {
        throw new AppError(500, "DB_ERROR", sErr.message);
      }

      const ids = [...new Set((rows ?? []).map((r) => String(r.curriculum_item_id)))];
      let itemMap = new Map();
      if (ids.length) {
        const { data: items, error: iErr } = await sb.from("curriculum_items").select("*").in("id", ids);

        if (iErr) {
          throw new AppError(500, "DB_ERROR", iErr.message);
        }

        const resourceIds = [...new Set((items ?? []).map((it) => it.resource_id).filter(Boolean).map(String))];
        let resourceMap = new Map();
        if (resourceIds.length) {
          const { data: resources, error: rErr } = await sb.from("resources").select("*").in("id", resourceIds);
          if (rErr) {
            throw new AppError(500, "DB_ERROR", rErr.message);
          }
          resourceMap = new Map((resources ?? []).map((r) => [String(r.id), r]));
        }

        itemMap = new Map(
          (items ?? []).map((it) => {
            const rid = it.resource_id ? String(it.resource_id) : null;
            return [
              String(it.id),
              rid ? { ...it, resource: resourceMap.get(rid) ?? null } : { ...it, resource: null },
            ];
          }),
        );
      }

      const assignments = (rows ?? []).map((r) => ({
        ...r,
        curriculum_item: itemMap.get(String(r.curriculum_item_id)) ?? null,
      }));

      res.json({ assignments });
    }),
  );

  router.post(
    "/:id/schedule/reslide",
    asyncHandler(async (req, res) => {
      if (!isUuid(req.params.id)) {
        throw new AppError(400, "VALIDATION_ERROR", "Invalid curriculum id.");
      }

      const parsed = reslideBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, "VALIDATION_ERROR", "Invalid body.", {
          issues: parsed.error.flatten(),
        });
      }

      const curriculumId = req.params.id;
      const sb = req.auth.supabase;

      const { data: curriculum, error: cErr } = await sb
        .from("curricula")
        .select("id")
        .eq("id", curriculumId)
        .maybeSingle();

      if (cErr) {
        throw new AppError(500, "DB_ERROR", cErr.message);
      }
      if (!curriculum) {
        throw new AppError(404, "NOT_FOUND", "Curriculum not found.");
      }

      const { data: rows, error: sErr } = await sb
        .from("schedule_assignments")
        .select("id, scheduled_date, status")
        .eq("curriculum_id", curriculumId);

      if (sErr) {
        throw new AppError(500, "DB_ERROR", sErr.message);
      }

      const shiftDays = parsed.data.shift_days ?? 1;
      const updates = computeReslideUpdates(rows ?? [], parsed.data.missed_date, shiftDays);

      for (const u of updates) {
        const { error: uErr } = await sb
          .from("schedule_assignments")
          .update({ scheduled_date: u.scheduled_date })
          .eq("id", u.id)
          .eq("curriculum_id", curriculumId);

        if (uErr) {
          throw new AppError(500, "DB_ERROR", uErr.message);
        }
      }

      res.json({ updated: updates.length, shift_days: shiftDays });
    }),
  );

  router.post(
    "/:id/velocity/snapshot",
    asyncHandler(async (req, res) => {
      if (!isUuid(req.params.id)) {
        throw new AppError(400, "VALIDATION_ERROR", "Invalid curriculum id.");
      }

      const parsed = velocitySnapshotBodySchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        throw new AppError(400, "VALIDATION_ERROR", "Invalid body.", {
          issues: parsed.error.flatten(),
        });
      }

      const curriculumId = req.params.id;
      const sb = req.auth.supabase;
      const userId = req.auth.user.id;

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

      const periodDays = parsed.data.period_days ?? 7;
      const today = utcTodayIsoDate();
      const window = velocityWindow(today, periodDays);

      const { data: rows, error: sErr } = await sb
        .from("schedule_assignments")
        .select("status, completed_at")
        .eq("curriculum_id", curriculumId);

      if (sErr) {
        throw new AppError(500, "DB_ERROR", sErr.message);
      }

      const resources_completed = countCompletedInWindow(rows ?? [], window);

      const snapshot = {
        window,
        total_assignments: (rows ?? []).length,
        done_total: (rows ?? []).filter((r) => r.status === "done").length,
      };

      const { data: snap, error: vErr } = await sb
        .from("velocity_snapshots")
        .insert({
          curriculum_id: curriculumId,
          user_id: userId,
          period_start: window.period_start,
          period_end: window.period_end,
          resources_completed,
          snapshot,
        })
        .select("*")
        .single();

      if (vErr) {
        throw new AppError(500, "DB_ERROR", vErr.message);
      }

      res.status(201).json({ velocity_snapshot: snap });
    }),
  );

  router.get(
    "/:id/velocity",
    asyncHandler(async (req, res) => {
      if (!isUuid(req.params.id)) {
        throw new AppError(400, "VALIDATION_ERROR", "Invalid curriculum id.");
      }

      const curriculumId = req.params.id;
      const sb = req.auth.supabase;

      const { data: curriculum, error: cErr } = await sb
        .from("curricula")
        .select("id")
        .eq("id", curriculumId)
        .maybeSingle();

      if (cErr) {
        throw new AppError(500, "DB_ERROR", cErr.message);
      }
      if (!curriculum) {
        throw new AppError(404, "NOT_FOUND", "Curriculum not found.");
      }

      const { data, error } = await sb
        .from("velocity_snapshots")
        .select("*")
        .eq("curriculum_id", curriculumId)
        .order("created_at", { ascending: false })
        .limit(60);

      if (error) {
        throw new AppError(500, "DB_ERROR", error.message);
      }

      res.json({ velocity_snapshots: data ?? [] });
    }),
  );
}

module.exports = { registerCurriculumScheduleRoutes };
