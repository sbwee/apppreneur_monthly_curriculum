"use client";

import { useEffect, useState } from "react";
import { getAccessToken } from "@/src/lib/auth";
import { Sparkles } from "lucide-react";
import { PanelHeading } from "@/src/components/ui/workspaceIcons";
import {
  DAILY_GOAL_PRESETS,
  fetchProfile,
  updateDailyMinutesGoal,
  type DailyGoalPreset,
} from "@/src/lib/profileApi";

export function DailyGoalSettings() {
  const [dailyMinutes, setDailyMinutes] = useState<number>(30);
  const [isLoading, setIsLoading] = useState(() => Boolean(getAccessToken()));
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const profile = await fetchProfile(token);
        if (!cancelled) {
          setDailyMinutes(profile.daily_minutes_goal);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Could not load your learning goal.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSelectGoal(minutes: DailyGoalPreset) {
    if (minutes === dailyMinutes || isSaving) {
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setSaveError("Sign in to save your daily goal.");
      return;
    }

    const previous = dailyMinutes;
    setSaveError(null);
    setIsSaving(true);
    setDailyMinutes(minutes);

    try {
      const profile = await updateDailyMinutesGoal(token, minutes);
      setDailyMinutes(profile.daily_minutes_goal);
    } catch (error) {
      setDailyMinutes(previous);
      setSaveError(error instanceof Error ? error.message : "Could not save your daily goal.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="daily-goal-card">
      <PanelHeading icon={Sparkles}>Daily rhythm</PanelHeading>
      <p className="daily-goal-lead">
        {isLoading
          ? "Loading your learning pace…"
          : `I have ${dailyMinutes} minutes a day for deep work.`}
      </p>

      {loadError && (
        <p className="text-sm text-[#9A504A]" role="alert">
          {loadError}
        </p>
      )}

      {!loadError && (
        <div className="daily-goal-chips" role="group" aria-label="Daily learning time">
          {DAILY_GOAL_PRESETS.map((minutes) => {
            const isActive = dailyMinutes === minutes;
            return (
              <button
                key={minutes}
                type="button"
                className={`daily-goal-chip ${isActive ? "daily-goal-chip-active" : ""}`}
                aria-pressed={isActive}
                disabled={isLoading || isSaving}
                onClick={() => handleSelectGoal(minutes)}
              >
                {minutes} min
              </button>
            );
          })}
        </div>
      )}

      {saveError && (
        <p className="mt-2 text-sm text-[#9A504A]" role="alert">
          {saveError}
        </p>
      )}
    </section>
  );
}
