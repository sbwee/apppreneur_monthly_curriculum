const { AppError } = require("../lib/errors");

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} sb
 * @param {{ curriculumId: string; payload: Record<string, unknown> }} args
 */
async function persistSyllabusVersionAndItems(sb, args) {
  const { curriculumId, payload } = args;

  const { data: versionRow, error: vErr } = await sb
    .from("syllabus_versions")
    .insert({
      curriculum_id: curriculumId,
      schema_version: String(payload.schema),
      payload,
    })
    .select("*")
    .single();

  if (vErr) {
    throw new AppError(500, "DB_ERROR", vErr.message);
  }

  const { error: delErr } = await sb.from("curriculum_items").delete().eq("curriculum_id", curriculumId);
  if (delErr) {
    throw new AppError(500, "DB_ERROR", delErr.message);
  }

  const items = Array.isArray(payload.items) ? [...payload.items] : [];
  items.sort((a, b) => Number(a.sequence) - Number(b.sequence));

  const rows = items.map((it) => ({
    curriculum_id: curriculumId,
    resource_id: it.resource_id,
    position: it.sequence,
    week_index: it.week_index,
    day_index: it.day_index,
    consumption_minutes: it.consumption_minutes,
    practice_minutes: it.practice_minutes,
    ai_rationale: { text: it.rationale, origin: "syllabus_v1" },
  }));

  if (rows.length) {
    const { error: insErr } = await sb.from("curriculum_items").insert(rows);
    if (insErr) {
      throw new AppError(500, "DB_ERROR", insErr.message);
    }
  }

  return { syllabus_version: versionRow };
}

module.exports = { persistSyllabusVersionAndItems };
