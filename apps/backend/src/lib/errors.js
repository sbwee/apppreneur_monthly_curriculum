/**
 * Application error with HTTP status and stable machine-readable code.
 */
class AppError extends Error {
  /**
   * @param {number} statusCode
   * @param {string} code
   * @param {string} message
   * @param {unknown} [details]
   */
  constructor(statusCode, code, message, details) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/**
 * @param {unknown} err
 * @returns {err is AppError}
 */
function isAppError(err) {
  return Boolean(err && typeof err === "object" && err instanceof AppError);
}

module.exports = { AppError, isAppError };
