const { addCalendarDays, compareIsoDates, formatIsoDateOnly } = require("../lib/calendarDates");

const DEFAULT_SPRINT_DAYS = 30;
const MIN_SPRINT_DAYS = 7;
const MAX_SPRINT_DAYS = 90;

/**
 * Day offsets (0 … sprintDays-1) evenly distributing itemCount assignments.
 * @param {number} itemCount
 * @param {number} sprintDays
 * @returns {number[]}
 */
function spreadDayOffsets(itemCount, sprintDays) {
  const days = Math.max(MIN_SPRINT_DAYS, Math.min(MAX_SPRINT_DAYS, sprintDays));
  if (itemCount <= 0) {
    return [];
  }
  if (itemCount === 1) {
    return [0];
  }

  const lastOffset = days - 1;
  return Array.from({ length: itemCount }, (_, index) =>
    Math.round((index * lastOffset) / (itemCount - 1)),
  );
}

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
 * Spread curriculum items evenly across a sprint window (inclusive start day + sprintDays-1 offsets).
 * @param {Array<{ id: string; position: number }>} items
 * @param {string} startDateIso
 * @param {number} sprintDays
 */
function buildBootstrapRowsAcrossSprint(items, startDateIso, sprintDays) {
  const sorted = [...items].sort((a, b) => Number(a.position) - Number(b.position));
  const offsets = spreadDayOffsets(sorted.length, sprintDays);

  return sorted.map((it, index) => ({
    curriculum_item_id: String(it.id),
    scheduled_date: addCalendarDays(startDateIso, offsets[index]),
    position: Number(it.position) || index,
  }));
}

/**
 * Recompute dates for non-done assignments; preserves completed work in place.
 * @param {Array<{ id: string; position: number }>} items
 * @param {Array<{ id: string; curriculum_item_id: string; scheduled_date: string; status: string }>} assignments
 * @param {string} startDateIso
 * @param {number} sprintDays
 * @returns {Array<{ id: string; scheduled_date: string }>}
 */
function computeSprintRebalanceUpdates(items, assignments, startDateIso, sprintDays) {
  const sorted = [...items].sort((a, b) => Number(a.position) - Number(b.position));
  const offsets = spreadDayOffsets(sorted.length, sprintDays);
  const assignmentByItemId = new Map(
    assignments.map((row) => [String(row.curriculum_item_id), row]),
  );

  const updates = [];
  for (let index = 0; index < sorted.length; index += 1) {
    const item = sorted[index];
    const assignment = assignmentByItemId.get(String(item.id));
    if (!assignment || assignment.status === "done") {
      continue;
    }

    const nextDate = addCalendarDays(startDateIso, offsets[index]);
    if (assignment.scheduled_date !== nextDate) {
      updates.push({ id: assignment.id, scheduled_date: nextDate });
    }
  }

  return updates;
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

function clampSprintDays(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return DEFAULT_SPRINT_DAYS;
  }
  return Math.max(MIN_SPRINT_DAYS, Math.min(MAX_SPRINT_DAYS, Math.round(n)));
}

module.exports = {
  DEFAULT_SPRINT_DAYS,
  MIN_SPRINT_DAYS,
  MAX_SPRINT_DAYS,
  spreadDayOffsets,
  itemToScheduledDate,
  buildBootstrapRows,
  buildBootstrapRowsAcrossSprint,
  computeSprintRebalanceUpdates,
  computeReslideUpdates,
  velocityWindow,
  countCompletedInWindow,
  clampSprintDays,
};
