import { apiFetch } from "@/src/lib/api";
import type { CurriculumPath } from "@/src/data/mockWorkspace";
import { mapApiResource, resourceDescription, resourceTitle, type ApiResource } from "@/src/lib/resourceMapper";

export type ApiCurriculum = {
  id: string;
  title: string;
  folder_id: string | null;
  status?: "draft" | "active" | "archived";
  sprint_days?: number;
};

export type SyllabusPayload = {
  overview: string;
  items: {
    resource_id: string;
    rationale: string;
    consumption_minutes: number | null;
    practice_minutes: number | null;
    week_index: number;
    day_index: number;
    sequence: number;
  }[];
  gap_suggestions?: GapSuggestion[];
};

export type GapSuggestion = {
  title: string;
  rationale: string;
  suggested_search_query?: string;
};

export type CurriculumDetailResponse = {
  curriculum: ApiCurriculum;
  latest_syllabus_version: { payload: SyllabusPayload } | null;
  curriculum_items: {
    id: string;
    resource_id: string | null;
    week_index: number | null;
    day_index: number | null;
    position: number;
    consumption_minutes: number | null;
    practice_minutes: number | null;
    ai_rationale: { text?: string } | null;
  }[];
};

export type PublishSettings = {
  is_published: boolean;
  public_slug: string | null;
};

export type ApiNote = {
  id: string;
  resource_id: string;
  body_markdown: string;
  is_public_asset: boolean;
};

export type SectionDetail = {
  id: string;
  label: string;
  rationale: string;
  learningObjectives: string[];
  deepTasks: string[];
  resourceId: string | null;
  resourceTitle: string | null;
  resourceType: string | null;
  resourceDescription: string | null;
  resourceUrl: string | null;
};

/** @deprecated use SectionDetail */
export type WorkspaceSection = {
  id: string;
  label: string;
  active: boolean;
};

export type LoadedCurriculum = CurriculumPath & {
  folderId: string | null;
  noteId: string | null;
  resourceId: string | null;
  publicSlug: string | null;
  hasSyllabus: boolean;
  sprintDays: number;
  sections: SectionDetail[];
  syllabusOverview: string;
  gapSuggestions: GapSuggestion[];
};

function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export const PUBLIC_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugifyCurriculumTitle(title: string): string {
  return slugifyTitle(title);
}

export function isValidPublicSlug(slug: string): boolean {
  return slug.length >= 3 && slug.length <= 80 && PUBLIC_SLUG_REGEX.test(slug);
}

export function normalizePublicSlug(value: string): string {
  return slugifyTitle(value);
}

function splitOverview(overview: string): { intro: string; outro: string } {
  const paragraphs = overview
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length <= 1) {
    const text = paragraphs[0] ?? overview;
    const midpoint = Math.floor(text.length / 2);
    const breakAt = text.indexOf(". ", midpoint);
    if (breakAt > 0) {
      return {
        intro: text.slice(0, breakAt + 1).trim(),
        outro: text.slice(breakAt + 1).trim(),
      };
    }
    return { intro: text, outro: "" };
  }

  return {
    intro: paragraphs[0],
    outro: paragraphs.slice(1).join("\n\n"),
  };
}

function buildLearningObjectives(rationale: string): string[] {
  const bullets = rationale
    .split(/\n+/)
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter((line) => line.length > 12);

  if (bullets.length > 1) {
    return bullets.slice(0, 5);
  }

  const sentences = rationale
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);

  return sentences.length > 0 ? sentences.slice(0, 4) : [rationale];
}

function buildDeepTasks(
  rationale: string,
  consumptionMinutes: number | null,
  practiceMinutes: number | null,
): string[] {
  const tasks: string[] = [];

  if (consumptionMinutes != null && consumptionMinutes > 0) {
    tasks.push(`Focused study session (~${consumptionMinutes} min): absorb the core material thoroughly.`);
  }

  if (practiceMinutes != null && practiceMinutes > 0) {
    tasks.push(`Deep practice block (~${practiceMinutes} min): apply concepts through exercises or implementation.`);
  }

  tasks.push(`Synthesis task: ${rationale}`);

  return tasks.slice(0, 4);
}

