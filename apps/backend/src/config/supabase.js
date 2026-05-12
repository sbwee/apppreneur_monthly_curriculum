const { createClient } = require("@supabase/supabase-js");

/**
 * Creates a Supabase admin client only when URL and service role key are set.
 * No fallback keys — missing env yields null client.
 *
 * @param {{ supabaseUrl: string; supabaseServiceRoleKey: string }} env
 * @returns {{ client: import("@supabase/supabase-js").SupabaseClient | null; configured: boolean }}
 */
function createSupabaseAdmin(env) {
  const url = env.supabaseUrl?.trim();
  const key = env.supabaseServiceRoleKey?.trim();

  if (!url || !key) {
    return { client: null, configured: false };
  }

  try {
    const client = createClient(url, key);
    return { client, configured: true };
  } catch {
    return { client: null, configured: false };
  }
}

/**
 * Supabase client scoped to a logged-in user (RLS applies). Use on API routes
 * that receive the user's access token from the Authorization header.
 *
 * @param {{ supabaseUrl: string; supabaseAnonKey: string }} env
 * @param {string} accessToken Supabase Auth access_token (JWT)
 * @returns {import("@supabase/supabase-js").SupabaseClient | null}
 */
function createSupabaseWithUserAccessToken(env, accessToken) {
  const url = env.supabaseUrl?.trim();
  const anon = env.supabaseAnonKey?.trim();
  const token = accessToken?.trim();

  if (!url || !anon || !token) {
    return null;
  }

  try {
    return createClient(url, anon, {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    });
  } catch {
    return null;
  }
}

module.exports = {
  createSupabaseAdmin,
  createSupabaseWithUserAccessToken,
};
