const MAX_BYTES = 60_000;

/**
 * Fetch a small HTML/text slice for LLM context (best-effort; never throws).
 * @param {string} url
 * @returns {Promise<{ excerpt: string; contentType: string | null; fetchError?: string }>}
 */
async function fetchUrlExcerpt(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "MonthlyCurriculumBot/1.0 (+https://example.invalid)",
        accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1",
      },
    });

    const contentType = res.headers.get("content-type");
    if (!res.ok) {
      return {
        excerpt: "",
        contentType,
        fetchError: `HTTP ${res.status}`,
      };
    }

    const buf = await res.arrayBuffer();
    const slice = buf.byteLength > MAX_BYTES ? buf.slice(0, MAX_BYTES) : buf;
    const text = new TextDecoder("utf-8", { fatal: false }).decode(slice);

    return {
      excerpt: stripHtml(text).slice(0, 12_000),
      contentType,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { excerpt: "", contentType: null, fetchError: message };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * @param {string} html
 */
function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

module.exports = { fetchUrlExcerpt };
