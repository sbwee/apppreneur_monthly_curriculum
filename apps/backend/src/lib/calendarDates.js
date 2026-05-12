/**
 * Parse YYYY-MM-DD as UTC midnight date value (calendar date only).
 * @param {string} isoDate
 * @returns {Date}
 */
function parseIsoDateOnly(isoDate) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!m) {
    throw new Error(`Invalid date (expected YYYY-MM-DD): ${isoDate}`);
  }
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  return new Date(Date.UTC(y, mo, d));
}

/**
 * @param {Date} d
 * @returns {string} YYYY-MM-DD
 */
function formatIsoDateOnly(d) {
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

/**
 * @param {string} isoDate
 * @param {number} days can be negative
 */
function addCalendarDays(isoDate, days) {
  const d = parseIsoDateOnly(isoDate);
  d.setUTCDate(d.getUTCDate() + days);
  return formatIsoDateOnly(d);
}

/**
 * @param {string} a YYYY-MM-DD
 * @param {string} b YYYY-MM-DD
 * @returns {number} negative if a < b
 */
function compareIsoDates(a, b) {
  return parseIsoDateOnly(a).getTime() - parseIsoDateOnly(b).getTime();
}

module.exports = {
  parseIsoDateOnly,
  formatIsoDateOnly,
  addCalendarDays,
  compareIsoDates,
};
