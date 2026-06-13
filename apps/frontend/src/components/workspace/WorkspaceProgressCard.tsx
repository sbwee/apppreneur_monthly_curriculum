"use client";

import { useEffect, useState } from "react";
import {
  growthStageIcon,
  workspaceIconSmClass,
} from "@/src/components/ui/workspaceIcons";
import {
  BotanicalGrowthIcon,
  getBotanicalGrowthStage,
} from "@/src/components/workspace/BotanicalGrowthIcon";
import { getAccessToken } from "@/src/lib/auth";
import { fetchCurriculumScheduleCompletion } from "@/src/lib/scheduleApi";

type WorkspaceProgressCardProps = {
  curriculumId: string;
  curriculumTitle: string;
  hasSyllabus?: boolean;
  refreshKey?: number;
};

export function WorkspaceProgressCard({
  curriculumId,
  curriculumTitle,
  hasSyllabus = false,
  refreshKey = 0,
}: WorkspaceProgressCardProps) {
  const [loadedCompletion, setLoadedCompletion] = useState<{
    curriculumId: string;
    percent: number;
    done: number;
    total: number;
  } | null>(null);

  useEffect(() => {
    if (!curriculumId || !hasSyllabus) {
      return;
    }

    const token = getAccessToken();
    if (!token) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const completion = await fetchCurriculumScheduleCompletion(curriculumId, token);
      if (!cancelled) {
        setLoadedCompletion({
          curriculumId,
          percent: completion.percent,
          done: completion.done,
          total: completion.total,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [curriculumId, hasSyllabus, refreshKey]);

  const completion =
    loadedCompletion?.curriculumId === curriculumId
      ? loadedCompletion
      : { percent: 0, done: 0, total: 0 };

  const hasSchedule = hasSyllabus && completion.total > 0;
  const percent = hasSchedule ? completion.percent : 0;
  const { stage, label: growthLabel } = getBotanicalGrowthStage(percent);
  const GrowthIcon = growthStageIcon(stage);

  const caption = hasSchedule
    ? `${completion.done} of ${completion.total} assignments complete`
    : hasSyllabus
      ? "Plant your schedule to start tracking progress."
      : "Generate your curriculum structure to begin.";

  return (
    <section className="workspace-progress-card" aria-label="Curriculum progress">
      <div
        className="workspace-progress-growth"
        role="img"
        aria-label={`${growthLabel}, ${percent}% complete`}
      >
        <div className="workspace-progress-botanical">
          <BotanicalGrowthIcon stage={stage} />
        </div>
        <div className="workspace-progress-metrics">
          <p className="workspace-progress-stage-label flex items-center justify-center gap-1.5">
            <GrowthIcon className={workspaceIconSmClass} aria-hidden="true" />
            {growthLabel}
          </p>
          <p className="workspace-progress-value">{percent}%</p>
          <p className="workspace-progress-label">Complete</p>
        </div>
      </div>

      <div className="workspace-progress-copy">
        <p className="workspace-progress-eyebrow">Your progress</p>
        <h2 className="workspace-progress-title">{curriculumTitle}</h2>
        <p className="workspace-progress-caption">{caption}</p>
      </div>
    </section>
  );
}
