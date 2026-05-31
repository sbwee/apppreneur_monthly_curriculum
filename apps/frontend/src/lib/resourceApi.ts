import { apiFetch } from "@/src/lib/api";
import { mapApiResource, type ApiResource } from "@/src/lib/resourceMapper";
import type { GapSuggestion } from "@/src/lib/workspaceApi";

type EnrichResponse = {
  resource: ApiResource;
  enrichment?: { ok: boolean; error?: string };
};

function resolveGapSuggestionUrl(suggestion: GapSuggestion): string {
  const candidate = (suggestion.suggested_search_query ?? suggestion.title).trim();
  if (/^https?:\/\//i.test(candidate)) {
    return candidate;
  }

  try {
    const withProtocol = candidate.includes(".") ? `https://${candidate}` : null;
    if (withProtocol) {
      const parsed = new URL(withProtocol);
      if (parsed.hostname.includes(".")) {
        return parsed.href;
      }
    }
  } catch {
    // fall through to search URL
  }

  const query = candidate || suggestion.title;
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

export async function createResourceFromGapSuggestion(
  token: string,
  folderId: string | null,
  suggestion: GapSuggestion,
): Promise<ApiResource> {
  const url = resolveGapSuggestionUrl(suggestion);

  const { resource } = await apiFetch<{ resource: ApiResource }>(
    "/api/resources",
    {
      method: "POST",
      body: JSON.stringify({ url, folder_id: folderId }),
    },
    token,
  );

  const { resource: patched } = await apiFetch<{ resource: ApiResource }>(
    `/api/resources/${resource.id}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        title: suggestion.title,
        description: suggestion.rationale,
        ingest_status: "enriched",
        metadata: {
          ai: {
            origin: "gap_suggestion",
            suggested_search_query: suggestion.suggested_search_query,
          },
        },
      }),
    },
    token,
  );

  return patched;
}

export async function createAndEnrichResource(
  token: string,
  url: string,
  folderId: string | null,
): Promise<ApiResource> {
  const { resource } = await apiFetch<{ resource: ApiResource }>(
    "/api/resources",
    {
      method: "POST",
      body: JSON.stringify({ url, folder_id: folderId }),
    },
    token,
  );

  try {
    const enriched = await apiFetch<EnrichResponse>(
      `/api/resources/${resource.id}/enrich`,
      { method: "POST" },
      token,
    );
    return enriched.resource;
  } catch {
    return resource;
  }
}

export { mapApiResource };
