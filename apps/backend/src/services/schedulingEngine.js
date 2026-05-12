const { addCalendarDays, compareIsoDates, formatIsoDateOnly } = require("../lib/calendarDates");

/**
 * @param {{ week_index: number | null; day_index: number | null; position: number }} item
 * @param {string} startDateIso YYYY-MM-DD anchor (typically curriculum.month_start or explicit)
 */
function itemToScheduledDate(item, startDateIso) {
  const week = Number.isFinite(item.week_index) ? item.week_index : 0;
  const day = Number.isFinite(item.day_index) ? item.day_index : 0;
  const offset = week * 7 + day;
  return addCalendarDays(startDateIso, offset);
}

/**
 * @param {Array<{ id: string; week_index: number | null; day_index: number | null; position: number }>} items
 * @param {string} startDateIso
 * @returns {Array<{ curriculum_item_id: string; scheduled_date: string; position: number }>}
 */
function buildBootstrapRows(items, startDateIso) {
  const sorted = [...items].sort((a, b) => Number(a.position) - Number(b.position));
  return sorted.map((it) => ({
    curriculum_item_id: String(it.id),
    scheduled_date: itemToScheduledDate(it, startDateIso),
    position: Number(it.position) || 0,
  }));
}

/**
 * Slide planned assignments on or after missedDate forward by `shiftDays` (default 1).
 * @param {Array<{ id: string; scheduled_date: string; status: string }>} rows
 * @param {string} missedDateIso
 * @param {number} [shiftDays]
 * @returns {Array<{ id: string; scheduled_date: string }>}
 */
function computeReslideUpdates(rows, missedDateIso, shiftDays = 1) {
  const updates = [];
  for (const row of rows) {
    if (row.status !== "planned") {
      continue;
    }
    if (compareIsoDates(row.scheduled_date, missedDateIso) < 0) {
      continue;
    }
    updates.push({
      id: row.id,
      scheduled_date: addCalendarDays(row.scheduled_date, shiftDays),
    });
  }
  return updates;
}

/**
 * @param {string} todayIso
 * @param {number} periodDays
 */
function velocityWindow(todayIso, periodDays) {
  const end = todayIso;
  const start = addCalendarDays(todayIso, -(periodDays - 1));
  return { period_start: start, period_end: end };
}

/**
 * @param {Array<{ status: string; completed_at?: string | null }>} assignments
 * @param {{ period_start: string; period_end: string }} window
 */
function countCompletedInWindow(assignments, window) {
  let n = 0;
  for (const a of assignments) {
    if (a.status !== "done" || !a.completed_at) {
      continue;
    }
    const doneDay = formatIsoDateOnly(new Date(a.completed_at));
    if (compareIsoDates(doneDay, window.period_start) >= 0 && compareIsoDates(doneDay, window.period_end) <= 0) {
      n += 1;
    }
  }
  return n;
}

module.exports = {
  itemToScheduledDate,
  buildBootstrapRows,
  computeReslideUpdates,
  velocityWindow,
  countCompletedInWindow,
};
