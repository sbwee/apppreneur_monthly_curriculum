const express = require("express");
const { createHealthRouter } = require("./health");
const { createHelloRouter } = require("./hello");
const { createRequireAuth } = require("../middleware/requireAuth");
const { createFoldersRouter } = require("./folders");
const { createResourcesRouter } = require("./resources");
const { createCurriculaRouter } = require("./curricula");
const { createScheduleAssignmentPatchRouter } = require("./scheduleAssignments");
const { createNotesRouter } = require("./notes");
const { createPublicShowcaseHandler } = require("./showcasePublic");
const {
  createApiGeneralLimiter,
  createPublicShowcaseLimiter,
} = require("../middleware/rateLimits");
const { idempotencyForAuthedMutations } = require("../middleware/idempotency");

const apiGeneralLimiter = createApiGeneralLimiter();
const publicShowcaseLimiter = createPublicShowcaseLimiter();
const idempotencyMiddleware = idempotencyForAuthedMutations();

/**
 * @param {{
 *   supabase: { client: import("@supabase/supabase-js").SupabaseClient | null; configured: boolean };
 *   env: Record<string, string | undefined>;
 * }} ctx
 */
function createApiRouter(ctx) {
  const router = express.Router();
  router.use(apiGeneralLimiter);

  router.use(createHealthRouter(ctx.supabase));
  router.use(createHelloRouter(ctx.supabase));

  router.get("/public/:slug", publicShowcaseLimiter, createPublicShowcaseHandler(ctx.supabase));

  const requireAuth = createRequireAuth({
    env: ctx.env,
    supabaseAdmin: ctx.supabase,
  });

  router.use("/folders", requireAuth, idempotencyMiddleware, createFoldersRouter());
  router.use("/resources", requireAuth, idempotencyMiddleware, createResourcesRouter());
  router.use("/curricula", requireAuth, idempotencyMiddleware, createCurriculaRouter());
  router.use("/schedule-assignments", requireAuth, idempotencyMiddleware, createScheduleAssignmentPatchRouter());
  router.use("/notes", requireAuth, idempotencyMiddleware, createNotesRouter());

  return router;
}

module.exports = { createApiRouter };
