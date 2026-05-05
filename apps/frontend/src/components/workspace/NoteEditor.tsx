import { WorkspaceNote } from "@/src/data/mockWorkspace";

type NoteEditorProps = {
  note: WorkspaceNote;
};

export function NoteEditor({ note }: NoteEditorProps) {
  return (
    <section>
      <div className="workspace-note-top">
        <h1 className="workspace-note-title">{note.title}</h1>
        <button type="button" className="visibility-toggle" aria-label="Toggle public visibility">
          <span>{note.visibility}</span>
          <span className="visibility-knob" />
        </button>
      </div>

      <div className="workspace-tags">
        {note.tags.map((tag) => (
          <button type="button" className="workspace-tag" key={tag}>
            {tag}
          </button>
        ))}
      </div>

      <article className="workspace-editor">
        <p className="workspace-lead">{note.intro}</p>
        <p className="workspace-text">Key considerations include:</p>
        <ul className="workspace-list">
          {note.considerations.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>

        <div className="workspace-image-placeholder" role="img" aria-label="Technical image placeholder">
          <svg
            viewBox="0 0 760 360"
            className="workspace-diagram-svg"
            aria-label="Technical systems diagram"
          >
            <rect x="20" y="20" width="720" height="320" rx="18" fill="#f5f1e8" stroke="#d7ccbb" />
            <rect x="70" y="70" width="180" height="78" rx="12" fill="#e9efe8" stroke="#adc0b4" />
            <rect x="290" y="70" width="180" height="78" rx="12" fill="#edf1f2" stroke="#c2ced2" />
            <rect x="510" y="70" width="180" height="78" rx="12" fill="#f4ece6" stroke="#d9c8b9" />
            <rect x="190" y="220" width="180" height="78" rx="12" fill="#f0f5ef" stroke="#b8cdbf" />
            <rect x="390" y="220" width="180" height="78" rx="12" fill="#f8efe8" stroke="#d8c2ae" />
            <path d="M250 109H290" stroke="#4a695c" strokeWidth="4" />
            <path d="M470 109H510" stroke="#4a695c" strokeWidth="4" />
            <path d="M380 148V220" stroke="#8b5a2b" strokeWidth="4" />
            <path d="M290 258H370" stroke="#8b5a2b" strokeWidth="4" />
            <path d="M570 258H650" stroke="#8b5a2b" strokeWidth="4" />
            <text x="96" y="113" fill="#2d4a3e" fontSize="22" fontFamily="Georgia, serif">
              Node A
            </text>
            <text x="315" y="113" fill="#2d4a3e" fontSize="22" fontFamily="Georgia, serif">
              Node B
            </text>
            <text x="535" y="113" fill="#2d4a3e" fontSize="22" fontFamily="Georgia, serif">
              Node C
            </text>
            <text x="220" y="264" fill="#2d4a3e" fontSize="20" fontFamily="Georgia, serif">
              Merge Layer
            </text>
            <text x="430" y="264" fill="#2d4a3e" fontSize="20" fontFamily="Georgia, serif">
              Event Log
            </text>
          </svg>
        </div>

        <p className="workspace-text">{note.outro}</p>
      </article>

      <button type="button" className="workspace-fab" aria-label="Edit note">
        ✎
      </button>
    </section>
  );
}