function sectionLabel(item: CurriculumDetailResponse["curriculum_items"][number]): string {
  if (item.week_index != null && item.day_index != null) {
    return `Week ${item.week_index + 1} · Day ${item.day_index + 1}`;
  }
  return `Section ${item.position + 1}`;
}

function mapSectionDetail(
  item: CurriculumDetailResponse["curriculum_items"][number],
  syllabusItem: SyllabusPayload["items"][number] | undefined,
  resourceMap: Map<string, ApiResource>,
): SectionDetail {
  const rationale =
    item.ai_rationale?.text?.trim() ||
    syllabusItem?.rationale?.trim() ||
    "Explore this module and connect it to your broader learning goals.";

  const consumptionMinutes = item.consumption_minutes ?? syllabusItem?.consumption_minutes ?? null;
  const practiceMinutes = item.practice_minutes ?? syllabusItem?.practice_minutes ?? null;
  const resource = item.resource_id ? resourceMap.get(item.resource_id) : undefined;
  const mapped = resource ? mapApiResource(resource) : null;

  return {
    id: item.id,
    label: sectionLabel(item),
    rationale,
    learningObjectives: buildLearningObjectives(rationale),
    deepTasks: buildDeepTasks(rationale, consumptionMinutes, practiceMinutes),
    resourceId: item.resource_id,
    resourceTitle: mapped?.title ?? (resource ? resourceTitle(resource) : null),
    resourceType: mapped?.type ?? null,
    resourceDescription: mapped?.description ?? (resource ? resourceDescription(resource) : null),
    resourceUrl: resource?.url ?? null,
  };
}

export function mapCurriculumListRow(curriculum: ApiCurriculum): CurriculumPath {
  return {
    id: curriculum.id,
    label: curriculum.title,
    status: curriculum.status ?? "draft",
    note: {
      title: `My Notes: ${curriculum.title}`,
      visibility: "Private",
      tags: ["+ Tag"],
      intro: "Loading curriculum overview…",
      considerations: [],
      outro: "",
    },
  };
}

export function mapCurriculumDetail(
  detail: CurriculumDetailResponse,
  publish: PublishSettings,
  note: ApiNote | null,
  folderResources: ApiResource[] = [],
): LoadedCurriculum {
  const { curriculum, latest_syllabus_version: syllabus, curriculum_items: items } = detail;
  const payload = syllabus?.payload;
  const syllabusOverview = payload?.overview ?? "";
  const { intro: syllabusIntro, outro: syllabusOutro } = payload
    ? splitOverview(syllabusOverview)
    : { intro: "No syllabus overview yet.", outro: "" };

  const gapTags = payload?.gap_suggestions?.map((g) => g.title).slice(0, 3) ?? [];
  const tags = gapTags.length > 0 ? [...gapTags, "+ Tag"] : ["Learning", "+ Tag"];

  const noteBody = note?.body_markdown?.trim();
  const resourceMap = new Map(folderResources.map((r) => [r.id, r]));
  const syllabusByResource = new Map(
    (payload?.items ?? []).map((item) => [item.resource_id, item]),
  );

  const sections: SectionDetail[] =
    items.length > 0
      ? items.map((item) =>
          mapSectionDetail(item, item.resource_id ? syllabusByResource.get(item.resource_id) : undefined, resourceMap),
        )
      : [];

  const firstResourceItem = items.find((item) => item.resource_id);

  return {
    id: curriculum.id,
    label: curriculum.title,
    folderId: curriculum.folder_id,
    noteId: note?.id ?? null,
    resourceId: note?.resource_id ?? firstResourceItem?.resource_id ?? null,
    publicSlug: publish.public_slug,
    hasSyllabus: Boolean(syllabus?.payload && items.length > 0),
    sprintDays: curriculum.sprint_days ?? 30,
    syllabusOverview,
    sections,
    gapSuggestions: (payload?.gap_suggestions ?? []).map((suggestion) => ({
      title: suggestion.title,
      rationale: suggestion.rationale,
      suggested_search_query: suggestion.suggested_search_query ?? suggestion.title,
    })),
    note: {
      title: `My Notes: ${curriculum.title}`,
      visibility: publish.is_published ? "Public" : "Private",
      tags,
      intro: noteBody || syllabusIntro,
      considerations:
        payload?.gap_suggestions?.map((g) => g.rationale).filter(Boolean).slice(0, 3) ??
        (sections.length > 0 ? [] : ["Add resources, then generate your curriculum structure."]),
      outro: syllabusOutro || "Select a section from the sidebar to explore each learning module.",
    },
  };
}

