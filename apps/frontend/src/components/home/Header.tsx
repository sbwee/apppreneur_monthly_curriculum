import Link from "next/link";

export function Header() {
  return (
    <header className="home-header">
      <div className="flex items-center gap-3">
        <button type="button" className="icon-btn" aria-label="Notifications">
          ♡
        </button>
        <Link href="/settings" className="icon-btn icon-btn-profile" aria-label="Profile settings">
          ☺
        </Link>
      </div>
    </header>
  );
}
