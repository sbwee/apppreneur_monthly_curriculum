"use client";

import { FormEvent, useEffect, useState } from "react";
import { getAccessToken } from "@/src/lib/auth";
import {
  fetchProfile,
  resolveDisplayName,
  updateDisplayName,
} from "@/src/lib/profileApi";

type ProfileSettingsFormProps = {
  onDisplayNameSaved?: (displayName: string) => void;
};

export function ProfileSettingsForm({ onDisplayNameSaved }: ProfileSettingsFormProps) {
  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const profile = await fetchProfile(token);
        if (!cancelled) {
          setDisplayName(profile.display_name?.trim() ?? "");
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Could not load your profile.");
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
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = displayName.trim();
    if (!trimmed) {
      setSaveError("Please enter a display name.");
      setSaveMessage(null);
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setSaveError("Sign in to update your profile.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveMessage(null);

    try {
      const profile = await updateDisplayName(token, trimmed);
      const savedName = resolveDisplayName(profile);
      setDisplayName(profile.display_name?.trim() ?? trimmed);
      setSaveMessage("Your display name was saved.");
      onDisplayNameSaved?.(savedName);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not save your display name.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="settings-panel">
      <p className="settings-eyebrow">Your garden profile</p>
      <h1 className="settings-title">Profile settings</h1>
      <p className="settings-lead">
        This name appears in your welcome greeting and sidebar across Home and Workspace.
      </p>

      {loadError ? (
        <p className="settings-feedback settings-feedback-error" role="alert">
          {loadError}
        </p>
      ) : (
        <form className="settings-form" onSubmit={handleSubmit} aria-label="Update display name">
          <div>
            <label htmlFor="display-name" className="field-label">
              Display name
            </label>
            <input
              id="display-name"
              name="display-name"
              type="text"
              className="field-input"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="How should we greet you?"
              maxLength={100}
              disabled={isLoading || isSaving}
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={isLoading || isSaving}>
            {isSaving ? "Saving…" : "Save display name"}
          </button>

          {saveMessage && (
            <p className="settings-feedback settings-feedback-success" role="status">
              {saveMessage}
            </p>
          )}
          {saveError && (
            <p className="settings-feedback settings-feedback-error" role="alert">
              {saveError}
            </p>
          )}
        </form>
      )}
    </section>
  );
}
