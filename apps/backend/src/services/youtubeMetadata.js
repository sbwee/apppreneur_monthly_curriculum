/**
 * @param {string} rawUrl
 */
function isYouTubeUrl(rawUrl) {
  try {
    const host = new URL(rawUrl).hostname.toLowerCase();
    return host.includes("youtube.com") || host === "youtu.be" || host.endsWith(".youtube.com");
  } catch {
    return false;
  }
}

/**
 * Fetches public oEmbed metadata (title, author) for YouTube URLs.
 * @param {string} url
 * @returns {Promise<{ title: string; author: string | null } | null>}
 */
async function fetchYouTubeOEmbed(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const res = await fetch(oembedUrl, { signal: controller.signal });
    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    const title = typeof data.title === "string" ? data.title.trim() : "";
    if (!title) {
      return null;
    }

    return {
      title,
      author: typeof data.author_name === "string" ? data.author_name.trim() : null,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { isYouTubeUrl, fetchYouTubeOEmbed };
