export type SidebarItem = {
  label: string;
  href: string;
  isActive?: boolean;
};

export type ProgressTrack = {
  topic: string;
  value: number;
  color: string;
};

export type BucketItem = {
  id: string;
  type: "Video" | "Book" | "Article";
  title: string;
  description: string;
  meta: string;
  accent: string;
  status?: "done" | "pending" | "deferred" | "skipped";
};

export type FeatureBlock = {
  tag: string;
  title: string;
  description: string;
  cta?: string;
  variant: "image" | "quote";
  quoteAuthor?: string;
};

/** Sidebar nav config (profile data comes from the profile API). */
export const sidebarItems: SidebarItem[] = [
  { label: "Home", href: "/home", isActive: true },
  { label: "Workspace", href: "/workspace" },
  { label: "Showcase", href: "/showcase" },
];

export const featureBlocks: FeatureBlock[] = [
  {
    tag: "Curated for You",
    title: "Deep Work: Navigating the Digital Noise",
    description:
      "Join our monthly seminar on reclaiming focus in an age of constant distraction.",
    cta: "Explore Seminar",
    variant: "image",
  },
  {
    tag: "Morning Reflection",
    title: "The beautiful thing about learning is that no one can take it away from you.",
    description: "",
    variant: "quote",
    quoteAuthor: "B.B. King",
  },
];
