const express = require("express");
const cors = require("cors");
const { createApiRouter } = require("./routes");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");
const { requestContext } = require("./middleware/requestContext");

/**
 * @param {{
 *   frontendUrl: string;
 *   trustProxy?: boolean;
 *   supabase: { client: import("@supabase/supabase-js").SupabaseClient | null; configured: boolean };
 *   env?: {
 *     supabaseUrl?: string;
 *     supabaseAnonKey?: string;
 *     supabaseServiceRoleKey?: string;
 *     openaiApiKey?: string;
 *     openaiModel?: string;
 *   };
 * }} options
 */
function createApp(options) {
  const app = express();

  if (options.trustProxy) {
    app.set("trust proxy", 1);
  }

  app.locals.runtimeEnv = options.env ?? {};

  app.use(cors({ origin: options.frontendUrl }));
  app.use(express.json());
  app.use(requestContext());

  app.use(
    "/api",
    createApiRouter({
      supabase: options.supabase,
      env: options.env ?? {},
    }),
  );

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
