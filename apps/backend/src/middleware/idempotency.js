const crypto = require("crypto");
const { AppError } = require("../lib/errors");

/** @type {Map<string, { bodyHash: string; status: number; body: unknown; expiresAt: number }>} */
const completed = new Map();

/** @type {Map<string, { bodyHash: string; promise: Promise<{ status: number; body: unknown }>; resolve: (v: { status: number; body: unknown }) => void }>} */
const inflight = new Map();

const MAX_ENTRIES = 5000;
const PRUNE_EVERY_MS = 60_000;

let pruneTimerStarted = false;

function startPruneTimer(ttlMs) {
  if (pruneTimerStarted) return;
  pruneTimerStarted = true;
  setInterval(() => prune(ttlMs), PRUNE_EVERY_MS).unref?.();
}

function prune(ttlMs) {
  const now = Date.now();
  for (const [k, v] of completed) {
    if (v.expiresAt <= now) completed.delete(k);
  }
  while (completed.size > MAX_ENTRIES) {
    const first = completed.keys().next().value;
    if (first === undefined) break;
    completed.delete(first);
  }
}

function bodyFingerprint(body) {
  const raw = JSON.stringify(body ?? {});
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function logicalKey(userId, method, path, idemKey) {
  return `${userId}|${method}|${path}|${idemKey}`;
}

function cacheKey(logical, bodyHash) {
  return `${logical}|${bodyHash}`;
}

/**
 * Replays identical POST/PUT when `Idempotency-Key` matches a prior completed request with the same body.
 * Conflicting reuse of the same key with a different body returns 409.
 * @returns {import("express").RequestHandler}
 */
function idempotencyForAuthedMutations() {
  return function idempotencyMiddleware(req, res, next) {
    const ttlMs = Number(req.app.locals.runtimeEnv?.idempotencyTtlMs ?? 86_400_000);
    startPruneTimer(ttlMs);

    if (req.method !== "POST" && req.method !== "PUT") {
      return next();
    }

    const rawKey = req.get("Idempotency-Key")?.trim();
    if (!rawKey) {
      return next();
    }
    if (rawKey.length > 256) {
      return next(new AppError(400, "VALIDATION_ERROR", "Idempotency-Key must be at most 256 characters."));
    }

    const userId = req.auth?.user?.id;
    if (!userId) {
      return next();
    }

    const path = req.originalUrl?.split("?")[0] || req.url || "";
    const method = req.method;
    const bodyHash = bodyFingerprint(req.body);
    const logKey = logicalKey(String(userId), method, path, rawKey);
    const fullKey = cacheKey(logKey, bodyHash);

    const hit = completed.get(fullKey);
    if (hit && hit.expiresAt > Date.now()) {
      return res.status(hit.status).json(hit.body);
    }

    const existingInflight = inflight.get(logKey);
    if (existingInflight) {
      if (existingInflight.bodyHash !== bodyHash) {
        return next(
          new AppError(
            409,
            "IDEMPOTENCY_CONFLICT",
            "The same Idempotency-Key was reused with a different request body.",
          ),
        );
      }
      existingInflight.promise
        .then(({ status, body }) => res.status(status).json(body))
        .catch(next);
      return undefined;
    }

    let resolvePromise;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    inflight.set(logKey, { bodyHash, promise, resolve: resolvePromise });

    let settled = false;
    function settle(entry, payload) {
      if (settled) return;
      settled = true;
      inflight.delete(logKey);
      entry.resolve(payload);
    }

    const origJson = res.json.bind(res);
    res.json = function idempotentJson(body) {
      const entry = inflight.get(logKey);
      if (entry && entry.bodyHash === bodyHash) {
        const status = res.statusCode;
        completed.set(fullKey, {
          bodyHash,
          status,
          body,
          expiresAt: Date.now() + ttlMs,
        });
        settle(entry, { status, body });
      }
      return origJson(body);
    };

    res.on("close", () => {
      if (res.writableEnded) return;
      const entry = inflight.get(logKey);
      if (!entry) return;
      settle(entry, {
        status: 499,
        body: { error: { code: "CLIENT_CLOSED", message: "Request closed before completion." } },
      });
    });

    next();
    return undefined;
  };
}

module.exports = { idempotencyForAuthedMutations };
