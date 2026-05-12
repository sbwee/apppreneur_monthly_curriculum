const express = require("express");

/**
 * @param {{ configured: boolean }} supabaseState
 */
function createHealthRouter(supabaseState) {
  const router = express.Router();

  router.get("/health", (_req, res) => {
    res.json({
      ok: true,
      supabaseConfigured: supabaseState.configured,
    });
  });

  return router;
}

module.exports = { createHealthRouter };
