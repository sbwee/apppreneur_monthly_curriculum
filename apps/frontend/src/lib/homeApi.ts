import { apiFetch } from "@/src/lib/api";
import type { BucketItem, ProgressTrack } from "@/src/data/mockHome";
import { mapResourceToBucketItem } from "@/src/lib/resourceMapper";
import { fetchProfile, resolveDisplayName } from "@/src/lib/profileApi";
import {
  fetchCurriculumScheduleCompletion,
  fetchScheduleRange,
  localTodayIso,
  type ScheduleAssignment,
} from "@/src/lib/scheduleApi";
import type { ApiCurriculum, PublishSettings } from "@/src/lib/workspaceApi";

const TRACK_COLORS = ["#446D5D", "#B65458", "#8B5A2B", "#315B4D"];

export type InboxEmptyReason =
  | "none"
  | "no_curriculum"
  | "no_active_curriculum"
  | "no_schedule"
  | "nothing_today";

export type HomeDashboard = {
  curriculumCount: number;
  resourceCount: number;
  displayName: string;
  inboxItems: BucketItem[];
  inboxEmptyReason: InboxEmptyReason;
  activeCurriculumTitle: string | null;
  /** Schedule completion % for the active curriculum (0 when no schedule). */
  mastery: number;
  completionDone: number;
  completionTotal: number;
  hasSchedule: boolean;
  showcaseSlug: string | null;
  tracks: ProgressTrack[];
};

export function pickActiveCurriculum(curricula: ApiCurriculum[]): ApiCurriculum | null {
  if (!curricula.length) {
    return null;
  }

  const nonArchived = curricula.filter((curriculum) => curriculum.status !== "archived");
  const pool = nonArchived.length > 0 ? nonArchived : curricula;

  return (
    pool.find((curriculum) => curriculum.status === "active") ??
    pool.find((curriculum) => curriculum.status === "draft") ??
    pool[0] ??
    null
  );
}

function trackCurriculaPool(curricula: ApiCurriculum[]): ApiCurriculum[] {
  const nonArchived = curricula.filter((curriculum) => curriculum.status !== "archived");
  const pool = nonArchived.length > 0 ? nonArchived : curricula;
  return pool.slice(0, 4);
}

function formatAssignmentDuration(assignment: ScheduleAssignment): string {
  const item = assignment.curriculum_item;
  if (item) {
    const total = (item.consumption_minutes ?? 0) + (item.practice_minutes ?? 0);
    if (total > 0) {
      return `${total} min planned`;
    }
  }

  const estimated = item?.resource?.metadata?.ai?.estimated_duration_minutes;
  if (typeof estimated === "number" && estimated > 0) {
    return `${estimated} min`;
  }

  return assignment.status === "done" ? "Completed" : "On your list";
}

function mapAssignmentStatus(
  status: ScheduleAssignment["status"],
): NonNullable<BucketItem["status"]> {
  if (status === "done") {
    return "done";
  }
  if (status === "deferred") {
    return "deferred";
  }
  if (status === "skipped") {
    return "skipped";
  }
  return "pending";
}

export function mapScheduleAssignmentToInboxItem(assignment: ScheduleAssignment): BucketItem {
  const resource = assignment.curriculum_item?.resource;

  if (resource) {
    const base = mapResourceToBucketItem(resource);
    return {
      ...base,
      id: assignment.id,
      meta: formatAssignmentDuration(assignment),
      status: mapAssignmentStatus(assignment.status),
    };
  }

  return {
    id: assignment.id,
    type: "Article",
    title: "Learning module",
    description: "Scheduled learning block from your curriculum.",
    meta: formatAssignmentDuration(assignment),
    accent: "#DCEBE3",
    status: mapAssignmentStatus(assignment.status),
  };
}

export function buildWelcomeMessage(dashboard: HomeDashboard): string {
  const { curriculumCount, inboxItems, activeCurriculumTitle } = dashboard;

  if (curriculumCount === 0) {
    return "Your garden is ready for its first seeds. Create a curriculum in Workspace to begin tending your learning path.";
  }

  if (inboxItems.length > 0) {
    const pending = inboxItems.filter((item) => item.status === "pending" || item.status == null).length;
    if (pending === 0) {
      return "You cleared today's inbox — nice work tending your garden.";
    }
    const pathLabel = activeCurriculumTitle ? ` for ${activeCurriculumTitle}` : "";
    return `You have ${pending} item${pending === 1 ? "" : "s"} on today's learning path${pathLabel}.`;
  }

  if (dashboard.inboxEmptyReason === "no_active_curriculum") {
    return "Activate a curriculum in Workspace to see what to learn today.";
  }

  if (dashboard.inboxEmptyReason === "no_schedule") {
    return "Generate your curriculum structure in Workspace to start your daily learning rhythm.";
  }

  if (dashboard.inboxEmptyReason === "nothing_today") {
    return "You're clear for today — enjoy the breathing room, or get ahead in Workspace.";
  }

  return "Welcome back. Your learning garden is ready when you are.";
}

