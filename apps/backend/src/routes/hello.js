const express = require("express");
const { AppError } = require("../lib/errors");
const { asyncHandler } = require("../middleware/asyncHandler");
const { listStorageBuckets } = require("../services/supabaseProbe");

/**
 * @param {{ client: import("@supabase/supabase-js").SupabaseClient | null; configured: boolean }} supabaseState
 */
function createHelloRouter(supabaseState) {
  const router = express.Router();

  router.get(
    "/hello",
    asyncHandler(async (_req, res) => {
      if (!supabaseState.configured || !supabaseState.client) {
        throw new AppError(
          503,
          "SUPABASE_NOT_CONFIGURED",
          "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.",
        );
      }

      const { error } = await listStorageBuckets(supabaseState.client);

      if (error) {
        throw new AppError(
          502,
          "SUPABASE_UNAVAILABLE",
          "Could not verify Supabase connection.",
          { upstream: error.message },
        );
      }

      res.json({ message: "Hello World from backend + Supabase!" });
    }),
  );

  return router;
}

module.exports = { createHelloRouter };
