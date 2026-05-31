"use client";

import { useState } from "react";
import { getAccessToken } from "@/src/lib/auth";
import { updateCurriculumSprintDaysOnly } from "@/src/lib/workspaceApi";
import {
  clampSprintDays,
  DEFAULT_SPRINT_DAYS,
  SprintDurationControl,
} from "@/src/components/workspace/SprintDurationControl";

type SprintDurationSettingsProps = {
  curriculumId: string;
  initialSprintDays?: number;
  onSprintDaysUpdated?: (sprintDays: number) => void;
  onScheduleRebalanced?: () => void;
};

export function SprintDurationSettings({
  curriculumId,
  initialSprintDays = DEFAULT_SPRINT_DAYS,
  onSprintDaysUpdated,
  onScheduleRebalanced,
}: SprintDurationSettingsProps) {
  const startingDays = clampSprintDays(initialSprintDays);
  const [sprintDays, setSprintDays] = useState(startingDays);
  const [savedDays, setSavedDays] = useState(startingDays);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isDirty = sprintDays !== savedDays;

  async function handleSave() {
    const token = getAccessToken();
    if (!token) {
      setSaveError("Sign in to update your sprint duration.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveMessage(null);

    try {
      const result = await updateCurriculumSprintDaysOnly(curriculumId, token, sprintDays);

      setSavedDays(sprintDays);
      onSprintDaysUpdated?.(sprintDays);
      if (result.schedule_rebalanced > 0) {
        onScheduleRebalanced?.();
        setSaveMessage("Sprint stretched — your remaining plan was gently reshaped.");
      } else {
        setSaveMessage("Sprint duration saved.");
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not save sprint duration.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="sprint-duration-settings">
      <SprintDurationControl value={sprintDays} onChange={setSprintDays} disabled={isSaving} compact />

      {isDirty && (
        <button type="button" className="sprint-duration-save-btn" disabled={isSaving} onClick={handleSave}>
          {isSaving ? "Reshaping schedule…" : "Update sprint & reshape plan"}
        </button>
      )}

      {saveMessage && (
        <p className="sprint-duration-feedback sprint-duration-feedback-success" role="status">
          {saveMessage}
        </p>
      )}

      {saveError && (
        <p className="sprint-duration-feedback sprint-duration-feedback-error" role="alert">
          {saveError}
        </p>
      )}
    </section>
  );
}
