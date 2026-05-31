"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { sidebarItems } from "@/src/data/mockHome";
import { CurriculumPath } from "@/src/data/mockWorkspace";
import { logout, getAccessToken } from "@/src/lib/auth";
import { fetchProfile, resolveDisplayName } from "@/src/lib/profileApi";

export type CurriculumLifecycleAction = "activate" | "archive" | "delete";

type SidebarProps = {
  activeHref?: string;
  showcaseSlug?: string | null;
  displayName?: string;
  curriculums?: CurriculumPath[];
  selectedCurriculumId?: string;
  onCurriculumSelect?: (curriculumId: string) => void;
  onAddCurriculum?: () => void;
  onCurriculumLifecycle?: (curriculumId: string, action: CurriculumLifecycleAction) => void;
  showCurriculumMenu?: boolean;
};

function profileInitial(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "L";
}

function statusLabel(status: CurriculumPath["status"]): string | null {
  if (status === "active") {
    return "Active";
  }
  if (status === "archived") {
    return "Archived";
  }
  return null;
}

export function Sidebar({
  activeHref = "/home",
  showcaseSlug,
  displayName: displayNameProp,
  curriculums,
  selectedCurriculumId,
  onCurriculumSelect,
  onAddCurriculum,
  onCurriculumLifecycle,
  showCurriculumMenu = false,
}: SidebarProps) {
  const router = useRouter();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [fetchedName, setFetchedName] = useState<string | null>(null);
  const [profileSubtitle, setProfileSubtitle] = useState("Garden tender");
  const menuRef = useRef<HTMLDivElement>(null);

  const profileName = displayNameProp ?? fetchedName ?? "Learner";

  const shouldShowCurriculumMenu =
    showCurriculumMenu || (curriculums != null && curriculums.length > 0);

  const showcaseHref = showcaseSlug ? `/showcase/${showcaseSlug}` : "/showcase";

  useEffect(() => {
    if (displayNameProp) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const token = getAccessToken();
        if (!token || cancelled) {
          return;
        }

        const profile = await fetchProfile(token);
        if (!cancelled) {
          setFetchedName(resolveDisplayName(profile));
          setProfileSubtitle(`${profile.daily_minutes_goal} min/day`);
        }
      } catch {
        /* keep defaults */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [displayNameProp]);

  useEffect(() => {
    if (!openMenuId) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenMenuId(null);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [openMenuId]);

  function handleLifecycle(curriculumId: string, action: CurriculumLifecycleAction) {
    setOpenMenuId(null);
    onCurriculumLifecycle?.(curriculumId, action);
  }

  async function handleLogout() {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    try {
      await logout();
      router.replace("/");
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <aside className="home-sidebar">
      <div>
        <h2 className="brand-mark text-4xl leading-[1.05]">Learning Ledger</h2>
        <p className="mt-1 text-xs text-[var(--color-ink-muted)]">Nurturing curiosity</p>

        <nav className="mt-7" aria-label="Sidebar navigation">
          <ul className="space-y-2">
            {sidebarItems.map((item) => {
              const href = item.label === "Showcase" ? showcaseHref : item.href;

              return (
                <li key={item.label}>
                  <Link
                    href={href}
                    className={`sidebar-link ${
                      item.href === activeHref || (item.isActive && !activeHref)
                        ? "sidebar-link-active"
                        : ""
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {shouldShowCurriculumMenu && (
          <section className="curriculum-menu">
            <div className="curriculum-menu-header">
              <p className="curriculum-menu-title">My Curriculums</p>
              {onAddCurriculum && (
                <button type="button" className="curriculum-add-path" onClick={onAddCurriculum}>
                  + Add Path
                </button>
              )}
            </div>
            <ul className="mt-2 space-y-2">
              {(curriculums ?? []).map((path) => {
                const badge = statusLabel(path.status);
                const isArchived = path.status === "archived";
                const isActive = path.status === "active";

                return (
                  <li key={path.id} className="curriculum-row">
                    <button
                      type="button"
                      className={`curriculum-chip ${
                        selectedCurriculumId === path.id ? "curriculum-chip-active" : ""
                      } ${isArchived ? "curriculum-chip-archived" : ""}`}
                      onClick={() => onCurriculumSelect?.(path.id)}
                    >
                      <span className="curriculum-chip-label">{path.label}</span>
                      {badge && <span className="curriculum-chip-badge">{badge}</span>}
                    </button>

                    {onCurriculumLifecycle && (
                      <div className="curriculum-actions" ref={openMenuId === path.id ? menuRef : undefined}>
                        <button
                          type="button"
                          className="curriculum-menu-trigger"
                          aria-label={`Actions for ${path.label}`}
                          aria-expanded={openMenuId === path.id}
                          aria-haspopup="menu"
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenMenuId((prev) => (prev === path.id ? null : path.id));
                          }}
                        >
                          ⋯
                        </button>

                        {openMenuId === path.id && (
                          <div className="curriculum-dropdown" role="menu">
                            {!isActive && (
                              <button
                                type="button"
                                role="menuitem"
                                className="curriculum-dropdown-item"
                                onClick={() => handleLifecycle(path.id, "activate")}
                              >
                                Activate
                              </button>
                            )}
                            {!isArchived && (
                              <button
                                type="button"
                                role="menuitem"
                                className="curriculum-dropdown-item"
                                onClick={() => handleLifecycle(path.id, "archive")}
                              >
                                Archive
                              </button>
                            )}
                            <button
                              type="button"
                              role="menuitem"
                              className="curriculum-dropdown-item curriculum-dropdown-item-danger"
                              onClick={() => handleLifecycle(path.id, "delete")}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>

      <div className="profile-chip">
        <Link href="/settings" className="profile-chip-link">
          <div className="avatar-circle">{profileInitial(profileName)}</div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-[var(--color-ink-strong)]">{profileName}</p>
            <p className="text-sm text-[var(--color-ink-muted)]">{profileSubtitle}</p>
          </div>
        </Link>
        <button
          type="button"
          className="sidebar-logout-btn"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? "…" : "Log out"}
        </button>
      </div>
    </aside>
  );
}
