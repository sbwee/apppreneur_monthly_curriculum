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
};

export type FeatureBlock = {
  tag: string;
  title: string;
  description: string;
  cta?: string;
  variant: "image" | "quote";
  quoteAuthor?: string;
};

export const userProfile = {
  name: "Serra",
  level: "Lvl 12 Learner",
};

export const sidebarItems: SidebarItem[] = [
  { label: "Home", href: "/home", isActive: true },
  { label: "Workspace", href: "/workspace" },
  { label: "Showcase", href: "/showcase" },
];

export const progressData = {
  mastery: 75,
  tracks: [
    { topic: "Philosophy", value: 82, color: "#446D5D" },
    { topic: "Digital Arts", value: 50, color: "#B65458" },
  ] satisfies ProgressTrack[],
};

export const bucketItems: BucketItem[] = [
  {
    id: "video",
    type: "Video",
    title: "The Architecture of Silence",
    description:
      "An exploration of minimalist spaces and their psychological impact on focus.",
    meta: "12 mins remaining",
    accent: "#DCEBE3",
  },
  {
    id: "book",
    type: "Book",
    title: "Design as Art",
    description:
      "Bruno Munari's classic treatise on functionality and visual beauty.",
    meta: "Ch. 4 of 12",
    accent: "#F4E2E2",
  },
  {
    id: "article",
    type: "Article",
    title: "The Psychology of Color in Learning",
    description:
      "How chroma affects retention and cognitive load in digital environments.",
    meta: "4 min read",
    accent: "#F3EAD5",
  },
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
