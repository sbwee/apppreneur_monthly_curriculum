import type { BucketItem } from "@/src/data/mockHome";
import type { WorkspaceResource } from "@/src/data/mockWorkspace";

export type ApiResource = {
  id: string;
  url: string;
  kind: string;
  title: string | null;
  description: string | null;
  ingest_status: "pending" | "enriched" | "failed";
  metadata?: {
    ai?: {
      estimated_duration_minutes?: number | null;
    };
  };
};

const BUCKET_ACCENTS: Record<string, string> = {
  Video: "#DCEBE3",
  Book: "#F4E2E2",
  Article: "#F3EAD5",
};

function kindToDisplayType(kind: string): WorkspaceResource["type"] {
  const normalized = kind.toLowerCase();
  if (normalized.includes("video") || normalized.includes("youtube")) return "Video";
  if (normalized.includes("pdf") || normalized.includes("book")) return "PDF";
  return "Article";
}

function titleFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtube") || parsed.hostname.includes("youtu.be")) {
      return "YouTube video";
    }
    if (parsed.hostname.includes("spotify")) {
      return "Spotify episode";
    }
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "Untitled resource";
  }
}

export function resourceTitle(resource: ApiResource): string {
  return resource.title?.trim() || titleFromUrl(resource.url);
}

export function resourceDescription(resource: ApiResource): string {
  if (resource.description?.trim()) {
    return resource.description;
  }
  if (resource.ingest_status === "failed") {
    return "Metadata extraction failed. The link was saved.";
  }
  if (resource.ingest_status === "pending") {
    return "Enriching this resource…";
  }
  return "No description available.";
}

function bucketMeta(resource: ApiResource): string {
  const minutes = resource.metadata?.ai?.estimated_duration_minutes;
  if (typeof minutes === "number" && minutes > 0) {
    return minutes >= 60 ? `${Math.round(minutes / 60)} hr read` : `${minutes} min`;
  }
  const type = kindToDisplayType(resource.kind);
  if (type === "Video") return "Video lesson";
  if (type === "PDF") return "Reading material";
  return "Saved to your garden";
}

export function mapApiResource(resource: ApiResource): WorkspaceResource {
  return {
    id: resource.id,
    type: kindToDisplayType(resource.kind),
    title: resourceTitle(resource),
    description: resourceDescription(resource),
    url: resource.url,
  };
}

export function mapResourceToBucketItem(resource: ApiResource): BucketItem {
  const type = kindToDisplayType(resource.kind);
  const bucketType: BucketItem["type"] =
    type === "PDF" ? "Book" : type === "Video" ? "Video" : "Article";

  return {
    id: resource.id,
    type: bucketType,
    title: resourceTitle(resource),
    description: resourceDescription(resource),
    meta: bucketMeta(resource),
    accent: BUCKET_ACCENTS[bucketType] ?? "#DCEBE3",
  };
}