export async function fetchCurriculumList(token: string): Promise<ApiCurriculum[]> {
  const data = await apiFetch<{ curricula: ApiCurriculum[] }>("/api/curricula", {}, token);
  return data.curricula;
}

export async function updateCurriculumStatus(
  curriculumId: string,
  token: string,
  status: "draft" | "active" | "archived",
): Promise<ApiCurriculum> {
  const res = await apiFetch<{ curriculum: ApiCurriculum }>(
    `/api/curricula/${curriculumId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
    token,
  );
  return res.curriculum;
}

export async function deleteCurriculum(curriculumId: string, token: string): Promise<void> {
  await apiFetch(`/api/curricula/${curriculumId}`, { method: "DELETE" }, token);
}

export async function createDraftCurriculum(
  token: string,
  title: string,
  monthStart?: string | null,
): Promise<ApiCurriculum> {
  const res = await apiFetch<{ curriculum: ApiCurriculum }>(
    "/api/curricula/draft",
    {
      method: "POST",
      body: JSON.stringify({ title, month_start: monthStart ?? null }),
    },
    token,
  );
  return res.curriculum;
}

export async function generateCurriculumStructure(
  curriculumId: string,
  token: string,
  options: { autoEnrich?: boolean; sprintDays?: number } = {},
): Promise<{ items_count: number }> {
  const res = await apiFetch<{ items_count: number }>(
    `/api/curricula/${curriculumId}/syllabus/generate`,
    {
      method: "POST",
      body: JSON.stringify({
        auto_enrich: options.autoEnrich ?? true,
        ...(options.sprintDays != null ? { sprint_days: options.sprintDays } : {}),
      }),
    },
    token,
  );
  return res;
}

export async function updateCurriculumSprintDaysOnly(
  curriculumId: string,
  token: string,
  sprintDays: number,
): Promise<{ curriculum: ApiCurriculum; schedule_rebalanced: number }> {
  return apiFetch<{ curriculum: ApiCurriculum; schedule_rebalanced: number }>(
    `/api/curricula/${curriculumId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ sprint_days: sprintDays }),
    },
    token,
  );
}

export async function fetchCurriculumDetail(
  curriculumId: string,
  token: string,
): Promise<LoadedCurriculum> {
  const detail = await apiFetch<CurriculumDetailResponse>(`/api/curricula/${curriculumId}`, {}, token);

  const folderQuery = detail.curriculum.folder_id
    ? `?folder_id=${encodeURIComponent(detail.curriculum.folder_id)}`
    : "";

  const [publishRes, resourcesRes] = await Promise.all([
    apiFetch<{ publish_settings: PublishSettings }>(`/api/curricula/${curriculumId}/publish`, {}, token),
    apiFetch<{ resources: ApiResource[] }>(`/api/resources${folderQuery}`, {}, token),
  ]);

  const folderResources = resourcesRes.resources;

  const firstResourceId =
    detail.curriculum_items.find((item) => item.resource_id)?.resource_id ??
    folderResources[0]?.id ??
    null;

  let note: ApiNote | null = null;
  if (firstResourceId) {
    const notesRes = await apiFetch<{ notes: ApiNote[] }>(
      `/api/notes?resource_id=${encodeURIComponent(firstResourceId)}`,
      {},
      token,
    );
    note = notesRes.notes[0] ?? null;
  }

  return mapCurriculumDetail(detail, publishRes.publish_settings, note, folderResources);
}

export async function fetchPublishSettings(
  curriculumId: string,
  token: string,
): Promise<PublishSettings> {
  const res = await apiFetch<{ publish_settings: PublishSettings }>(
    `/api/curricula/${curriculumId}/publish`,
    {},
    token,
  );
  return res.publish_settings;
}

