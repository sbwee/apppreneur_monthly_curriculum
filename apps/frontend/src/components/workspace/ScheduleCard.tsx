"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Calendar } from "lucide-react";
import { PanelHeading } from "@/src/components/ui/workspaceIcons";
import { ApiRequestError } from "@/src/lib/api";
import { getAccessToken } from "@/src/lib/auth";
import { resourceTitle } from "@/src/lib/resourceMapper";
import {
  addCalendarDays,
  bootstrapSchedule,
  dismissReslidePrompt,
  fetchScheduleRange,
  fullScheduleFetchRange,
  isReslidePromptDismissed,
  localTodayIso,
  reslideMissedSchedule,
  summarizeMissedSchedule,
  updateScheduleAssignment,
  weekRangeFrom,
  type MissedScheduleSummary,
  type ScheduleAssignment,
  type ScheduleAssignmentStatus,
} from "@/src/lib/scheduleApi";

type ScheduleCardProps = {
  curriculumId?: string | null;
  hasSyllabus?: boolean;
  /** Bump after syllabus generation to refetch assignments. */
  scheduleRefreshKey?: number;
  onScheduleUpdated?: () => void;
  /** Full fetched assignment window (for current-article queue sync). */
  onAssignmentsChange?: (assignments: ScheduleAssignment[]) => void;
};

const STATUS_LABELS: Record<ScheduleAssignmentStatus, string> = {
  planned: "Planned",
  done: "Done",
  skipped: "Skipped",
  deferred: "Deferred",
};

function addDays(isoDate: string, days: number): string {
  return addCalendarDays(isoDate, days);
}

function formatDayHeading(isoDate: string, todayIso: string): string {
  if (isoDate === todayIso) {
    return "Today";
  }
  if (isoDate === addDays(todayIso, 1)) {
    return "Tomorrow";
  }

  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

function assignmentTitle(assignment: ScheduleAssignment): string {
  const resource = assignment.curriculum_item?.resource;
  if (resource) {
    return resourceTitle(resource);
  }
  return "Learning module";
}

function assignmentDuration(assignment: ScheduleAssignment): string | null {
  const item = assignment.curriculum_item;
  if (!item) {
    return null;
  }

  const consumption = item.consumption_minutes ?? 0;
  const practice = item.practice_minutes ?? 0;
  const total = consumption + practice;

  if (total > 0) {
    if (total <= 20) {
      return "Short";
    }
    if (total <= 45) {
      return "Medium";
    }
    return "Long";
  }

  const estimated = item.resource?.metadata?.ai?.estimated_duration_minutes;
  if (estimated != null && estimated > 0) {
    return estimated <= 20 ? "Short" : estimated <= 45 ? "Medium" : "Long";
  }

  return null;
}

function groupAssignmentsByDate(
  assignments: ScheduleAssignment[],
): { date: string; items: ScheduleAssignment[] }[] {
  const map = new Map<string, ScheduleAssignment[]>();

  for (const assignment of assignments) {
    const date = assignment.scheduled_date;
    const bucket = map.get(date);
    if (bucket) {
      bucket.push(assignment);
    } else {
      map.set(date, [assignment]);
    }
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, items]) => ({
      date,
      items: [...items].sort((a, b) => a.position - b.position),
    }));
}

function mergeAssignment(
  existing: ScheduleAssignment,
  updated: ScheduleAssignment,
): ScheduleAssignment {
  return {
    ...existing,
    ...updated,
    curriculum_item: updated.curriculum_item ?? existing.curriculum_item,
  };
}

type ScheduleAssignmentRowProps = {
  assignment: ScheduleAssignment;
  isToggling: boolean;
  onToggle: (assignment: ScheduleAssignment) => void;
  compact?: boolean;
};