async function fetchTodayInbox(
  token: string,
  curriculum: ApiCurriculum | null,
): Promise<{ items: BucketItem[]; emptyReason: InboxEmptyReason }> {
  if (!curriculum) {
    return { items: [], emptyReason: "no_curriculum" };
  }

  if (curriculum.status === "archived") {
    return { items: [], emptyReason: "no_active_curriculum" };
  }

  const today = localTodayIso();
  let assignments: ScheduleAssignment[];

  try {
    assignments = await fetchScheduleRange(curriculum.id, token, today, today);
  } catch {
    return { items: [], emptyReason: "no_schedule" };
  }

  if (!assignments.length) {
    return { items: [], emptyReason: "no_schedule" };
  }

  const todayItems = assignments
    .filter((assignment) => assignment.scheduled_date === today)
    .sort((a, b) => a.position - b.position)
    .map(mapScheduleAssignmentToInboxItem);

  if (!todayItems.length) {
    return { items: [], emptyReason: "nothing_today" };
  }

  return { items: todayItems, emptyReason: "none" };
}

async function fetchPublishedShowcaseSlug(
  token: string,
  curriculum: ApiCurriculum | null,
): Promise<string | null> {
  if (!curriculum) {
    return null;
  }

  try {
    const res = await apiFetch<{ publish_settings: PublishSettings }>(
      `/api/curricula/${curriculum.id}/publish`,
      {},
      token,
    );
    const settings = res.publish_settings;
    if (settings.is_published && settings.public_slug) {
      return settings.public_slug;
    }
  } catch {
    return null;
  }

  return null;
}

export async function fetchHomeDashboard(token: string): Promise<HomeDashboard> {
  const [curriculaRes, resourcesRes, profile] = await Promise.all([
    apiFetch<{ curricula: ApiCurriculum[] }>("/api/curricula", {}, token),
    apiFetch<{ resources: import("@/src/lib/resourceMapper").ApiResource[] }>("/api/resources", {}, token),
    fetchProfile(token).catch(() => null),
  ]);

  const curricula = curriculaRes.curricula;
  const allResources = resourcesRes.resources;
  const enrichedResources = allResources.filter((resource) => resource.ingest_status === "enriched");
  const activeCurriculum = pickActiveCurriculum(curricula);
  const trackPool = trackCurriculaPool(curricula);

  const [inbox, activeCompletion, trackCompletions, showcaseSlug] = await Promise.all([
    fetchTodayInbox(token, activeCurriculum),
    activeCurriculum
      ? fetchCurriculumScheduleCompletion(activeCurriculum.id, token)
      : Promise.resolve({ percent: 0, done: 0, total: 0 }),
    Promise.all(
      trackPool.map(async (curriculum) => ({
        id: curriculum.id,
        completion: await fetchCurriculumScheduleCompletion(curriculum.id, token),
      })),
    ),
    fetchPublishedShowcaseSlug(token, activeCurriculum),
  ]);

  const completionById = new Map(trackCompletions.map((row) => [row.id, row.completion.percent]));

  const tracks: ProgressTrack[] = trackPool.map((curriculum, index) => ({
    topic: curriculum.title,
    value: completionById.get(curriculum.id) ?? 0,
    color: TRACK_COLORS[index % TRACK_COLORS.length],
  }));

  return {
    curriculumCount: curricula.length,
    resourceCount: enrichedResources.length,
    displayName: resolveDisplayName(profile),
    inboxItems: inbox.items,
    inboxEmptyReason: inbox.emptyReason,
    activeCurriculumTitle: activeCurriculum?.title ?? null,
    mastery: activeCompletion.percent,
    completionDone: activeCompletion.done,
    completionTotal: activeCompletion.total,
    hasSchedule: activeCompletion.total > 0,
    showcaseSlug,
    tracks,
  };
}
