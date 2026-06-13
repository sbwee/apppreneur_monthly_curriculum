"use client";

import { useMemo, useState } from "react";
import { getAccessToken } from "@/src/lib/auth";
import { ExternalLink, Network } from "lucide-react";
import { PanelHeading, workspaceLinkIconClass } from "@/src/components/ui/workspaceIcons";
import {
  createResourceFromGapSuggestion,
  mapApiResource,
  resolveGapSuggestionUrl,
} from "@/src/lib/resourceApi";
import type { GapSuggestion } from "@/src/lib/workspaceApi";

type GapSuggestionsCardProps = {
  folderId?: string | null;
  suggestions?: GapSuggestion[];
  hasSyllabus?: boolean;
  onResourceAdded?: () => void;
};

function suggestionKey(suggestion: GapSuggestion): string {
  return `${suggestion.title}::${suggestion.suggested_search_query ?? suggestion.title}`;
}

export function GapSuggestionsCard({
  folderId,
  suggestions = [],
  hasSyllabus,
  onResourceAdded,
}: GapSuggestionsCardProps) {
  const [addedKeys, setAddedKeys] = useState<Set<string>>(new Set());
  const [addingKey, setAddingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visibleSuggestions = useMemo(
    () => suggestions.filter((suggestion) => !addedKeys.has(suggestionKey(suggestion))),
    [suggestions, addedKeys],
  );

  if (!hasSyllabus || suggestions.length === 0) {
    return null;
  }

  async function handleAdd(suggestion: GapSuggestion) {
    const key = suggestionKey(suggestion);
    const token = getAccessToken();

    if (!token) {
      setError("Sign in to add resources.");
      return;
    }

    if (!folderId) {
      setError("This curriculum has no resource folder yet.");
      return;
    }

    setError(null);
    setAddingKey(key);

    try {
      const resource = await createResourceFromGapSuggestion(token, folderId, suggestion);
      mapApiResource(resource);
      setAddedKeys((prev) => new Set(prev).add(key));
      onResourceAdded?.();
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "Could not add this suggestion.");
    } finally {
      setAddingKey(null);
    }
  }

  if (visibleSuggestions.length === 0) {
    return null;
  }

  return (
    <section className="gap-suggestions-card">
      <PanelHeading icon={Network}>AI suggestions</PanelHeading>
      <p className="gap-suggestions-lead">
        The architect spotted a few complementary paths to deepen your curriculum.
      </p>

      <div className="gap-suggestions-list">
        {visibleSuggestions.map((suggestion) => {
          const key = suggestionKey(suggestion);
          const isAdding = addingKey === key;

          return (
            <article key={key} className="gap-suggestion-item">
              <p className="gap-suggestion-eyebrow">Recommended fill-in</p>
              <h3 className="gap-suggestion-title">
                <a
                  href={resolveGapSuggestionUrl(suggestion)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="resource-source-link gap-suggestion-title-link inline-flex items-center gap-1.5"
                >
                  {suggestion.title}
                  <ExternalLink className={workspaceLinkIconClass} aria-hidden="true" />
                </a>
              </h3>
              <p className="gap-suggestion-rationale">{suggestion.rationale}</p>
              <p className="gap-suggestion-query">
                Search lead: <span>{suggestion.suggested_search_query ?? suggestion.title}</span>
              </p>
              <button
                type="button"
                className="gap-suggestion-add-btn"
                disabled={isAdding}
                onClick={() => handleAdd(suggestion)}
              >
                {isAdding ? "Planting…" : "Add to curriculum"}
              </button>
            </article>
          );
        })}
      </div>

      {error && (
        <p className="mt-3 text-sm text-[#9A504A]" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
