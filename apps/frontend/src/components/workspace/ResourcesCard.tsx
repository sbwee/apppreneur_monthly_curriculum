"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/src/lib/api";
import { getAccessToken } from "@/src/lib/auth";
import { createAndEnrichResource, mapApiResource } from "@/src/lib/resourceApi";
import type { ApiResource } from "@/src/lib/resourceMapper";
import type { WorkspaceResource } from "@/src/data/mockWorkspace";
import { ExternalLink, Leaf } from "lucide-react";
import { PanelHeading, workspaceLinkIconClass } from "@/src/components/ui/workspaceIcons";
import { ResourceDropzone } from "@/src/components/workspace/ResourceDropzone";
import { GenerateStructureButton } from "@/src/components/workspace/GenerateStructureButton";
import {
  DEFAULT_SPRINT_DAYS,
  SprintDurationControl,
} from "@/src/components/workspace/SprintDurationControl";

type ResourcesCardProps = {
  curriculumId?: string | null;
  folderId?: string | null;
  hasSyllabus?: boolean;
  isGeneratingStructure?: boolean;
  onGenerateStructure?: (sprintDays: number) => void;
  refreshKey?: number;
};

export function ResourcesCard({
  curriculumId,
  folderId,
  hasSyllabus,
  isGeneratingStructure,
  onGenerateStructure,
  refreshKey = 0,
}: ResourcesCardProps) {
  const [resources, setResources] = useState<WorkspaceResource[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sprintDays, setSprintDays] = useState(DEFAULT_SPRINT_DAYS);

  useEffect(() => {
    if (!curriculumId) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const token = getAccessToken();
      if (!token) {
        return;
      }

      setIsLoadingList(true);
      setError(null);

      try {
        const query = folderId ? `?folder_id=${encodeURIComponent(folderId)}` : "";
        const data = await apiFetch<{ resources: ApiResource[] }>(`/api/resources${query}`, {}, token);
        if (!cancelled) {
          setResources(data.resources.map(mapApiResource));
        }
      } catch {
        if (!cancelled) {
          setResources([]);
          setError("Could not load resources for this curriculum.");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingList(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [curriculumId, folderId, refreshKey]);

  async function handleSubmitUrl(url: string) {
    if (!curriculumId) {
      setError("Create or select a curriculum before adding resources.");
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setError("Sign in to add resources.");
      return;
    }

    setError(null);
    setIsAdding(true);

    try {
      const resource = await createAndEnrichResource(token, url, folderId ?? null);
      const mapped = mapApiResource(resource);
      setResources((prev) => [mapped, ...prev]);

      if (resource.ingest_status === "failed") {
        setError("Resource saved, but enrichment failed. The link is stored for retry.");
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not add resource.");
    } finally {
      setIsAdding(false);
    }
  }

  if (!curriculumId) {
    return null;
  }

  return (
    <section className="resources-card">
      <PanelHeading icon={Leaf}>Resources</PanelHeading>

      <ResourceDropzone
        disabled={!curriculumId}
        isSubmitting={isAdding}
        onSubmitUrl={handleSubmitUrl}
      />

      {error && (
        <p className="mt-3 text-sm text-[#9A504A]" role="alert">
          {error}
        </p>
      )}

      {isLoadingList && (
        <p className="mt-4 text-sm text-[var(--color-ink-muted)]">Loading resources…</p>
      )}

      {!isLoadingList && resources.length === 0 && (
        <p className="mt-4 text-sm text-[var(--color-ink-muted)]">
          No resources in this bed yet. Drop your first link above.
        </p>
      )}

      <div className="mt-4 space-y-3">
        {resources.map((resource) => (
          <article key={resource.id} className="resource-item">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
                {resource.type}
              </p>
            </div>
            <h3 className="mt-2 text-lg font-semibold text-[#2C3C33]">
              {resource.url ? (
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="resource-source-link resource-item-title inline-flex items-center gap-1.5"
                >
                  {resource.title}
                  <ExternalLink className={workspaceLinkIconClass} aria-hidden="true" />
                </a>
              ) : (
                resource.title
              )}
            </h3>
            <p className="mt-1 text-sm text-[var(--color-ink-muted)]">{resource.description}</p>
          </article>
        ))}
      </div>

      {!hasSyllabus && onGenerateStructure && (
        <div className="generate-structure-wrap">
          <SprintDurationControl
            value={sprintDays}
            onChange={setSprintDays}
            disabled={isGeneratingStructure}
          />
          <GenerateStructureButton
            resourceCount={resources.length}
            isGenerating={isGeneratingStructure}
            onGenerate={() => onGenerateStructure(sprintDays)}
          />
        </div>
      )}
    </section>
  );
}
