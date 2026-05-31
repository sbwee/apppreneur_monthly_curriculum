"use client";

import type { SectionDetail } from "@/src/lib/workspaceApi";

type SectionsCardProps = {
  sections?: SectionDetail[];
  selectedSectionId?: string | null;
  onSectionSelect?: (sectionId: string) => void;
};

export function SectionsCard({
  sections = [],
  selectedSectionId,
  onSectionSelect,
}: SectionsCardProps) {
  return (
    <section className="sections-card">
      <h2 className="utility-heading">Sections</h2>
      {sections.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--color-ink-muted)]">
          Sections appear once a syllabus is generated for this curriculum.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {sections.map((section) => (
            <li key={section.id}>
              <button
                type="button"
                className={`section-item ${selectedSectionId === section.id ? "section-item-active" : ""}`}
                onClick={() => onSectionSelect?.(section.id)}
              >
                {section.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
