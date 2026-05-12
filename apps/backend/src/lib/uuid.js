const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * @param {string | undefined} value
 */
function isUuid(value) {
  return typeof value === "string" && UUID_RE.test(value);
}

module.exports = { isUuid };
