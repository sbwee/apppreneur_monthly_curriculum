const { syllabusPayloadV1Schema } = require("../schemas/syllabusPayload");

/**
 * Build a read-only showcase payload for anonymous visitors.
 * Uses service-role client; only exposes published curricula and notes with is_public_asset.
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} admin
 * @param {string} slug normalized (lowercase)
 * @returns {Promise<Record<string, unknown> | null>}
 */
async function buildShowcasePayload(admin, slug) {
  const { data: ps, error: psErr } = await admin
    .from("publish_settings")
    .select("curriculum_id, is_published, public_slug, published_at")
    .eq("public_slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (psErr || !ps) {
    return null;
  }

  const { data: curriculum, error: cErr } = await admin
    .from("curricula")
    .select("id, title, month_start, status, created_at")
    .eq("id", ps.curriculum_id)
    .maybeSingle();

  if (cErr || !curriculum) {
    return null;
  }

  const { data: versions, error: vErr } = await admin
    .from("syllabus_versions")
    .select("schema_version, payload, created_at")
    .eq("curriculum_id", ps.curriculum_id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (vErr) {
    return null;
  }

  const latest = versions?.[0];
  let syllabusPublic = null;
  if (latest?.payload) {
    const parsed = syllabusPayloadV1Schema.safeParse(latest.payload);
    if (parsed.success) {
      const p = parsed.data;
      syllabusPublic = {
        overview: p.overview,
        gap_suggestions: p.gap_suggestions,
        items: p.items.map((it) => ({
          resource_id: it.resource_id,
          week_index: it.week_index,
          day_index: it.day_index,
          sequence: it.sequence,
          consumption_minutes: it.consumption_minutes,
          practice_minutes: it.practice_minutes,
          rationale: it.rationale,
        })),
      };
    }
  }

  const { data: items, error: iErr } = await admin
    .from("curriculum_items")
    .select("id, position, resource_id, week_index, day_index, consumption_minutes, practice_minutes")
    .eq("curriculum_id", ps.curriculum_id)
    .order("position", { ascending: true });

  if (iErr) {
    return null;
  }

  const resourceIds = [...new Set((items ?? []).map((it) => it.resource_id).filter(Boolean).map(String))];
  let resources = [];
  if (resourceIds.length) {
    const { data: resRows, error: rErr } = await admin
      .from("resources")
      .select("id, title, kind, url, description")
      .in("id", resourceIds);

    if (rErr) {
      return null;
    }
    resources = resRows ?? [];
  }

  let publicNotes = [];
  if (resourceIds.length) {
    const { data: notesRows, error: nErr } = await admin
      .from("notes")
      .select("id, resource_id, curriculum_item_id, body_markdown, created_at")
      .in("resource_id", resourceIds)
      .eq("is_public_asset", true)
      .order("created_at", { ascending: false });

    if (nErr) {
      return null;
    }
    publicNotes = notesRows ?? [];
  }

  return {
    slug: ps.public_slug,
    published_at: ps.published_at,
    curriculum: {
      id: curriculum.id,
      title: curriculum.title,
      month_start: curriculum.month_start,
    },
    syllabus: syllabusPublic,
    curriculum_items: items ?? [],
    resources,
    public_notes: publicNotes,
  };
}

module.exports = { buildShowcasePayload };
