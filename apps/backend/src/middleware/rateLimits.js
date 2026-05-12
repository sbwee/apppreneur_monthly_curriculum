const rateLimitMod = require("express-rate-limit");
const rateLimit = rateLimitMod;
const ipKeyGenerator = rateLimitMod.ipKeyGenerator;
const { AppError } = require("../lib/errors");

function isTestEnv() {
  return process.env.NODE_ENV === "test";
}

function rateLimitJson(_req, res) {
  const body = {
    error: {
      code: "RATE_LIMITED",
      message: "Too many requests. Slow down and try again later.",
    },
  };
  return res.status(429).json(body);
}

/**
 * Broad limit for all /api traffic (per IP).
 */
function createApiGeneralLimiter() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: (req) => {
      const n = Number(req.app.locals.runtimeEnv?.apiRateLimitMax ?? 300);
      return Number.isFinite(n) && n > 0 ? n : 300;
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => isTestEnv(),
    handler: rateLimitJson,
  });
}

/**
 * Unauthenticated public read (per IP).
 */
function createPublicShowcaseLimiter() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: (req) => {
      const n = Number(req.app.locals.runtimeEnv?.publicRateLimitMax ?? 120);
      return Number.isFinite(n) && n > 0 ? n : 120;
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => isTestEnv(),
    handler: rateLimitJson,
  });
}

/**
 * LLM-heavy routes: per authenticated user (fallback IP if ever mounted without auth).
 */
function createLlmUserLimiter() {
  return rateLimit({
    windowMs: 60 * 60 * 1000,
    max: (req) => {
      const n = Number(req.app.locals.runtimeEnv?.llmRateLimitMax ?? 40);
      return Number.isFinite(n) && n > 0 ? n : 40;
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => isTestEnv(),
    keyGenerator: (req) => {
      const uid = req.auth?.user?.id;
      if (uid) return `uid:${uid}`;
      const ip = req.ip && String(req.ip).trim() ? String(req.ip) : "127.0.0.1";
      return `ip:${ipKeyGenerator(ip, 56)}`;
    },
    handler: rateLimitJson,
  });
}

/**
 * @param {import("express").Request} req
 */
function assertLlmBodyWithinBudget(req) {
  const max = Number(req.app.locals.runtimeEnv?.llmMaxRequestBodyBytes ?? 512_000);
  const len = Number(req.get("content-length"));
  if (Number.isFinite(len) && len > max) {
    throw new AppError(
      413,
      "PAYLOAD_TOO_LARGE",
      `Request body exceeds LLM route limit (${max} bytes).`,
    );
  }
}

/** @type {import("express").RequestHandler} */
function llmBodyBudgetMiddleware(req, _res, next) {
  try {
    assertLlmBodyWithinBudget(req);
    next();
  } catch (err) {
    next(err);
  }
}

const sharedLlmUserLimiter = createLlmUserLimiter();

module.exports = {
  createApiGeneralLimiter,
  createPublicShowcaseLimiter,
  createLlmUserLimiter,
  assertLlmBodyWithinBudget,
  llmBodyBudgetMiddleware,
  sharedLlmUserLimiter,
};
