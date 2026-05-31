"use client";

import { useEffect, useState } from "react";
import { MarkdownPreview } from "@/src/components/workspace/MarkdownPreview";
import { getAccessToken } from "@/src/lib/auth";
import { fetchNotesForResource, saveNoteMarkdown } from "@/src/lib/workspaceApi";

type InlineNoteEditorProps = {
  resourceId: string | null;
  curriculumItemId?: string | null;
  disabled?: boolean;
  onNoteSaved?: (meta: { noteId: string; isPublicAsset: boolean }) => void;
};

type EditorMode = "write" | "preview";

type LoadedNoteEditorProps = Omit<InlineNoteEditorProps, "resourceId"> & {
  resourceId: string;
};

function InlineNoteEditorEmpty() {
  return (
    <section className="note-panel">
      <div className="note-panel-header">
        <div>
          <h2 className="note-panel-title">Your notes</h2>
          <p className="note-panel-lead">Capture reflections in Markdown — tethered to this resource.</p>
        </div>
      </div>
      <p className="note-panel-muted">Select a section with a mapped resource to begin note-taking.</p>
    </section>
  );
}

function InlineNoteEditorLoaded({
  resourceId,
  curriculumItemId,
  disabled = false,
  onNoteSaved,
}: LoadedNoteEditorProps) {
  const [draft, setDraft] = useState("");
  const [noteId, setNoteId] = useState<string | null>(null);
  const [isPublicAsset, setIsPublicAsset] = useState(false);
  const [mode, setMode] = useState<EditorMode>("write");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      return;
    }

    let cancelled = false;

    void (async () => {
      setIsLoading(true);
      setLoadError(null);
      setSaveMessage(null);

      try {
        const notes = await fetchNotesForResource(token, resourceId);
        if (cancelled) {
          return;
        }

        const existing = notes[0] ?? null;
        setNoteId(existing?.id ?? null);
        setDraft(existing?.body_markdown ?? "");
        setIsPublicAsset(existing?.is_public_asset ?? false);
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Could not load your notes.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [resourceId, curriculumItemId]);

  async function handleSave() {
    const token = getAccessToken();
    if (!token) {
      setLoadError("Sign in to save notes.");
      return;
    }

    setIsSaving(true);
    setLoadError(null);
    setSaveMessage(null);

    try {
      const saved = await saveNoteMarkdown(token, resourceId, draft, noteId, {
        isPublicAsset,
        curriculumItemId: curriculumItemId ?? null,
      });
      setNoteId(saved.id);
      setDraft(saved.body_markdown);
      setIsPublicAsset(saved.is_public_asset);
      setSaveMessage("Notes saved.");
      onNoteSaved?.({ noteId: saved.id, isPublicAsset: saved.is_public_asset });
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not save notes.");
    } finally {
      setIsSaving(false);
    }
  }

  const canEdit = !disabled;

  return (
    <section className="note-panel">
      <div className="note-panel-header">
        <div>
          <h2 className="note-panel-title">Your notes</h2>
          <p className="note-panel-lead">Capture reflections in Markdown — tethered to this resource.</p>
        </div>
        <div className="note-panel-tabs" role="tablist" aria-label="Note editor mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "write"}
            className={`note-panel-tab ${mode === "write" ? "note-panel-tab-active" : ""}`}
            disabled={!canEdit || isLoading}
            onClick={() => setMode("write")}
          >
            Write
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "preview"}
            className={`note-panel-tab ${mode === "preview" ? "note-panel-tab-active" : ""}`}
            disabled={!canEdit || isLoading}
            onClick={() => setMode("preview")}
          >
            Preview
          </button>
        </div>
      </div>

      {isLoading && <p className="note-panel-muted">Loading your notes…</p>}

      {canEdit && !isLoading && (
        <>
          {mode === "write" ? (
            <textarea
              className="note-markdown-input"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Write markdown here… headings, lists, and **bold** reflections welcome."
              rows={8}
              disabled={isSaving}
            />
          ) : (
            <MarkdownPreview content={draft} />
          )}

          <div className="note-panel-footer">
            <label className="note-public-toggle">
              <input
                type="checkbox"
                checked={isPublicAsset}
                disabled={isSaving}
                onChange={(event) => setIsPublicAsset(event.target.checked)}
              />
              <span>Show on public showcase</span>
            </label>
            <button type="button" className="note-save-btn" disabled={isSaving} onClick={handleSave}>
              {isSaving ? "Saving…" : "Save notes"}
            </button>
          </div>
        </>
      )}

      {saveMessage && (
        <p className="note-panel-success" role="status">
          {saveMessage}
        </p>
      )}

      {loadError && (
        <p className="text-sm text-[#9A504A]" role="alert">
          {loadError}
        </p>
      )}
    </section>
  );
}

export function InlineNoteEditor({
  resourceId,
  curriculumItemId,
  disabled = false,
  onNoteSaved,
}: InlineNoteEditorProps) {
  if (!resourceId) {
    return <InlineNoteEditorEmpty />;
  }

  return (
    <InlineNoteEditorLoaded
      key={`${resourceId}:${curriculumItemId ?? "none"}`}
      resourceId={resourceId}
      curriculumItemId={curriculumItemId}
      disabled={disabled}
      onNoteSaved={onNoteSaved}
    />
  );
}
