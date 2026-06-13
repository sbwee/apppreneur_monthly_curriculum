"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { workspaceLinkIconClass } from "@/src/components/ui/workspaceIcons";
import { InlineNoteEditor } from "@/src/components/workspace/InlineNoteEditor";
import { getAccessToken } from "@/src/lib/auth";
import { updatePublishSettings, type SectionDetail } from "@/src/lib/workspaceApi";
import { WorkspaceNote } from "@/src/data/mockWorkspace";

type NoteEditorProps = {
  note: WorkspaceNote;
  curriculumId: string;
  curriculumTitle: string;
  noteId: string | null;
  resourceId: string | null;
  publicSlug: string | null;
  section?: SectionDetail | null;
  hasSyllabus?: boolean;
  isLoading?: boolean;
  allCaughtUp?: boolean;
  onNoteChange: (note: WorkspaceNote) => void;
  onNoteMetaChange: (meta: { noteId: string | null; publicSlug: string | null }) => void;
};

export function NoteEditor({
  note,
  curriculumId,
  curriculumTitle,
  noteId,
  resourceId,
  publicSlug,
  section,
  hasSyllabus,
  isLoading,
  allCaughtUp = false,
  onNoteChange,
  onNoteMetaChange,
}: NoteEditorProps) {
  const [isTogglingVisibility, setIsTogglingVisibility] = useState(false);
  const [visibilityError, setVisibilityError] = useState<string | null>(null);

  const displayTitle = section?.label ?? note.title;
  const displayLead = section?.rationale ?? note.intro;
  const objectives = section?.learningObjectives ?? note.considerations;
  const deepTasks = section?.deepTasks ?? [];
  const showSectionContent = Boolean(hasSyllabus && section);
  const activeResourceId = section?.resourceId ?? resourceId;

  async function handleToggleVisibility() {
    const token = getAccessToken();
    if (!token) {
      setVisibilityError("Sign in to change visibility.");
      return;
    }

    const nextPublished = note.visibility !== "Public";
    setVisibilityError(null);
    setIsTogglingVisibility(true);

    try {
      const settings = await updatePublishSettings(
        curriculumId,
        token,
        nextPublished,
        curriculumTitle,
        publicSlug,
      );
      onNoteChange({
        ...note,
        visibility: settings.is_published ? "Public" : "Private",
      });
      onNoteMetaChange({ noteId, publicSlug: settings.public_slug });
    } catch (error) {
      setVisibilityError(error instanceof Error ? error.message : "Could not update visibility.");
    } finally {
      setIsTogglingVisibility(false);
    }
  }

  function handleNoteSaved(meta: { noteId: string }) {
    onNoteMetaChange({ noteId: meta.noteId, publicSlug });
  }

  if (allCaughtUp) {
    return (
      <section className="workspace-note-section workspace-all-caught-up" aria-live="polite">
        <div className="workspace-caught-up-card">
          <p className="workspace-caught-up-eyebrow">Current article</p>
          <h1 className="workspace-caught-up-title">All caught up! 🎉</h1>
          <p className="workspace-caught-up-copy">
            You&apos;ve completed every item in your syllabus queue. Take a breather, revisit a
            section from the sidebar, or add new resources to keep growing.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="workspace-note-section">
      <header className="workspace-note-header">
        <div className="workspace-note-top">
          <h1 className="workspace-note-title">{displayTitle}</h1>
          <button
            type="button"
            className="visibility-toggle"
            aria-label="Toggle public visibility"
            onClick={handleToggleVisibility}
            disabled={isTogglingVisibility || isLoading}
          >
            <span>{note.visibility}</span>
            <span className="visibility-knob" />
          </button>
        </div>

        {visibilityError && (
          <p className="text-sm text-[#9A504A]" role="alert">
            {visibilityError}
          </p>
        )}

        <div className="workspace-tags">
          {note.tags.map((tag) => (
            <button type="button" className="workspace-tag" key={tag}>
              {tag}
            </button>
          ))}
        </div>
      </header>

      <article className="workspace-editor">
        <p className="workspace-lead">{displayLead}</p>

        <p className="workspace-text">
          {showSectionContent ? "Learning objectives:" : "Key considerations include:"}
        </p>
        <ul className="workspace-list">
          {objectives.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>

        {showSectionContent && deepTasks.length > 0 && (
          <>
            <p className="workspace-text">Deep tasks:</p>
            <ul className="workspace-list">
              {deepTasks.map((task) => (
                <li key={task}>{task}</li>
              ))}
            </ul>
          </>
        )}

        {showSectionContent && section?.resourceTitle && (
          <div className="section-resource-card">
            <p className="text-sm uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
              Mapped resource · {section.resourceType}
            </p>
            <h3 className="mt-2 text-xl font-semibold text-[#2C3C33]">
              {section.resourceUrl ? (
                <a
                  href={section.resourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="resource-source-link section-resource-title-link inline-flex items-center gap-1.5"
                >
                  {section.resourceTitle}
                  <ExternalLink className={workspaceLinkIconClass} aria-hidden="true" />
                </a>
              ) : (
                section.resourceTitle
              )}
            </h3>
            {section.resourceDescription && (
              <p className="mt-2 text-sm text-[var(--color-ink-muted)]">{section.resourceDescription}</p>
            )}
          </div>
        )}

        {!showSectionContent && <p className="workspace-text">{note.outro}</p>}
      </article>

      <InlineNoteEditor
        resourceId={activeResourceId}
        curriculumItemId={section?.id ?? null}
        disabled={isLoading}
        onNoteSaved={handleNoteSaved}
      />
    </section>
  );
}
