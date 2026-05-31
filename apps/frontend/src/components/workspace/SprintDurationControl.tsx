"use client";

export const DEFAULT_SPRINT_DAYS = 30;
export const MIN_SPRINT_DAYS = 7;
export const MAX_SPRINT_DAYS = 90;

export const SPRINT_DAY_PRESETS = [14, 30, 45, 60] as const;

export type SprintDayPreset = (typeof SPRINT_DAY_PRESETS)[number];

export function clampSprintDays(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_SPRINT_DAYS;
  }
  return Math.max(MIN_SPRINT_DAYS, Math.min(MAX_SPRINT_DAYS, Math.round(value)));
}

type SprintDurationControlProps = {
  value: number;
  onChange: (days: number) => void;
  disabled?: boolean;
  compact?: boolean;
};

export function SprintDurationControl({
  value,
  onChange,
  disabled = false,
  compact = false,
}: SprintDurationControlProps) {
  const clamped = clampSprintDays(value);

  function handleInputChange(raw: string) {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isNaN(parsed)) {
      return;
    }
    onChange(clampSprintDays(parsed));
  }

  return (
    <div className={`sprint-duration-control ${compact ? "sprint-duration-control-compact" : ""}`}>
      <div className="sprint-duration-header">
        <label htmlFor="sprint-duration-input" className="sprint-duration-label">
          Learning sprint days
        </label>
        {!compact && (
          <p className="sprint-duration-lead">
            Your assignments will spread gently across this many calendar days.
          </p>
        )}
      </div>

      <div className="sprint-duration-chips" role="group" aria-label="Sprint duration presets">
        {SPRINT_DAY_PRESETS.map((days) => {
          const isActive = clamped === days;
          return (
            <button
              key={days}
              type="button"
              className={`sprint-duration-chip ${isActive ? "sprint-duration-chip-active" : ""}`}
              aria-pressed={isActive}
              disabled={disabled}
              onClick={() => onChange(days)}
            >
              {days} days
            </button>
          );
        })}
      </div>

      <div className="sprint-duration-input-wrap">
        <input
          id="sprint-duration-input"
          type="number"
          min={MIN_SPRINT_DAYS}
          max={MAX_SPRINT_DAYS}
          step={1}
          value={clamped}
          disabled={disabled}
          className="sprint-duration-input"
          onChange={(event) => handleInputChange(event.target.value)}
        />
        <span className="sprint-duration-suffix">days total</span>
      </div>
    </div>
  );
}
