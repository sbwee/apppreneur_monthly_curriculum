const { fetchUrlExcerpt } = require("./resourceFetch");
const { enrichResourceMetadata } = require("./resourceEnrichment");
const { isYouTubeUrl, fetchYouTubeOEmbed } = require("./youtubeMetadata");

/**
 * Runs URL fetch + LLM enrichment and persists to `resources` row.
 * @param {import("@supabase/supabase-js").SupabaseClient} sb
 * @param {{
 *   openaiApiKey: string;
 *   openaiModel: string;
 *   openaiTimeoutMs?: number;
 *   openaiMaxRetries?: number;
 *   llmMaxCompletionTokensEnrich?: number;
 * }} env
 * @param {Record<string, unknown>} resourceRow
 * @returns {Promise<{ ok: true; resource: Record<string, unknown> } | { ok: false; resource: Record<string, unknown>; error: string }>}
 */
async function enrichAndPersistResource(sb, env, resourceRow) {
  const apiKey = env.openaiApiKey?.trim();
  const model = env.openaiModel || "gpt-4o-mini";
  const timeoutMs = Number(env.openaiTimeoutMs ?? 120_000);
  const maxRetries = Number(env.openaiMaxRetries ?? 1);
  const maxCompletionTokens = Number(env.llmMaxCompletionTokensEnrich ?? 1024);
  if (!apiKey) {
    return { ok: false, resource: resourceRow, error: "OPENAI_API_KEY is not set." };
  }

  const existing = resourceRow;
  const url = String(existing.url);
  const youtubeMeta = isYouTubeUrl(url) ? await fetchYouTubeOEmbed(url) : null;
  const fetchResult = await fetchUrlExcerpt(url);

  let enrichment;
  try {
    enrichment = await enrichResourceMetadata({
      apiKey,
      model,
      url: String(existing.url),
      kind: String(existing.kind || "other"),
      excerpt: fetchResult.excerpt,
      fetchMeta: {
        contentType: fetchResult.contentType,
        fetchError: fetchResult.fetchError,
      },
      timeoutMs,
      maxRetries,
      maxCompletionTokens,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const metadata = {
      ...(existing.metadata && typeof existing.metadata === "object" ? existing.metadata : {}),
      ai: {
        last_error: message,
        last_attempt_at: new Date().toISOString(),
      },
    };
    const { data, error } = await sb
      .from("resources")
      .update({ ingest_status: "failed", metadata })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) {
      return { ok: false, resource: existing, error: error.message };
    }
    return { ok: false, resource: data ?? existing, error: message };
  }

  if (!enrichment.ok) {
    if (youtubeMeta?.title) {
      const metadata = {
        ...(existing.metadata && typeof existing.metadata === "object" ? existing.metadata : {}),
        ai: {
          title: youtubeMeta.title,
          summary: youtubeMeta.author ? `By ${youtubeMeta.author}` : "YouTube video",
          content_kind: "video",
          source: "youtube_oembed",
          enriched_at: new Date().toISOString(),
        },
      };
      const { data, error } = await sb
        .from("resources")
        .update({
          title: youtubeMeta.title,
          description: youtubeMeta.author ? `By ${youtubeMeta.author}` : "YouTube video",
          kind: "youtube",
          metadata,
          ingest_status: "enriched",
        })
        .eq("id", existing.id)
        .select("*")
        .single();

      if (error) {
        return { ok: false, resource: existing, error: error.message };
      }
      return { ok: true, resource: data ?? existing };
    }

    const metadata = {
      ...(existing.metadata && typeof existing.metadata === "object" ? existing.metadata : {}),
      ai: {
        last_error: enrichment.error,
        last_attempt_at: new Date().toISOString(),
      },
    };
    const { data, error } = await sb
      .from("resources")
      .update({ ingest_status: "failed", metadata })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) {
      return { ok: false, resource: existing, error: error.message };
    }
    return { ok: false, resource: data ?? existing, error: enrichment.error };
  }

  const ai = enrichment.data;
  const resolvedTitle = youtubeMeta?.title || ai.title;
  const resolvedKind = isYouTubeUrl(url) ? "youtube" : String(existing.kind || "other");
  const metadata = {
    ...(existing.metadata && typeof existing.metadata === "object" ? existing.metadata : {}),
    ai: {
      ...ai,
      title: resolvedTitle,
      content_kind: isYouTubeUrl(url) ? "video" : ai.content_kind,
      youtube: youtubeMeta,
      enriched_at: new Date().toISOString(),
      fetch: {
        content_type: fetchResult.contentType,
        fetch_error: fetchResult.fetchError ?? null,
      },
    },
  };

  const { data, error } = await sb
    .from("resources")
    .update({
      title: resolvedTitle,
      description: ai.summary,
      kind: resolvedKind,
      metadata,
      ingest_status: "enriched",
    })
    .eq("id", existing.id)
    .select("*")
    .single();

  if (error) {
    return { ok: false, resource: existing, error: error.message };
  }

  return { ok: true, resource: data ?? existing };
}

module.exports = { enrichAndPersistResource };
