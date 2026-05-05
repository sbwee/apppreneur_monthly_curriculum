import { landingStats, showcaseItem } from "@/src/data/mockLanding";

function MetricCard() {
  return (
    <article className="feature-card">
      <div className="text-sm font-semibold text-[var(--color-ink-strong)]">
        Dashboard
      </div>
      <div className="mt-8 flex h-28 w-28 items-center justify-center rounded-full border-[10px] border-[#D6E8E2] bg-white text-4xl font-semibold text-[var(--color-brand-forest)]">
        75%
      </div>
      <div className="mt-5 text-lg italic text-[var(--color-ink-muted)]">Biology 101</div>
    </article>
  );
}

function WorkspaceCard() {
  return (
    <article className="feature-card">
      <div className="text-sm font-semibold text-[var(--color-ink-strong)]">Workspace</div>
      <div className="mt-8 space-y-3">
        <div className="h-2 w-full rounded-full bg-[#E6E8E4]" />
        <div className="h-2 w-[84%] rounded-full bg-[#E6E8E4]" />
        <div className="h-2 w-[72%] rounded-full bg-[#E6E8E4]" />
      </div>
      <div className="mt-7 inline-flex rounded-full border border-[#E5D8BE] bg-[#FAF3E7] px-3 py-1 text-sm text-[#7E664D]">
        Drafting: Photosynthesis
      </div>
    </article>
  );
}

function PublicShowcaseCard() {
  return (
    <article className="showcase-card">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
        <span>Public Showcase</span>
        <span>Live view</span>
      </div>
      <div className="mt-4 flex items-center gap-4">
        <div className="h-14 w-14 rounded-full bg-[#A8D7C8]" />
        <div>
          <h3 className="font-serif text-xl text-[var(--color-brand-forest)]">
            {showcaseItem.title}
          </h3>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            Shared by {showcaseItem.author} {showcaseItem.timeAgo}
          </p>
        </div>
      </div>
    </article>
  );
}

export function FeatureShowcase() {
  return (
    <section className="relative min-h-[680px] w-full overflow-hidden rounded-none lg:rounded-l-[26px]">
      <div className="absolute inset-0 ocean-bg" />
      <div className="relative z-10 flex h-full flex-col justify-center px-8 py-16 md:px-14">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <MetricCard />
          <WorkspaceCard />
        </div>

        <PublicShowcaseCard />

        <div className="mt-10 grid grid-cols-1 gap-3 text-xs uppercase tracking-[0.14em] text-[var(--color-ink-strong)] sm:grid-cols-3">
          {landingStats.map((stat) => (
            <div key={stat.id} className="rounded-2xl bg-white/80 px-4 py-3 backdrop-blur-sm">
              <p>{stat.label}</p>
              <p className="mt-1 text-sm font-semibold">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
