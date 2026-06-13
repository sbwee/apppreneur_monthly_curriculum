"use client";

import { useState } from "react";
import { DailyGoalSettings } from "@/src/components/workspace/DailyGoalSettings";
import { PublishPanel } from "@/src/components/workspace/PublishPanel";
import { ScheduleCard } from "@/src/components/workspace/ScheduleCard";
import { SectionsCard } from "@/src/components/workspace/SectionsCard";
import { SprintDurationSettings } from "@/src/components/workspace/SprintDurationSettings";
import { WorkspaceProgressCard } from "@/src/components/workspace/WorkspaceProgressCard";
import type { PublishSettings, SectionDetail } from "@/src/lib/workspaceApi";
import type { ScheduleAssignment } from "@/src/lib/scheduleApi";

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
  onAssignmentsChange?: (assignments: ScheduleAssignment[]) => void;
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
  onAssignmentsChange,
  onSprintDaysUpdated,
}: UtilityPanelProps) {
  const [progressRefreshKey, setProgressRefreshKey] = useState(0);

  function handleScheduleUpdated() {
    setProgressRefreshKey((key) => key + 1);
  }

  return (
    <aside className="workspace-share-sidebar">
      <div className="flex flex-col space-y-6">
        {curriculumId ? (
          <>
            <WorkspaceProgressCard
              curriculumId={curriculumId}
              curriculumTitle={curriculumTitle}
              hasSyllabus={hasSyllabus}
              refreshKey={scheduleRefreshKey + progressRefreshKey}
            />

            <ScheduleCard
              curriculumId={curriculumId}
              hasSyllabus={hasSyllabus}
              scheduleRefreshKey={scheduleRefreshKey}
              onScheduleUpdated={handleScheduleUpdated}
              onAssignmentsChange={onAssignmentsChange}
            />

            <SectionsCard
              sections={sections ?? []}
              selectedSectionId={selectedSectionId}
              onSectionSelect={onSectionSelect}
            />

            <PublishPanel
              curriculumId={curriculumId}
              curriculumTitle={curriculumTitle}
              onPublishChange={onPublishChange}
            />

            <DailyGoalSettings />

            {hasSyllabus && (
              <SprintDurationSettings
                key={`${curriculumId}-${sprintDays}`}
                curriculumId={curriculumId}
                initialSprintDays={sprintDays}
                onSprintDaysUpdated={onSprintDaysUpdated}
                onScheduleRebalanced={handleScheduleUpdated}
              />
            )}
          </>
        ) : (
          <PublishPanel
            curriculumId={curriculumId}
            curriculumTitle={curriculumTitle}
            onPublishChange={onPublishChange}
          />
        )}
      </div>
    </aside>
  );
}
