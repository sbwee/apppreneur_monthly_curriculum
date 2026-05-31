"use client";

import { useEffect, useState } from "react";
import { getAccessToken } from "@/src/lib/auth";
import { fetchMasteryForCurriculum, type MasteryDisplay } from "@/src/lib/workspaceApi";

const EMPTY_MASTERY: MasteryDisplay = {
  value: 0,
  message: "Mastery tracking begins once your schedule is bootstrapped.",
};

type MasteryCardProps = {
  curriculumId?: string | null;
  refreshKey?: number;
};

export function MasteryCard({ curriculumId, refreshKey = 0 }: MasteryCardProps) {
  const [loadedMastery, setLoadedMastery] = useState<{
    curriculumId: string;
    data: MasteryDisplay;
  } | null>(null);

  const mastery =
    curriculumId && loadedMastery?.curriculumId === curriculumId
      ? loadedMastery.data
      : EMPTY_MASTERY;

  useEffect(() => {
    if (!curriculumId) {
      return;
    }

    const token = getAccessToken();
    if (!token) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const data = await fetchMasteryForCurriculum(curriculumId, token);
        if (!cancelled) {
          setLoadedMastery({ curriculumId, data });
        }
      } catch {
        if (!cancelled) {
          setLoadedMastery({ curriculumId, data: EMPTY_MASTERY });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [curriculumId, refreshKey]);

  return (
    <section className="mastery-card">
      <div className="mastery-ring-small">
        <div className="mastery-ring-small-inner">
          <p className="text-4xl font-semibold text-[#8B5A2B]">{mastery.value}%</p>
          <p className="text-xs uppercase tracking-[0.13em] text-[#8B5A2B]">Mastery</p>
        </div>
      </div>
      <p className="mt-5 text-center text-base text-[#3D4038]">{mastery.message}</p>
    </section>
  );
}
