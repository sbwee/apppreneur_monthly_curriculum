const { loadEnv } = require("./src/config/env");
const { createSupabaseAdmin } = require("./src/config/supabase");
const { createApp } = require("./src/app");

const env = loadEnv();
const supabase = createSupabaseAdmin(env);

if (!supabase.configured) {
  console.warn(
    "[backend] Supabase env missing: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in apps/backend/.env",
  );
} else {
  console.log("[backend] Supabase client initialized from environment.");
}

const app = createApp({
  frontendUrl: env.frontendUrl,
  trustProxy: env.trustProxy,
  supabase,
  env,
});

const PORT = env.port;
app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
