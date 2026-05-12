const { AppError } = require("../lib/errors");
const { createSupabaseWithUserAccessToken } = require("../config/supabase");

/**
 * Verifies Supabase access_token and attaches a user-scoped PostgREST client (RLS on).
 *
 * @param {{
 *   env: { supabaseUrl?: string; supabaseAnonKey?: string };
 *   supabaseAdmin: { client: import("@supabase/supabase-js").SupabaseClient | null; configured: boolean };
 * }} ctx
 */
function createRequireAuth(ctx) {
  /**
   * @type {import("express").RequestHandler}
   */
  return async function requireAuth(req, _res, next) {
    try {
      const header = req.get("authorization") || "";
      const match = /^Bearer\s+(.+)$/i.exec(header);
      if (!match?.[1]) {
        throw new AppError(401, "UNAUTHORIZED", "Missing Authorization Bearer token.");
      }

      const accessToken = match[1].trim();
      if (!ctx.supabaseAdmin?.client || !ctx.supabaseAdmin.configured) {
        throw new AppError(
          503,
          "SERVER_CONFIG",
          "Supabase admin client is not configured.",
        );
      }

      const { data, error } = await ctx.supabaseAdmin.client.auth.getUser(accessToken);
      if (error || !data?.user) {
        throw new AppError(401, "INVALID_TOKEN", "Invalid or expired session.");
      }

      const userClient = createSupabaseWithUserAccessToken(ctx.env, accessToken);
      if (!userClient) {
        throw new AppError(
          503,
          "SERVER_CONFIG",
          "SUPABASE_ANON_KEY is not configured.",
        );
      }

      req.auth = {
        user: data.user,
        accessToken,
        supabase: userClient,
      };
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { createRequireAuth };
