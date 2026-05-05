export type LandingStat = {
  id: string;
  label: string;
  value: string;
};

export type ShowcaseItem = {
  title: string;
  author: string;
  timeAgo: string;
};

export const landingStats: LandingStat[] = [
  { id: "learners", label: "Active learners", value: "2,400+" },
  { id: "sprints", label: "Weekly sprint plans", value: "11,200+" },
  { id: "completion", label: "Average completion", value: "75%" },
];

export const showcaseItem: ShowcaseItem = {
  title: "The Art of Mindful Note-taking",
  author: "Alex Rivers",
  timeAgo: "2 hours ago",
};
