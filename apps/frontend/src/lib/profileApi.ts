import { apiFetch } from "@/src/lib/api";

export type UserProfile = {
  id: string;
  display_name: string | null;
  daily_minutes_goal: number;
};

export const DAILY_GOAL_PRESETS = [15, 30, 45, 60] as const;

export type DailyGoalPreset = (typeof DAILY_GOAL_PRESETS)[number];

export function resolveDisplayName(profile: UserProfile | null | undefined): string {
  const name = profile?.display_name?.trim();
  return name || "Learner";
}

export async function fetchProfile(token: string): Promise<UserProfile> {
  const res = await apiFetch<{ profile: UserProfile }>("/api/profile", {}, token);
  return res.profile;
}

export async function updateDisplayName(token: string, displayName: string): Promise<UserProfile> {
  const res = await apiFetch<{ profile: UserProfile }>(
    "/api/profile",
    {
      method: "PATCH",
      body: JSON.stringify({ display_name: displayName.trim() }),
    },
    token,
  );
  return res.profile;
}

export async function updateDailyMinutesGoal(token: string, dailyMinutesGoal: number): Promise<UserProfile> {
  const res = await apiFetch<{ profile: UserProfile }>(
    "/api/profile",
    {
      method: "PATCH",
      body: JSON.stringify({ daily_minutes_goal: dailyMinutesGoal }),
    },
    token,
  );
  return res.profile;
}
