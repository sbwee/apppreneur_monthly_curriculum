const path = require("path");
const dotenv = require("dotenv");

/**
 * Loads apps/backend/.env. Required for Supabase-backed routes:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 *
 * For user-scoped API routes (RLS enforced):
 * - SUPABASE_ANON_KEY
 *
 * Optional:
 * - PORT (default 4000)
 * - FRONTEND_URL (default http://localhost:3000)
 * - OPENAI_API_KEY (for resource enrichment and syllabus generation)
 * - OPENAI_MODEL (default gpt-4o-mini)
 * - TRUST_PROXY=1 when behind a reverse proxy (correct client IP for rate limits)
 * - OPENAI_TIMEOUT_MS (default 120000), OPENAI_MAX_RETRIES (default 1)
 * - LLM_MAX_COMPLETION_TOKENS_ENRICH (default 1024), LLM_MAX_COMPLETION_TOKENS_SYLLABUS (default 12000)
 * - API_RATE_LIMIT_MAX, PUBLIC_RATE_LIMIT_MAX, LLM_RATE_LIMIT_MAX (numeric caps)
 * - IDEMPOTENCY_TTL_MS (default 86400000), LLM_MAX_REQUEST_BODY_BYTES (default 512000)
 */
function loadEnv() {
  const envPath = path.resolve(__dirname, "..", "..", ".env");
  dotenv.config({ path: envPath });

  const trustRaw = (process.env.TRUST_PROXY || "").trim().toLowerCase();
  const trustProxy = trustRaw === "1" || trustRaw === "true" || trustRaw === "yes";

  const num = (name, fallback) => {
    const v = Number(process.env[name]);
    return Number.isFinite(v) && v >= 0 ? v : fallback;
  };

  return {
    port: Number(process.env.PORT || 4000),
    frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
    supabaseUrl: process.env.SUPABASE_URL || "",
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    openaiApiKey: process.env.OPENAI_API_KEY || "",
    openaiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
    trustProxy,
    openaiTimeoutMs: num("OPENAI_TIMEOUT_MS", 120_000),
    openaiMaxRetries: num("OPENAI_MAX_RETRIES", 1),
    llmMaxCompletionTokensEnrich: num("LLM_MAX_COMPLETION_TOKENS_ENRICH", 1024),
    llmMaxCompletionTokensSyllabus: num("LLM_MAX_COMPLETION_TOKENS_SYLLABUS", 12_000),
    apiRateLimitMax: num("API_RATE_LIMIT_MAX", 300),
    publicRateLimitMax: num("PUBLIC_RATE_LIMIT_MAX", 120),
    llmRateLimitMax: num("LLM_RATE_LIMIT_MAX", 40),
    idempotencyTtlMs: num("IDEMPOTENCY_TTL_MS", 86_400_000),
    llmMaxRequestBodyBytes: num("LLM_MAX_REQUEST_BODY_BYTES", 512_000),
  };
}

module.exports = { loadEnv };