function ScheduleAssignmentRow({
  assignment,
  isToggling,
  onToggle,
  compact = false,
}: ScheduleAssignmentRowProps) {
  const isDone = assignment.status === "done";
  const title = assignmentTitle(assignment);
  const duration = assignmentDuration(assignment);

  if (compact) {
    return (
      <li className={`schedule-today-item ${isDone ? "schedule-today-item-done" : ""}`}>
        <button
          type="button"
          role="checkbox"
          aria-checked={isDone}
          aria-label={`Mark "${title}" as ${isDone ? "incomplete" : "complete"}`}
          className={`schedule-check ${isDone ? "schedule-check-done" : ""}`}
          disabled={isToggling}
          onClick={() => onToggle(assignment)}
        >
          <span className="schedule-check-mark" aria-hidden="true" />
        </button>
        <span className="schedule-today-item-label">{title}</span>
      </li>
    );
  }

  return (
    <li className={`schedule-item ${isDone ? "schedule-item-done" : ""}`}>
      <button
        type="button"
        role="checkbox"
        aria-checked={isDone}
        aria-label={`Mark "${title}" as ${isDone ? "incomplete" : "complete"}`}
        className={`schedule-check ${isDone ? "schedule-check-done" : ""}`}
        disabled={isToggling}
        onClick={() => onToggle(assignment)}
      >
        <span className="schedule-check-mark" aria-hidden="true" />
      </button>
      <div className="schedule-item-main">
        <p className={`schedule-item-title ${isDone ? "schedule-item-title-done" : ""}`}>{title}</p>
        {duration && <p className="schedule-item-duration">{duration}</p>}
      </div>
      <span className={`schedule-status schedule-status-${assignment.status}`}>
        {STATUS_LABELS[assignment.status]}
      </span>
    </li>
  );
}

