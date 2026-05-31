"use client";

import { useState } from "react";
import { DailyGoalSettings } from "@/src/components/workspace/DailyGoalSettings";
import { PublishPanel } from "@/src/components/workspace/PublishPanel";
import { ScheduleCard } from "@/src/components/workspace/ScheduleCard";
import { SectionsCard } from "@/src/components/workspace/SectionsCard";
import { SprintDurationSettings } from "@/src/components/workspace/SprintDurationSettings";
import { WorkspaceProgressCard } from "@/src/components/workspace/WorkspaceProgressCard";
import type { PublishSettings, SectionDetail } from "@/src/lib/workspaceApi";

type UtilityPanelProps = {
  curriculumId?: string | null;
  curriculumTitle?: string;
  onPublishChange?: (settings: PublishSettings) => void;
  hasSyllabus?: boolean;
  sprintDays?: number;
  scheduleRefreshKey?: number;
  sections?: SectionDetail[];
  selectedSectionId?: string | null;
  onSectionSelect?: (sectionId: string) => void;
  onSprintDaysUpdated?: (sprintDays: number) => void;
};

export function UtilityPanel({
  curriculumId,
  curriculumTitle = "",
  onPublishChange,
  hasSyllabus,
  sprintDays = 30,
  scheduleRefreshKey = 0,
  sections,
  selectedSectionId,
  onSectionSelect,
  onSprintDaysUpdated,
}: UtilityPanelProps) {
  const [progressRefreshKey, setProgressRefreshKey] = useState(0);

  function handleScheduleUpdated() {
    setProgressRefreshKey((key) => key + 1);
  }

  return (
    <aside className="workspace-share-sidebar">
      <div className="workspace-utility-stack">
        <PublishPanel
          curriculumId={curriculumId}
          curriculumTitle={curriculumTitle}
          onPublishChange={onPublishChange}
        />

        {curriculumId && (
          <>
            <WorkspaceProgressCard
              curriculumId={curriculumId}
              curriculumTitle={curriculumTitle}
              hasSyllabus={hasSyllabus}
              refreshKey={scheduleRefreshKey + progressRefreshKey}
            />

            {hasSyllabus && (
              <SprintDurationSettings
                key={`${curriculumId}-${sprintDays}`}
                curriculumId={curriculumId}
                initialSprintDays={sprintDays}
                onSprintDaysUpdated={onSprintDaysUpdated}
                onScheduleRebalanced={handleScheduleUpdated}
              />
            )}

            <SectionsCard
              sections={sections ?? []}
              selectedSectionId={selectedSectionId}
              onSectionSelect={onSectionSelect}
            />

            <ScheduleCard
              curriculumId={curriculumId}
              hasSyllabus={hasSyllabus}
              scheduleRefreshKey={scheduleRefreshKey}
              onScheduleUpdated={handleScheduleUpdated}
            />

            <DailyGoalSettings />
          </>
        )}
      </div>
    </aside>
  );
}
