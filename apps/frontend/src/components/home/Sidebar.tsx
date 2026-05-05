"use client";

import Link from "next/link";
import { sidebarItems, userProfile } from "@/src/data/mockHome";
import { CurriculumPath } from "@/src/data/mockWorkspace";

type SidebarProps = {
  activeHref?: string;
  curriculums?: CurriculumPath[];
  selectedCurriculumId?: string;
  onCurriculumSelect?: (curriculumId: string) => void;
};

export function Sidebar({
  activeHref = "/home",
  curriculums,
  selectedCurriculumId,
  onCurriculumSelect,
}: SidebarProps) {
  return (
    <aside className="home-sidebar">
      <div>
        <h2 className="brand-mark text-4xl leading-[1.05]">Learning Ledger</h2>
        <p className="mt-1 text-xs text-[var(--color-ink-muted)]">Nurturing curiosity</p>

        <nav className="mt-7" aria-label="Sidebar navigation">
          <ul className="space-y-2">
            {sidebarItems.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className={`sidebar-link ${
                    item.href === activeHref || (item.isActive && !activeHref)
                      ? "sidebar-link-active"
                      : ""
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {curriculums && curriculums.length > 0 && (
          <section className="curriculum-menu">
            <p className="curriculum-menu-title">My Curriculums</p>
            <ul className="mt-2 space-y-2">
              {curriculums.map((path) => (
                <li key={path.id}>
                  <button
                    type="button"
                    className={`curriculum-chip ${
                      selectedCurriculumId === path.id ? "curriculum-chip-active" : ""
                    }`}
                    onClick={() => onCurriculumSelect?.(path.id)}
                  >
                    {path.label}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <div className="profile-chip">
        <div className="avatar-circle">S</div>
        <div>
          <p className="font-semibold text-[var(--color-ink-strong)]">{userProfile.name}</p>
          <p className="text-sm text-[var(--color-ink-muted)]">{userProfile.level}</p>
        </div>
      </div>
    </aside>
  );
}
