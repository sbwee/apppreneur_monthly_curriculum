const crypto = require("crypto");

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Assigns a stable request id (echo client X-Request-Id when valid UUID) and logs one JSON line per response.
 * @returns {import("express").RequestHandler}
 */
function requestContext() {
  return function requestContextMiddleware(req, res, next) {
    const incoming = req.get("x-request-id")?.trim();
    const id = incoming && UUID_RE.test(incoming) ? incoming : crypto.randomUUID();
    req.requestId = id;
    res.setHeader("X-Request-Id", id);

    const started = Date.now();
    const path = req.originalUrl?.split("?")[0] || req.url || "";

    res.on("finish", () => {
      const line = JSON.stringify({
        ts: new Date().toISOString(),
        level: "info",
        msg: "http_request",
        requestId: id,
        method: req.method,
        path,
        status: res.statusCode,
        durationMs: Date.now() - started,
        userId: req.auth?.user?.id ?? null,
      });
      console.log(line);
    });

    next();
  };
}

module.exports = { requestContext };
