import type {
  ShowcaseCurriculumItem,
  ShowcasePayload,
  ShowcaseResource,
  ShowcaseSyllabusItem,
} from "@/src/lib/showcaseApi";

export type ShowcaseWeekEntry = {
  id: string;
  dayLabel: string;
  resource: ShowcaseResource | null;
  rationale: string;
  durationLabel: string | null;
  kindLabel: string;
};

export type ShowcaseWeek = {
  weekIndex: number;
  label: string;
  entries: ShowcaseWeekEntry[];
};

export type MappedShowcase = {
  title: string;
  overview: string;
  publishedLabel: string | null;
  monthStart: string | null;
  totalItems: number;
  weeks: ShowcaseWeek[];
  publicNotes: {
    id: string;
    resourceTitle: string;
    body: string;
  }[];
};

function titleFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "Learning resource";
  }
}

function resourceDisplayTitle(resource: ShowcaseResource | null): string {
  if (!resource) {
    return "Learning module";
  }
  return resource.title?.trim() || titleFromUrl(resource.url);
}

function kindLabel(kind: string): string {
  const normalized = kind.toLowerCase();
  if (normalized.includes("video") || normalized.includes("youtube")) {
    return "Video";
  }
  if (normalized.includes("pdf") || normalized.includes("book")) {
    return "Reading";
  }
  if (normalized.includes("spotify") || normalized.includes("podcast")) {
    return "Audio";
  }
  return "Article";
}

function durationLabel(
  item: ShowcaseCurriculumItem,
  syllabusItem: ShowcaseSyllabusItem | undefined,
): string | null {
  const consumption = item.consumption_minutes ?? syllabusItem?.consumption_minutes ?? 0;
  const practice = item.practice_minutes ?? syllabusItem?.practice_minutes ?? 0;
  const total = consumption + practice;

  if (total <= 0) {
    return null;
  }
  if (total <= 20) {
    return "Short";
  }
  if (total <= 45) {
    return "Medium";
  }
  return "Long";
}

function formatPublishedDate(iso: string | null): string | null {
  if (!iso) {
    return null;
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

export function mapShowcasePayload(payload: ShowcasePayload): MappedShowcase {
  const resourceMap = new Map(payload.resources.map((resource) => [resource.id, resource]));
  const syllabusByResource = new Map(
    (payload.syllabus?.items ?? []).map((item) => [item.resource_id, item]),
  );

  const sortedItems = [...payload.curriculum_items].sort((a, b) => a.position - b.position);
  const weekMap = new Map<number, ShowcaseWeekEntry[]>();

  for (const item of sortedItems) {
    const weekIndex = item.week_index ?? 0;
    const dayIndex = item.day_index ?? 0;
    const resource = item.resource_id ? (resourceMap.get(item.resource_id) ?? null) : null;
    const syllabusItem = item.resource_id ? syllabusByResource.get(item.resource_id) : undefined;

    const entry: ShowcaseWeekEntry = {
      id: item.id,
      dayLabel: `Day ${dayIndex + 1}`,
      resource,
      rationale:
        syllabusItem?.rationale?.trim() ||
        resource?.description?.trim() ||
        "A curated step in this learning arc.",
      durationLabel: durationLabel(item, syllabusItem),
      kindLabel: resource ? kindLabel(resource.kind) : "Module",
    };

    const bucket = weekMap.get(weekIndex);
    if (bucket) {
      bucket.push(entry);
    } else {
      weekMap.set(weekIndex, [entry]);
    }
  }

  const weeks = [...weekMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([weekIndex, entries]) => ({
      weekIndex,
      label: `Week ${weekIndex + 1}`,
      entries: [...entries].sort((a, b) => a.dayLabel.localeCompare(b.dayLabel)),
    }));

  const publicNotes = payload.public_notes.map((note) => {
    const resource = resourceMap.get(note.resource_id);
    return {
      id: note.id,
      resourceTitle: resourceDisplayTitle(resource ?? null),
      body: note.body_markdown.trim(),
    };
  });

  return {
    title: payload.curriculum.title,
    overview:
      payload.syllabus?.overview?.trim() ||
      "A structured learning journey curated in Learning Ledger.",
    publishedLabel: formatPublishedDate(payload.published_at),
    monthStart: payload.curriculum.month_start,
    totalItems: sortedItems.length,
    weeks,
    publicNotes,
  };
}

export function resourceDisplayTitleForShowcase(resource: ShowcaseResource | null): string {
  return resourceDisplayTitle(resource);
}
