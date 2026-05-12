const { asyncHandler } = require("../middleware/asyncHandler");
const { AppError } = require("../lib/errors");
const { buildShowcasePayload } = require("../services/showcaseAssembler");

const slugParamRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * @param {{ client: import("@supabase/supabase-js").SupabaseClient | null; configured: boolean }} supabaseAdmin
 */
function createPublicShowcaseHandler(supabaseAdmin) {
  return asyncHandler(async (req, res) => {
    const raw = (req.params.slug || "").trim().toLowerCase();
    if (!raw || raw.length > 120 || !slugParamRegex.test(raw)) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid slug.");
    }

    if (!supabaseAdmin?.client || !supabaseAdmin.configured) {
      throw new AppError(503, "SERVER_CONFIG", "Server cannot load public showcases (Supabase admin not configured).");
    }

    const payload = await buildShowcasePayload(supabaseAdmin.client, raw);
    if (!payload) {
      throw new AppError(404, "NOT_FOUND", "Showcase not found or not published.");
    }

    res.set("Cache-Control", "public, max-age=60");
    res.json(payload);
  });
}

module.exports = { createPublicShowcaseHandler };
