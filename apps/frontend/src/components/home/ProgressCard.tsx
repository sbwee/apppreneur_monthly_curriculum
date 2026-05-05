import { progressData } from "@/src/data/mockHome";

export function ProgressCard() {
  return (
    <article className="progress-card">
      <h2 className="progress-card-title">Curriculum Progress</h2>

      <div className="mastery-ring">
        <div className="mastery-ring-inner">
          <p className="text-3xl font-semibold text-[var(--color-brand-forest)]">
            {progressData.mastery}%
          </p>
          <p className="mt-1 text-lg text-[var(--color-ink-muted)]">Mastery</p>
        </div>
      </div>

      <ul className="progress-track-list">
        {progressData.tracks.map((track) => (
          <li key={track.topic} className="progress-track-row">
            <div className="progress-track-label">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: track.color }} />
              <span>{track.topic}</span>
            </div>
            <span className="progress-track-value">{track.value}%</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
