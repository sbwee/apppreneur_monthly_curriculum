"use client";

import { FormEvent, useState } from "react";
import { getAccessToken } from "@/src/lib/auth";
import { createDraftCurriculum } from "@/src/lib/workspaceApi";

type CreateCurriculumPanelProps = {
  onCreated: (curriculumId: string) => void;
};

export function CreateCurriculumPanel({ onCreated }: CreateCurriculumPanelProps) {
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setError("Sign in to plant your first curriculum.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const curriculum = await createDraftCurriculum(token, trimmed);
      setTitle("");
      onCreated(curriculum.id);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not create curriculum.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="garden-panel create-curriculum-panel">
      <p className="garden-panel-eyebrow">Start your garden bed</p>
      <h2 className="garden-panel-title">Create New Curriculum</h2>
      <p className="garden-panel-copy">
        Name your monthly learning path, then add resources once it is active. Every curriculum
        grows from a single seed.
      </p>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit} aria-label="Create curriculum">
        <div>
          <label htmlFor="curriculum-title" className="field-label">
            Curriculum title
          </label>
          <input
            id="curriculum-title"
            name="curriculum-title"
            type="text"
            placeholder="Distributed Systems — June"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="field-input"
            required
          />
        </div>

        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? "Planting…" : "Create New Curriculum"}
        </button>

        {error && (
          <p className="auth-feedback auth-feedback-invalid" role="alert">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}
