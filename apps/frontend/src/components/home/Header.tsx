type HeaderProps = {
  searchPlaceholder?: string;
};

export function Header({ searchPlaceholder = "Search your ledger..." }: HeaderProps) {
  return (
    <header className="home-header">
      <div className="search-shell">
        <span aria-hidden="true">⌕</span>
        <input type="search" placeholder={searchPlaceholder} aria-label="Search your ledger" />
      </div>

      <div className="flex items-center gap-3">
        <button type="button" className="icon-btn" aria-label="Notifications">
          ♡
        </button>
        <button type="button" className="icon-btn icon-btn-profile" aria-label="Profile settings">
          ☺
        </button>
      </div>
    </header>
  );
}
