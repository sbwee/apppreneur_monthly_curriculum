import type { Metadata } from "next";
import type { ShowcasePayload } from "@/src/lib/showcaseApi";
import { mapShowcasePayload } from "@/src/lib/showcaseMapper";

const SITE_NAME = "Learning Ledger";
const DESCRIPTION_MAX = 200;

function resolveSiteOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return `https://${vercel.replace(/\/$/, "")}`;
  }

  return "http://localhost:3000";
}

export function truncateShowcaseDescription(text: string, maxLength = DESCRIPTION_MAX): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return "A structured learning portfolio curated in Learning Ledger.";
  }
  if (cleaned.length <= maxLength) {
    return cleaned;
  }
  return `${cleaned.slice(0, maxLength - 1).trimEnd()}…`;
}

export function buildShowcasePageMetadata(payload: ShowcasePayload): Metadata {
  const mapped = mapShowcasePayload(payload);
  const title = `${mapped.title} | ${SITE_NAME}`;
  const description = truncateShowcaseDescription(mapped.overview);
  const siteOrigin = resolveSiteOrigin();
  const canonicalPath = `/showcase/${payload.slug}`;
  const canonicalUrl = `${siteOrigin}${canonicalPath}`;

  return {
    title,
    description,
    metadataBase: new URL(siteOrigin),
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: canonicalUrl,
      siteName: SITE_NAME,
      locale: "en_US",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export function buildShowcaseNotFoundMetadata(): Metadata {
  const title = `Showcase not found | ${SITE_NAME}`;
  const description = "This learning showcase is unpublished or unavailable.";

  return {
    title,
    description,
    robots: {
      index: false,
      follow: false,
    },
    openGraph: {
      title,
      description,
      type: "website",
      siteName: SITE_NAME,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export function buildShowcaseFallbackMetadata(): Metadata {
  const title = `Learning Showcase | ${SITE_NAME}`;
  const description = "Explore a structured learning portfolio on Learning Ledger.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: SITE_NAME,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}
