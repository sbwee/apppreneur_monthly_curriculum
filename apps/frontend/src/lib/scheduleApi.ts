import { ApiRequestError, apiFetch } from "@/src/lib/api";
import type { ApiResource } from "@/src/lib/resourceMapper";

export type ScheduleAssignmentStatus = "planned" | "done" | "skipped" | "deferred";

export type ScheduleCurriculumItem = {
  id: string;
  curriculum_id: string;
  resource_id: string | null;
  position: number;
  week_index: number | null;
  day_index: number | null;
  consumption_minutes: number | null;
  practice_minutes: number | null;
  resource: ApiResource | null;
};

export type ScheduleAssignment = {
  id: string;
  curriculum_id: string;
  curriculum_item_id: string;
  scheduled_date: string;
  status: ScheduleAssignmentStatus;
  position: number;
  completed_at: string | null;
  curriculum_item: ScheduleCurriculumItem | null;
};

export type BootstrapScheduleOptions = {
  startDate?: string;
  sprintDays?: number;
  /** Rebuild assignments from current syllabus items (use after regeneration). */
  force?: boolean;
};

export type ReslideScheduleBody = {
  missed_date: string;
  shift_days?: number;
};

export type UpdateScheduleAssignmentBody = {
  status?: ScheduleAssignmentStatus;
  scheduled_date?: string;
};

function localIsoDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Local calendar date as YYYY-MM-DD. */
export function localTodayIso(date = new Date()): string {
  return localIsoDateOnly(date);
}

/** Add calendar days to an ISO date string (local calendar math). */
export function addCalendarDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return localIsoDateOnly(date);
}

const RESLIDE_DISMISS_PREFIX = "ledger_reslide_dismiss_";

export function isReslidePromptDismissed(curriculumId: string, todayIso: string): boolean {
  if (typeof sessionStorage === "undefined") {
    return false;
  }
  return sessionStorage.getItem(`${RESLIDE_DISMISS_PREFIX}${curriculumId}_${todayIso}`) === "1";
}

export function dismissReslidePrompt(curriculumId: string, todayIso: string): void {
  if (typeof sessionStorage === "undefined") {
    return;
  }
  sessionStorage.setItem(`${RESLIDE_DISMISS_PREFIX}${curriculumId}_${todayIso}`, "1");
}

export type MissedScheduleSummary = {
  earliestMissedDate: string;
  overdueCount: number;
  shiftDays: number;
};

function daysBetweenInclusive(fromIso: string, toIso: string): number {
  const [y1, m1, d1] = fromIso.split("-").map(Number);
  const [y2, m2, d2] = toIso.split("-").map(Number);
  const from = new Date(y1, m1 - 1, d1);
  const to = new Date(y2, m2 - 1, d2);
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / 86_400_000));
}

/** Detect overdue planned assignments and compute reslide parameters. */
export function summarizeMissedSchedule(
  assignments: ScheduleAssignment[],
  todayIso: string,
): MissedScheduleSummary | null {
  const overdue = assignments.filter(
    (row) => row.status === "planned" && row.scheduled_date < todayIso,
  );

  if (!overdue.length) {
    return null;
  }

  const earliestMissedDate = overdue.map((row) => row.scheduled_date).sort()[0];
  const shiftDays = Math.max(1, daysBetweenInclusive(earliestMissedDate, todayIso));

  return {
    earliestMissedDate,
    overdueCount: overdue.length,
    shiftDays,
  };
}

/** Fetch assignments for reslide detection (lookback) plus the current week. */
export function scheduleFetchRange(today = new Date(), lookbackDays = 14): { from: string; to: string } {
  const todayIso = localTodayIso(today);
  const { to } = weekRangeFrom(today);
  return { from: addCalendarDays(todayIso, -lookbackDays), to };
}

/** Inclusive date range: today through six days ahead (local calendar). */
export function weekRangeFrom(date = new Date()): { from: string; to: string } {
  const from = localIsoDateOnly(date);
  const end = new Date(date);
  end.setDate(end.getDate() + 6);
  return { from, to: localIsoDateOnly(end) };
}

function bootstrapPath(curriculumId: string, force?: boolean): string {
  const base = `/api/curricula/${curriculumId}/schedule/bootstrap`;
  return force ? `${base}?force=1` : base;
}

export async function bootstrapSchedule(
  curriculumId: string,
  token: string,
  options: BootstrapScheduleOptions = {},
): Promise<ScheduleAssignment[]> {
  const body: { start_date?: string; sprint_days?: number } = {};
  if (options.startDate) {
    body.start_date = options.startDate;
  }
  if (options.sprintDays != null) {
    body.sprint_days = options.sprintDays;
  }

  const res = await apiFetch<{ assignments: ScheduleAssignment[] }>(
    bootstrapPath(curriculumId, options.force),
    { method: "POST", body: JSON.stringify(body) },
    token,
  );
  return res.assignments;
}

