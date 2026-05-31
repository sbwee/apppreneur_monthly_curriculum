import { AppFooter } from "@/src/components/landing/AppFooter";
import type { MappedShowcase, ShowcaseWeekEntry } from "@/src/lib/showcaseMapper";
import { resourceDisplayTitleForShowcase } from "@/src/lib/showcaseMapper";

type ShowcasePageProps = {
  data: MappedShowcase;
  slug: string;
};

function ShowcaseResourceCard({ entry }: { entry: ShowcaseWeekEntry }) {
  const title = resourceDisplayTitleForShowcase(entry.resource);

  return (
    <article className="showcase-resource-card">
      <div className="showcase-resource-meta">
        <span className="showcase-resource-day">{entry.dayLabel}</span>
        <span className="showcase-resource-kind">{entry.kindLabel}</span>
        {entry.durationLabel && <span className="showcase-resource-duration">{entry.durationLabel}</span>}
      </div>
      {entry.resource?.url ? (
        <a
          href={entry.resource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="showcase-resource-title showcase-resource-link"
        >
          {title}
        </a>
      ) : (
        <h4 className="showcase-resource-title">{title}</h4>
      )}
      <p className="showcase-resource-rationale">{entry.rationale}</p>
    </article>
  );
}

export function ShowcasePage({ data, slug }: ShowcasePageProps) {
  return (
    <main className="showcase-shell">
      <header className="showcase-hero">
        <p className="showcase-eyebrow">Learning Ledger · Proof of Work</p>
        <h1 className="showcase-title">{data.title}</h1>
        <p className="showcase-overview">{data.overview}</p>
        <div className="showcase-hero-meta">
          {data.publishedLabel && <span>Published {data.publishedLabel}</span>}
          {data.monthStart && <span>Sprint anchor · {data.monthStart}</span>}
          <span>{data.totalItems} curated modules</span>
        </div>
      </header>

      {data.weeks.length > 0 && (
        <section className="showcase-arc" aria-label="Curriculum arc">
          <h2 className="showcase-section-title">Curriculum arc</h2>
          <div className="showcase-arc-track">
            {data.weeks.map((week) => (
              <div key={week.weekIndex} className="showcase-arc-week">
                <p className="showcase-arc-week-label">{week.label}</p>
                <p className="showcase-arc-week-count">
                  {week.entries.length} {week.entries.length === 1 ? "module" : "modules"}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="showcase-weeks" aria-label="Weekly schedule">
        <h2 className="showcase-section-title">Weekly schedule</h2>
        {data.weeks.length === 0 ? (
          <p className="showcase-empty">This showcase is published, but the curriculum structure is still growing.</p>
        ) : (
          <div className="showcase-week-grid">
            {data.weeks.map((week) => (
              <article key={week.weekIndex} className="showcase-week-card">
                <h3 className="showcase-week-heading">{week.label}</h3>
                <div className="showcase-week-entries">
                  {week.entries.map((entry) => (
                    <ShowcaseResourceCard key={entry.id} entry={entry} />
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {data.publicNotes.length > 0 && (
        <section className="showcase-notes" aria-label="Public learning notes">
          <h2 className="showcase-section-title">Public learning notes</h2>
          <div className="showcase-notes-grid">
            {data.publicNotes.map((note) => (
              <article key={note.id} className="showcase-note-card">
                <p className="showcase-note-resource">{note.resourceTitle}</p>
                <div className="showcase-note-body">{note.body}</div>
              </article>
            ))}
          </div>
        </section>
      )}

      <footer className="showcase-footer">
        <p className="showcase-footer-copy">
          Shared from <span className="brand-mark">Learning Ledger</span> · /showcase/{slug}
        </p>
        <AppFooter />
      </footer>
    </main>
  );
}
