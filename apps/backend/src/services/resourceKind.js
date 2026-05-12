/**
 * Best-effort kind from URL (before LLM enrichment).
 * @param {string} rawUrl
 */
function inferKindFromUrl(rawUrl) {
  let host = "";
  let pathname = "";
  try {
    const u = new URL(rawUrl);
    host = u.hostname.toLowerCase();
    pathname = u.pathname.toLowerCase();
  } catch {
    return "other";
  }

  if (host.includes("youtube.com") || host === "youtu.be" || host.endsWith(".youtube.com")) {
    return "youtube";
  }
  if (host.includes("spotify.com") || host.includes("open.spotify.com")) {
    return "spotify";
  }
  if (host.includes("podcasts.apple.com") || host.includes("music.apple.com")) {
    return "podcast";
  }
  if (host.includes("substack.com") || host.endsWith(".substack.com")) {
    return "newsletter";
  }
  if (pathname.endsWith(".pdf") || host.includes("arxiv.org")) {
    return "pdf";
  }
  if (host.includes("medium.com") || host.includes("dev.to")) {
    return "article";
  }
  return "article";
}

module.exports = { inferKindFromUrl };