export async function fetchScheduleRange(
  curriculumId: string,
  token: string,
  from: string,
  to: string,
): Promise<ScheduleAssignment[]> {
  const query = new URLSearchParams({ from, to });
  const res = await apiFetch<{ assignments: ScheduleAssignment[] }>(
    `/api/curricula/${curriculumId}/schedule?${query}`,
    {},
    token,
  );
  return res.assignments;
}

export async function reslideSchedule(
  curriculumId: string,
  token: string,
  body: ReslideScheduleBody,
): Promise<{ updated: number; shift_days: number }> {
  return apiFetch<{ updated: number; shift_days: number }>(
    `/api/curricula/${curriculumId}/schedule/reslide`,
    { method: "POST", body: JSON.stringify(body) },
    token,
  );
}

export async function updateScheduleAssignment(
  assignmentId: string,
  token: string,
  body: UpdateScheduleAssignmentBody,
): Promise<ScheduleAssignment> {
  const res = await apiFetch<{ assignment: ScheduleAssignment }>(
    `/api/schedule-assignments/${assignmentId}`,
    { method: "PATCH", body: JSON.stringify(body) },
    token,
  );
  return res.assignment;
}

export async function reslideMissedSchedule(
  curriculumId: string,
  token: string,
  summary: MissedScheduleSummary,
): Promise<{ updated: number; shift_days: number }> {
  return reslideSchedule(curriculumId, token, {
    missed_date: summary.earliestMissedDate,
    shift_days: summary.shiftDays,
  });
}

/** Wide window to capture full sprint schedules (including reslides). */
export function fullScheduleFetchRange(today = new Date()): { from: string; to: string } {
  const todayIso = localTodayIso(today);
  return { from: addCalendarDays(todayIso, -120), to: addCalendarDays(todayIso, 120) };
}

export type ScheduleCompletion = {
  percent: number;
  done: number;
  total: number;
};

function assignmentQueueOrder(a: ScheduleAssignment, b: ScheduleAssignment): number {
  const dateCmp = a.scheduled_date.localeCompare(b.scheduled_date);
  if (dateCmp !== 0) {
    return dateCmp;
  }
  return a.position - b.position;
}

function isAssignmentIncomplete(assignment: ScheduleAssignment): boolean {
  return assignment.status === "planned" || assignment.status === "deferred";
}

/** First incomplete assignment in syllabus queue order (date, then position). */
export function findFirstIncompleteAssignment(
  assignments: ScheduleAssignment[],
): ScheduleAssignment | null {
  const incomplete = assignments.filter(isAssignmentIncomplete).sort(assignmentQueueOrder);
  return incomplete[0] ?? null;
}

/** True when every assignment is done or skipped. */
export function isScheduleFullyComplete(assignments: ScheduleAssignment[]): boolean {
  return (
    assignments.length > 0 &&
    assignments.every((assignment) => assignment.status === "done" || assignment.status === "skipped")
  );
}

/** Completion % from schedule rows: done / total assignments. */
export function computeScheduleCompletion(assignments: ScheduleAssignment[]): ScheduleCompletion {
  const total = assignments.length;
  if (total === 0) {
    return { percent: 0, done: 0, total: 0 };
  }

  const done = assignments.filter((assignment) => assignment.status === "done").length;
  return {
    percent: Math.round((done / total) * 100),
    done,
    total,
  };
}

export async function fetchCurriculumScheduleCompletion(
  curriculumId: string,
  token: string,
): Promise<ScheduleCompletion> {
  try {
    const { from, to } = fullScheduleFetchRange();
    const assignments = await fetchScheduleRange(curriculumId, token, from, to);
    return computeScheduleCompletion(assignments);
  } catch {
    return { percent: 0, done: 0, total: 0 };
  }
}

/**
 * Ensures a curriculum has calendar rows after syllabus generation.
 * Rebuilds with force so regenerated syllabi stay in sync with new items.
 * Treats SCHEDULE_EXISTS as a no-op for idempotent callers.
 */
export async function bootstrapScheduleAfterSyllabus(
  curriculumId: string,
  token: string,
  options: { sprintDays?: number } = {},
): Promise<ScheduleAssignment[]> {
  try {
    return await bootstrapSchedule(curriculumId, token, {
      force: true,
      sprintDays: options.sprintDays,
    });
  } catch (error) {
    if (error instanceof ApiRequestError && error.code === "SCHEDULE_EXISTS") {
      return [];
    }
    throw error;
  }
}

export async function rebalanceScheduleForSprintDays(
  curriculumId: string,
  token: string,
  sprintDays: number,
): Promise<{ updated: number; sprint_days: number; start_date: string }> {
  return apiFetch<{ updated: number; sprint_days: number; start_date: string }>(
    `/api/curricula/${curriculumId}/schedule/rebalance`,
    {
      method: "POST",
      body: JSON.stringify({ sprint_days: sprintDays }),
    },
    token,
  );
}
