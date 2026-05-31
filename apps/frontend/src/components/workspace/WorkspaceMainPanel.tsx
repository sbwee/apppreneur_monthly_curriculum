"use client";

import { useState } from "react";
import { GapSuggestionsCard } from "@/src/components/workspace/GapSuggestionsCard";
import { ResourcesCard } from "@/src/components/workspace/ResourcesCard";
import type { GapSuggestion } from "@/src/lib/workspaceApi";

type WorkspaceMainPanelProps = {
  curriculumId: string;
  folderId?: string | null;
  gapSuggestions?: GapSuggestion[];
  hasSyllabus?: boolean;
  isGeneratingStructure?: boolean;
  onGenerateStructure?: (sprintDays: number) => void;
};

export function WorkspaceMainPanel({
  curriculumId,
  folderId,
  gapSuggestions,
  hasSyllabus,
  isGeneratingStructure,
  onGenerateStructure,
}: WorkspaceMainPanelProps) {
  const [resourcesRefreshKey, setResourcesRefreshKey] = useState(0);

  return (
    <div className="workspace-main-stack">
      <ResourcesCard
        curriculumId={curriculumId}
        folderId={folderId}
        hasSyllabus={hasSyllabus}
        isGeneratingStructure={isGeneratingStructure}
        onGenerateStructure={onGenerateStructure}
        refreshKey={resourcesRefreshKey}
      />

      <GapSuggestionsCard
        folderId={folderId}
        suggestions={gapSuggestions}
        hasSyllabus={hasSyllabus}
        onResourceAdded={() => setResourcesRefreshKey((key) => key + 1)}
      />
    </div>
  );
}
