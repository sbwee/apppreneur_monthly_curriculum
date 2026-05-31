import Link from "next/link";

export default function ShowcaseIndexPage() {
  return (
    <main className="showcase-shell showcase-not-found">
      <div className="showcase-not-found-card">
        <p className="showcase-eyebrow">Learning Ledger · Proof of Work</p>
        <h1 className="showcase-title">Your public showcase</h1>
        <p className="showcase-overview">
          Publish a curriculum from Workspace to grow a shareable portfolio page — syllabus arc,
          completed modules, and public notes in one calm, read-only garden.
        </p>
        <div className="showcase-index-actions">
          <Link href="/workspace" className="showcase-home-link">
            Open Workspace
          </Link>
          <Link href="/home" className="showcase-index-secondary-link">
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