export async function savePublishSettings(
  curriculumId: string,
  token: string,
  settings: { is_published: boolean; public_slug?: string | null },
): Promise<PublishSettings> {
  const res = await apiFetch<{ publish_settings: PublishSettings }>(
    `/api/curricula/${curriculumId}/publish`,
    { method: "PUT", body: JSON.stringify(settings) },
    token,
  );
  return res.publish_settings;
}

export async function updatePublishSettings(
  curriculumId: string,
  token: string,
  isPublished: boolean,
  title: string,
  existingSlug: string | null,
): Promise<PublishSettings> {
  const body: { is_published: boolean; public_slug?: string } = { is_published: isPublished };
  if (isPublished) {
    body.public_slug = existingSlug ?? slugifyTitle(title);
  }

  return savePublishSettings(curriculumId, token, body);
}

export async function fetchNotesForResource(token: string, resourceId: string): Promise<ApiNote[]> {
  const res = await apiFetch<{ notes: ApiNote[] }>(
    `/api/notes?resource_id=${encodeURIComponent(resourceId)}`,
    {},
    token,
  );
  return res.notes;
}

export async function saveNoteMarkdown(
  token: string,
  resourceId: string,
  bodyMarkdown: string,
  noteId: string | null,
  options?: {
    isPublicAsset?: boolean;
    curriculumItemId?: string | null;
  },
): Promise<ApiNote> {
  if (noteId) {
    const patchBody: {
      body_markdown: string;
      is_public_asset?: boolean;
      curriculum_item_id?: string | null;
    } = { body_markdown: bodyMarkdown };

    if (options?.isPublicAsset !== undefined) {
      patchBody.is_public_asset = options.isPublicAsset;
    }
    if (options?.curriculumItemId !== undefined) {
      patchBody.curriculum_item_id = options.curriculumItemId;
    }

    const res = await apiFetch<{ note: ApiNote }>(
      `/api/notes/${noteId}`,
      { method: "PATCH", body: JSON.stringify(patchBody) },
      token,
    );
    return res.note;
  }

  const res = await apiFetch<{ note: ApiNote }>(
    "/api/notes",
    {
      method: "POST",
      body: JSON.stringify({
        resource_id: resourceId,
        body_markdown: bodyMarkdown,
        is_public_asset: options?.isPublicAsset ?? false,
        curriculum_item_id: options?.curriculumItemId ?? null,
      }),
    },
    token,
  );
  return res.note;
}

export type VelocitySnapshot = {
  id: string;
  resources_completed: number;
  snapshot: {
    total_assignments?: number;
    done_total?: number;
  };
};

export type MasteryDisplay = {
  value: number;
  message: string;
};

function masteryMessage(value: number, totalAssignments: number): string {
  if (totalAssignments === 0) {
    return "Bootstrap your schedule to start tracking mastery.";
  }
  if (value >= 80) {
    return "You're nearing full understanding of this concept.";
  }
  if (value >= 50) {
    return "Steady progress — keep your daily rhythm.";
  }
  if (value > 0) {
    return "Room to grow — small consistent steps add up.";
  }
  return "Your next completed assignment will move the needle.";
}

export function mapVelocityToMastery(snapshots: VelocitySnapshot[]): MasteryDisplay {
  const latest = snapshots[0];
  if (!latest) {
    return { value: 0, message: masteryMessage(0, 0) };
  }

  const total = latest.snapshot?.total_assignments ?? 0;
  const done = latest.snapshot?.done_total ?? 0;
  const value = total > 0 ? Math.round((done / total) * 100) : 0;

  return { value, message: masteryMessage(value, total) };
}

export async function fetchMasteryForCurriculum(
  curriculumId: string,
  token: string,
): Promise<MasteryDisplay> {
  let data = await apiFetch<{ velocity_snapshots: VelocitySnapshot[] }>(
    `/api/curricula/${curriculumId}/velocity`,
    {},
    token,
  );

  if (data.velocity_snapshots.length === 0) {
    await apiFetch(
      `/api/curricula/${curriculumId}/velocity/snapshot`,
      { method: "POST", body: JSON.stringify({}) },
      token,
    );
    data = await apiFetch<{ velocity_snapshots: VelocitySnapshot[] }>(
      `/api/curricula/${curriculumId}/velocity`,
      {},
      token,
    );
  }

  return mapVelocityToMastery(data.velocity_snapshots);
}
