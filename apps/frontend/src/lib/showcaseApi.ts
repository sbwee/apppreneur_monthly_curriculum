const BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";

export type ShowcaseResource = {
  id: string;
  title: string | null;
  kind: string;
  url: string;
  description: string | null;
};

export type ShowcaseSyllabusItem = {
  resource_id: string;
  week_index: number;
  day_index: number;
  sequence: number;
  consumption_minutes: number | null;
  practice_minutes: number | null;
  rationale: string;
};

export type ShowcaseCurriculumItem = {
  id: string;
  position: number;
  resource_id: string | null;
  week_index: number | null;
  day_index: number | null;
  consumption_minutes: number | null;
  practice_minutes: number | null;
};

export type ShowcasePublicNote = {
  id: string;
  resource_id: string;
  curriculum_item_id: string | null;
  body_markdown: string;
  created_at: string;
};

export type ShowcasePayload = {
  slug: string;
  published_at: string | null;
  curriculum: {
    id: string;
    title: string;
    month_start: string | null;
  };
  syllabus: {
    overview: string;
    gap_suggestions?: { title: string; rationale: string }[];
    items: ShowcaseSyllabusItem[];
  } | null;
  curriculum_items: ShowcaseCurriculumItem[];
  resources: ShowcaseResource[];
  public_notes: ShowcasePublicNote[];
};

export async function fetchPublicShowcase(slug: string): Promise<ShowcasePayload | null> {
  const normalized = slug.trim().toLowerCase();
  const res = await fetch(`${BASE}/api/public/${encodeURIComponent(normalized)}`, {
    next: { revalidate: 60 },
  });

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message =
      (err as { error?: { message?: string } })?.error?.message ?? "Could not load this showcase.";
    throw new Error(message);
  }

  return res.json() as Promise<ShowcasePayload>;
}
