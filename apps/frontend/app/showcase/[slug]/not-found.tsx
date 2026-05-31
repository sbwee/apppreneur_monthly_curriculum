import Link from "next/link";

export default function ShowcaseNotFound() {
  return (
    <main className="showcase-shell showcase-not-found">
      <div className="showcase-not-found-card">
        <p className="showcase-eyebrow">Learning Ledger</p>
        <h1 className="showcase-title">This showcase isn&apos;t blooming yet</h1>
        <p className="showcase-overview">
          The link may be unpublished, mistyped, or still private. No worries — learning paths unfold
          in their own time.
        </p>
        <Link href="/" className="showcase-home-link">
          Return home
        </Link>
      </div>
    </main>
  );
}
