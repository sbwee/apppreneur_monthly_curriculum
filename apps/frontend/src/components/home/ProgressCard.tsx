import type { ProgressTrack } from "@/src/data/mockHome";

type ProgressCardProps = {
  completionPercent?: number;
  completionDone?: number;
  completionTotal?: number;
  hasSchedule?: boolean;
  activeCurriculumTitle?: string | null;
  tracks?: ProgressTrack[];
  isEmpty?: boolean;
};

const RING_TRACK = "#ece9e3";
const RING_FILL = "#446d5d";

function ringBackground(percent: number): string {
  const clamped = Math.max(0, Math.min(100, percent));
  if (clamped <= 0) {
    return RING_TRACK;
  }
  return `conic-gradient(${RING_FILL} 0 ${clamped}%, ${RING_TRACK} ${clamped}% 100%)`;
}

export function ProgressCard({
  completionPercent = 0,
  completionDone = 0,
  completionTotal = 0,
  hasSchedule = false,
  activeCurriculumTitle,
  tracks = [],
  isEmpty,
}: ProgressCardProps) {
  if (isEmpty) {
    return (
      <article className="progress-card">
        <h2 className="progress-card-title">Curriculum Progress</h2>
        <p className="mt-6 text-lg text-[var(--color-ink-muted)]">
          No curriculums yet. Start one in Workspace to track your mastery here.
        </p>
      </article>
    );
  }

  const percent = hasSchedule ? completionPercent : 0;
  const progressCaption = hasSchedule
    ? `${completionDone} of ${completionTotal} assignments complete`
    : "Generate structure in Workspace to start tracking progress.";

  return (
    <article className="progress-card">
      <h2 className="progress-card-title">Curriculum Progress</h2>
      {activeCurriculumTitle && (
        <p className="progress-card-subtitle">{activeCurriculumTitle}</p>
      )}

      <div className="mastery-ring" style={{ background: ringBackground(percent) }}>
        <div className="mastery-ring-inner">
          <p className="text-3xl font-semibold text-[var(--color-brand-forest)]">{percent}%</p>
          <p className="mt-1 text-lg text-[var(--color-ink-muted)]">Complete</p>
        </div>
      </div>

      <p className="progress-card-caption">{progressCaption}</p>

      {tracks.length > 0 ? (
        <ul className="progress-track-list">
          {tracks.map((track) => (
            <li key={track.topic} className="progress-track-row">
              <div className="progress-track-label">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: track.color }} />
                <span>{track.topic}</span>
              </div>
              <div className="progress-track-meter" aria-hidden="true">
                <span
                  className="progress-track-meter-fill"
                  style={{ width: `${track.value}%`, backgroundColor: track.color }}
                />
              </div>
              <span className="progress-track-value">{track.value}%</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-lg text-[var(--color-ink-muted)]">
          Your progress tracks will appear as you build out curriculums.
        </p>
      )}
    </article>
  );
}
