const { AppError, isAppError } = require("../lib/errors");

/**
 * Express 4-arg error handler: consistent JSON body.
 * @type {import("express").ErrorRequestHandler}
 */
function errorHandler(err, req, res, _next) {
  const requestId = req.requestId;

  if (isAppError(err)) {
    const body = {
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
        ...(requestId ? { requestId } : {}),
      },
    };
    return res.status(err.statusCode).json(body);
  }

  const statusCode = typeof err?.statusCode === "number" ? err.statusCode : 500;
  const code = statusCode === 404 ? "NOT_FOUND" : "INTERNAL_ERROR";
  const message =
    statusCode === 500 && process.env.NODE_ENV === "production"
      ? "An unexpected error occurred."
      : err?.message || "An unexpected error occurred.";

  if (statusCode >= 500) {
    const logLine = {
      ts: new Date().toISOString(),
      level: "error",
      msg: "http_error",
      requestId: requestId ?? null,
      statusCode,
      err:
        err instanceof Error
          ? { name: err.name, message: err.message, stack: process.env.NODE_ENV === "production" ? undefined : err.stack }
          : String(err),
    };
    console.error(JSON.stringify(logLine));
  }

  return res.status(statusCode).json({
    error: { code, message, ...(requestId ? { requestId } : {}) },
  });
}

/**
 * @type {import("express").RequestHandler}
 */
function notFoundHandler(req, res) {
  const e = new AppError(404, "NOT_FOUND", "Route not found.");
  const requestId = req.requestId;
  res.status(e.statusCode).json({
    error: { code: e.code, message: e.message, ...(requestId ? { requestId } : {}) },
  });
}

module.exports = { errorHandler, notFoundHandler };