export function ScheduleCard({
  curriculumId,
  hasSyllabus,
  scheduleRefreshKey = 0,
  onScheduleUpdated,
  onAssignmentsChange,
}: ScheduleCardProps) {
  const [assignments, setAssignments] = useState<ScheduleAssignment[]>([]);
  const allAssignmentsRef = useRef<ScheduleAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [missedSummary, setMissedSummary] = useState<MissedScheduleSummary | null>(null);
  const [showReslidePrompt, setShowReslidePrompt] = useState(false);
  const [isResliding, setIsResliding] = useState(false);
  const [reslideError, setReslideError] = useState<string | null>(null);
  const [reslideSuccess, setReslideSuccess] = useState<string | null>(null);

  const todayIso = useMemo(() => localTodayIso(), []);

  const loadSchedule = useCallback(async () => {
    if (!curriculumId || !hasSyllabus) {
      return;
    }

    const token = getAccessToken();
    if (!token) {
      return;
    }

    const { from: weekStart, to: weekEnd } = weekRangeFrom();
    const { from: fetchFrom, to: fetchTo } = fullScheduleFetchRange();
    setIsLoading(true);
    setLoadError(null);
    setReslideSuccess(null);

    try {
      const rows = await fetchScheduleRange(curriculumId, token, fetchFrom, fetchTo);
      const weekRows = rows.filter(
        (row) => row.scheduled_date >= weekStart && row.scheduled_date <= weekEnd,
      );
      setAssignments(weekRows);
      allAssignmentsRef.current = rows;
      onAssignmentsChange?.(rows);

      const summary = summarizeMissedSchedule(rows, weekStart);
      if (summary && !isReslidePromptDismissed(curriculumId, weekStart)) {
        setMissedSummary(summary);
        setShowReslidePrompt(true);
      } else {
        setMissedSummary(null);
        setShowReslidePrompt(false);
      }
    } catch (error) {
      setAssignments([]);
      allAssignmentsRef.current = [];
      onAssignmentsChange?.([]);
      setLoadError(error instanceof Error ? error.message : "Could not load your schedule.");
    } finally {
      setIsLoading(false);
    }
  }, [curriculumId, hasSyllabus, onAssignmentsChange]);

  useEffect(() => {
    if (!curriculumId || !hasSyllabus) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const token = getAccessToken();
      if (!token) {
        return;
      }

      const { from: weekStart, to: weekEnd } = weekRangeFrom();
      const { from: fetchFrom, to: fetchTo } = fullScheduleFetchRange();

      setIsLoading(true);
      setLoadError(null);
      setReslideSuccess(null);

      try {
        const rows = await fetchScheduleRange(curriculumId, token, fetchFrom, fetchTo);
        if (cancelled) {
          return;
        }

        const weekRows = rows.filter(
          (row) => row.scheduled_date >= weekStart && row.scheduled_date <= weekEnd,
        );
        setAssignments(weekRows);
        allAssignmentsRef.current = rows;
        onAssignmentsChange?.(rows);

        const summary = summarizeMissedSchedule(rows, weekStart);
        if (summary && !isReslidePromptDismissed(curriculumId, weekStart)) {
          setMissedSummary(summary);
          setShowReslidePrompt(true);
        } else {
          setMissedSummary(null);
          setShowReslidePrompt(false);
        }
      } catch (error) {
        if (!cancelled) {
          setAssignments([]);
          allAssignmentsRef.current = [];
          onAssignmentsChange?.([]);
          setLoadError(error instanceof Error ? error.message : "Could not load your schedule.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [curriculumId, hasSyllabus, scheduleRefreshKey, onAssignmentsChange]);

  async function handlePlantSchedule() {
    if (!curriculumId) {
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setBootstrapError("Sign in to plant your schedule.");
      return;
    }

    setBootstrapError(null);
    setIsBootstrapping(true);

    try {
      const today = localTodayIso();
      try {
        await bootstrapSchedule(curriculumId, token, { startDate: today });
      } catch (error) {
        if (error instanceof ApiRequestError && error.code === "SCHEDULE_EXISTS") {
          await bootstrapSchedule(curriculumId, token, { startDate: today, force: true });
        } else {
          throw error;
        }
      }

      await loadSchedule();
      onScheduleUpdated?.();
    } catch (error) {
      setBootstrapError(error instanceof Error ? error.message : "Could not plant your schedule.");
    } finally {
      setIsBootstrapping(false);
    }
  }

  function handleDismissReslide() {
    if (curriculumId) {
      dismissReslidePrompt(curriculumId, todayIso);
    }
    setShowReslidePrompt(false);
    setReslideError(null);
  }

  async function handleReslideForward() {
    if (!curriculumId || !missedSummary) {
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setReslideError("Sign in to adjust your schedule.");
      return;
    }

    setReslideError(null);
    setIsResliding(true);

    try {
      await reslideMissedSchedule(curriculumId, token, missedSummary);
      dismissReslidePrompt(curriculumId, todayIso);
      setShowReslidePrompt(false);
      setMissedSummary(null);
      setReslideSuccess("Your plan shifted forward gently — no guilt, just growth.");
      await loadSchedule();
      onScheduleUpdated?.();
    } catch (error) {
      setReslideError(error instanceof Error ? error.message : "Could not shift your schedule.");
    } finally {
      setIsResliding(false);
    }
  }

  async function handleToggleAssignment(assignment: ScheduleAssignment) {
    const token = getAccessToken();
    if (!token) {
      return;
    }

    const nextStatus: ScheduleAssignmentStatus = assignment.status === "done" ? "planned" : "done";
    const previous = assignment;

    const applyStatusUpdate = (rows: ScheduleAssignment[]) =>
      rows.map((row) =>
        row.id === assignment.id
          ? {
              ...row,
              status: nextStatus,
              completed_at: nextStatus === "done" ? new Date().toISOString() : null,
            }
          : row,
      );

    setTogglingId(assignment.id);
    setAssignments((prev) => applyStatusUpdate(prev));

    const optimisticAll = applyStatusUpdate(allAssignmentsRef.current);
    allAssignmentsRef.current = optimisticAll;
    onAssignmentsChange?.(optimisticAll);

    try {
      const updated = await updateScheduleAssignment(assignment.id, token, { status: nextStatus });
      setAssignments((prev) =>
        prev.map((row) => (row.id === updated.id ? mergeAssignment(row, updated) : row)),
      );
      const syncedAll = allAssignmentsRef.current.map((row) =>
        row.id === updated.id ? mergeAssignment(row, updated) : row,
      );
      allAssignmentsRef.current = syncedAll;
      onAssignmentsChange?.(syncedAll);
      onScheduleUpdated?.();
    } catch (error) {
      setAssignments((prev) => prev.map((row) => (row.id === previous.id ? previous : row)));
      const revertedAll = allAssignmentsRef.current.map((row) =>
        row.id === previous.id ? previous : row,
      );
      allAssignmentsRef.current = revertedAll;
      onAssignmentsChange?.(revertedAll);
      setLoadError(error instanceof Error ? error.message : "Could not update this assignment.");
    } finally {
      setTogglingId(null);
    }
  }

  const grouped = useMemo(
    () => groupAssignmentsByDate(curriculumId && hasSyllabus ? assignments : []),
    [assignments, curriculumId, hasSyllabus],
  );
  const todayItems = grouped.find((group) => group.date === todayIso)?.items ?? [];

  return (
    <section className="schedule-card">
      <PanelHeading icon={Calendar}>This Week</PanelHeading>
      <p className="schedule-card-lead">Your gentle daily rhythm — one step at a time.</p>

      {!hasSyllabus && (
        <p className="mt-3 text-sm text-[var(--color-ink-muted)]">
          Your learning path will bloom here once your syllabus is generated.
        </p>
      )}

      {hasSyllabus && isLoading && (
        <p className="mt-3 text-sm text-[var(--color-ink-muted)]">Tending your calendar…</p>
      )}

      {hasSyllabus && loadError && (
        <p className="mt-3 text-sm text-[#9A504A]" role="alert">
          {loadError}
        </p>
      )}

      {hasSyllabus && reslideSuccess && (
        <p className="schedule-reslide-success" role="status">
          {reslideSuccess}
        </p>
      )}

      {hasSyllabus && !isLoading && showReslidePrompt && missedSummary && (
        <div className="schedule-reslide-panel" role="region" aria-label="Schedule adjustment">
          <p className="schedule-reslide-eyebrow">A gentle nudge</p>
          <p className="schedule-reslide-copy">
            Life happened — you have {missedSummary.overdueCount}{" "}
            {missedSummary.overdueCount === 1 ? "item" : "items"} still waiting from earlier days.
            Shift your plan forward? Your sprint end date will adjust with you.
          </p>
          <div className="schedule-reslide-actions">
            <button
              type="button"
              className="schedule-reslide-primary"
              disabled={isResliding}
              onClick={handleReslideForward}
            >
              {isResliding ? "Shifting…" : "Shift my plan forward"}
            </button>
            <button
              type="button"
              className="schedule-reslide-secondary"
              disabled={isResliding}
              onClick={handleDismissReslide}
            >
              Not today
            </button>
          </div>
          {reslideError && (
            <p className="text-sm text-[#9A504A]" role="alert">
              {reslideError}
            </p>
          )}
        </div>
      )}

      {hasSyllabus && !isLoading && !loadError && assignments.length === 0 && (
        <div className="schedule-empty-state">
          <p className="text-sm text-[var(--color-ink-muted)]">
            Your syllabus is ready — plant this week&apos;s schedule to begin.
          </p>
          <button
            type="button"
            className="schedule-plant-btn"
            disabled={isBootstrapping}
            onClick={handlePlantSchedule}
          >
            {isBootstrapping ? "Planting…" : "Plant This Week's Schedule"}
          </button>
          {bootstrapError && (
            <p className="text-sm text-[#9A504A]" role="alert">
              {bootstrapError}
            </p>
          )}
        </div>
      )}

      {hasSyllabus && !isLoading && !loadError && todayItems.length > 0 && (
        <div className="schedule-today-highlight">
          <p className="schedule-today-label">Today&apos;s focus</p>
          <ul className="schedule-today-list">
            {todayItems.map((assignment) => (
              <ScheduleAssignmentRow
                key={assignment.id}
                assignment={assignment}
                isToggling={togglingId === assignment.id}
                onToggle={handleToggleAssignment}
                compact
              />
            ))}
          </ul>
        </div>
      )}

      {hasSyllabus && !isLoading && !loadError && grouped.length > 0 && (
        <div className="schedule-day-groups">
          {grouped.map((group) => (
            <div key={group.date} className="schedule-day-group">
              <h3 className="schedule-day-heading">{formatDayHeading(group.date, todayIso)}</h3>
              <ul className="schedule-item-list">
                {group.items.map((assignment) => (
                  <ScheduleAssignmentRow
                    key={assignment.id}
                    assignment={assignment}
                    isToggling={togglingId === assignment.id}
                    onToggle={handleToggleAssignment}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
