"use client";

import { DragEvent, FormEvent, useState } from "react";

type ResourceDropzoneProps = {
  disabled?: boolean;
  isSubmitting?: boolean;
  onSubmitUrl: (url: string) => Promise<void>;
};

function extractUrlFromDataTransfer(event: DragEvent<HTMLDivElement>): string | null {
  const uriList = event.dataTransfer.getData("text/uri-list").trim();
  if (uriList.startsWith("http")) {
    return uriList.split("\n")[0]?.trim() ?? null;
  }

  const plain = event.dataTransfer.getData("text/plain").trim();
  if (plain.startsWith("http")) {
    return plain;
  }

  return null;
}

export function ResourceDropzone({ disabled, isSubmitting, onSubmitUrl }: ResourceDropzoneProps) {
  const [url, setUrl] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  async function submitUrl(rawUrl: string) {
    const trimmed = rawUrl.trim();
    if (!trimmed || disabled || isSubmitting) {
      return;
    }

    setHint(null);
    await onSubmitUrl(trimmed);
    setUrl("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitUrl(url);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  async function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragOver(false);

    if (disabled || isSubmitting) {
      return;
    }

    const droppedUrl = extractUrlFromDataTransfer(event);
    if (droppedUrl) {
      setUrl(droppedUrl);
      await submitUrl(droppedUrl);
      return;
    }

    const file = event.dataTransfer.files[0];
    if (file) {
      setHint(
        `"${file.name}" needs a public link. Paste the URL to your hosted PDF or document below.`,
      );
    }
  }

  return (
    <div className="resource-dropzone-wrap">
      <div
        className={`resource-dropzone ${isDragOver ? "resource-dropzone-active" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <p className="resource-dropzone-title">Add to this curriculum</p>
        <p className="resource-dropzone-copy">
          Drop a link or document reference here, or paste a URL below.
        </p>

        <form className="resource-dropzone-form" onSubmit={handleSubmit}>
          <input
            type="url"
            name="resource-url"
            placeholder="https://youtube.com/watch?v=…"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            className="field-input"
            disabled={disabled || isSubmitting}
            required
          />
          <button type="submit" className="btn-secondary resource-dropzone-submit" disabled={disabled || isSubmitting}>
            {isSubmitting ? "Adding…" : "Add link"}
          </button>
        </form>
      </div>

      {hint && (
        <p className="mt-3 text-sm text-[var(--color-ink-muted)]" role="status">
          {hint}
        </p>
      )}
    </div>
  );
}
