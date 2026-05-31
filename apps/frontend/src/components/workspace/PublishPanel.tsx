"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getAccessToken } from "@/src/lib/auth";
import {
  fetchPublishSettings,
  isValidPublicSlug,
  normalizePublicSlug,
  savePublishSettings,
  slugifyCurriculumTitle,
  type PublishSettings,
} from "@/src/lib/workspaceApi";

type PublishPanelProps = {
  curriculumId?: string | null;
  curriculumTitle?: string;
  onPublishChange?: (settings: PublishSettings) => void;
};

function defaultSlugFromTitle(title: string): string {
  const slug = slugifyCurriculumTitle(title);
  return slug.length >= 3 ? slug : "my-learning-ledger";
}

export function PublishPanel({ curriculumId, curriculumTitle = "", onPublishChange }: PublishPanelProps) {
  const [isPublished, setIsPublished] = useState(false);
  const [slugDraft, setSlugDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const idleSlug = useMemo(() => defaultSlugFromTitle(curriculumTitle), [curriculumTitle]);
  const displayIsPublished = curriculumId ? isPublished : false;
  const displaySlugDraft = curriculumId ? slugDraft : idleSlug;

  const applySettings = useCallback((settings: PublishSettings, title: string) => {
    setIsPublished(settings.is_published);
    setSlugDraft(settings.public_slug ?? defaultSlugFromTitle(title));
  }, []);

  useEffect(() => {
    if (!curriculumId) {
      return;
    }

    const token = getAccessToken();
    if (!token) {
      return;
    }

    let cancelled = false;

    void (async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const settings = await fetchPublishSettings(curriculumId, token);
        if (!cancelled) {
          applySettings(settings, curriculumTitle);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Could not load publish settings.");
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
  }, [curriculumId, curriculumTitle, applySettings]);

  const normalizedSlug = useMemo(() => normalizePublicSlug(displaySlugDraft), [displaySlugDraft]);
  const slugIsValid = isValidPublicSlug(normalizedSlug);

  const publicUrl = useMemo(() => {
    if (!slugIsValid) {
      return null;
    }
    if (typeof window !== "undefined") {
      return `${window.location.origin}/showcase/${normalizedSlug}`;
    }
    return `/showcase/${normalizedSlug}`;
  }, [normalizedSlug, slugIsValid]);

  async function persistPublish(nextPublished: boolean, slug: string) {
    if (!curriculumId) {
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setSaveError("Sign in to update sharing settings.");
      return;
    }

    if (nextPublished && !isValidPublicSlug(slug)) {
      setSaveError("Choose a URL slug with at least 3 lowercase letters, numbers, or hyphens.");
      return;
    }

    setSaveError(null);
    setIsSaving(true);

    try {
      const settings = await savePublishSettings(curriculumId, token, {
        is_published: nextPublished,
        public_slug: nextPublished ? slug : undefined,
      });
      applySettings(settings, curriculumTitle);
      onPublishChange?.(settings);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not update publish settings.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTogglePublish() {
    const nextPublished = !displayIsPublished;
    await persistPublish(nextPublished, normalizedSlug);
  }

  async function handleSlugBlur() {
    if (!curriculumId) {
      return;
    }

    const normalized = normalizePublicSlug(slugDraft);
    setSlugDraft(normalized);

    if (displayIsPublished && isValidPublicSlug(normalized)) {
      await persistPublish(true, normalized);
    }
  }

  async function handleCopyUrl() {
    if (!publicUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopyMessage("Link copied to clipboard.");
      window.setTimeout(() => setCopyMessage(null), 2400);
    } catch {
      setCopyMessage("Could not copy — select the URL and copy manually.");
    }
  }

  return (
    <section className="publish-panel">
      <h2 className="utility-heading">Share</h2>
      <p className="publish-panel-lead">Private by default. Publish when you&apos;re ready to share your progress.</p>

      {isLoading && <p className="publish-panel-muted">Loading sharing settings…</p>}

      {loadError && (
        <p className="text-sm text-[#9A504A]" role="alert">
          {loadError}
        </p>
      )}

      {!isLoading && !loadError && (
        <>
          <div className="publish-toggle-row">
            <div>
              <p className="publish-toggle-label">Showcase visibility</p>
              <p className="publish-toggle-hint">
                {displayIsPublished ? "Your ledger is live." : "Only you can see this curriculum."}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={displayIsPublished}
              aria-label={displayIsPublished ? "Unpublish showcase" : "Publish showcase"}
              className={`publish-switch ${displayIsPublished ? "publish-switch-on" : ""}`}
              disabled={isSaving || !curriculumId}
              onClick={handleTogglePublish}
            >
              <span className="publish-switch-track" aria-hidden="true">
                <span className="publish-switch-knob" />
              </span>
            </button>
          </div>

          <div className="publish-slug-field">
            <label className="publish-slug-label" htmlFor="publish-slug-input">
              Public URL slug
            </label>
            <div className="publish-slug-input-wrap">
              <span className="publish-slug-prefix">/showcase/</span>
              <input
                id="publish-slug-input"
                type="text"
                className="publish-slug-input"
                value={displaySlugDraft}
                disabled={isSaving || !curriculumId}
                onChange={(event) => setSlugDraft(event.target.value)}
                onBlur={() => void handleSlugBlur()}
                placeholder="my-learning-path"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            {!slugIsValid && displaySlugDraft.trim().length > 0 && (
              <p className="publish-slug-hint publish-slug-hint-error">
                Use lowercase letters, numbers, and hyphens (3–80 characters).
              </p>
            )}
            {slugIsValid && <p className="publish-slug-hint">Preview: {publicUrl}</p>}
          </div>

          {displayIsPublished && publicUrl && (
            <button type="button" className="publish-copy-btn" disabled={isSaving} onClick={handleCopyUrl}>
              Copy public link
            </button>
          )}

          {copyMessage && (
            <p className="publish-copy-feedback" role="status">
              {copyMessage}
            </p>
          )}

          {saveError && (
            <p className="text-sm text-[#9A504A]" role="alert">
              {saveError}
            </p>
          )}
        </>
      )}
    </section>
  );
}
