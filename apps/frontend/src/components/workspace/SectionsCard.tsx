import { workspaceSections } from "@/src/data/mockWorkspace";

export function SectionsCard() {
  return (
    <section>
      <h2 className="utility-heading">Sections</h2>
      <ul className="mt-3 space-y-2">
        {workspaceSections.map((section) => (
          <li key={section.id}>
            <button
              type="button"
              className={`section-item ${section.active ? "section-item-active" : ""}`}
            >
              {section.label}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
