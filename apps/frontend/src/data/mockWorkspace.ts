export type WorkspaceNote = {
  title: string;
  visibility: "Public" | "Private";
  tags: string[];
  intro: string;
  considerations: string[];
  outro: string;
};

export type CurriculumPath = {
  id: string;
  label: string;
  note: WorkspaceNote;
};

export type WorkspaceResource = {
  id: string;
  type: "PDF" | "Video" | "Article";
  title: string;
  description: string;
};

export const curriculumPaths: CurriculumPath[] = [
  {
    id: "distributed-systems",
    label: "Distributed Systems",
    note: {
      title: "My Notes: Distributed State",
      visibility: "Public",
      tags: ["Architecture", "System Design", "Algorithms", "+ Tag"],
      intro:
        "Understanding distributed state management requires shifting from a centralized perception of \"truth.\" In a distributed system, truth is often a consensus reached between multiple nodes, rather than a single record held in one place.",
      considerations: [
        "Eventual consistency vs. strong consistency.",
        "CRDTs (Conflict-free Replicated Data Types) as a mathematical approach to merging state.",
        "The CAP theorem limitations in real-world network partitions.",
      ],
      outro:
        "To build resilient systems, we must embrace the messy reality of network latency and partial failures. It's not about preventing synchronization issues, but about designing systems that can recover from them elegantly.",
    },
  },
  {
    id: "sustainability-101",
    label: "Sustainability 101",
    note: {
      title: "My Notes: Circular Design Basics",
      visibility: "Public",
      tags: ["Climate", "Circular Economy", "Systems Thinking", "+ Tag"],
      intro:
        "Sustainable systems design begins with lifecycle awareness. Instead of optimizing only for output, we design loops where materials, energy, and information remain useful for as long as possible.",
      considerations: [
        "Measure embodied carbon before choosing materials.",
        "Design for repairability and modular replacement.",
        "Use feedback loops to monitor waste, water, and energy intensity.",
      ],
      outro:
        "The strongest sustainability strategies are not one-off features; they are operational habits that align incentives, technology, and community behavior over time.",
    },
  },
  {
    id: "digital-arts",
    label: "Digital Arts",
    note: {
      title: "My Notes: Visual Rhythm in Interfaces",
      visibility: "Public",
      tags: ["Composition", "Typography", "Interaction", "+ Tag"],
      intro:
        "Visual rhythm is the pacing of attention across an interface. By balancing contrast, whitespace, and hierarchy, designers guide the eye without overwhelming the reader.",
      considerations: [
        "Pair expressive headings with restrained body typography.",
        "Use color contrast to encode emphasis, not decoration.",
        "Maintain spacing scales so sections feel intentionally related.",
      ],
      outro:
        "Great digital art direction is coherent under change: components evolve, but the visual language remains recognizable and calm.",
    },
  },
];

export const workspaceSections = [
  { id: "theory", label: "Theoretical Basics", active: true },
  { id: "components", label: "Component Models" },
  { id: "drafts", label: "Draft Experiments" },
];

export const workspaceResources: WorkspaceResource[] = [
  {
    id: "pdf",
    type: "PDF",
    title: "State Merging Patterns",
    description: "Whitepaper on distributed consensus in edge computing.",
  },
  {
    id: "video",
    type: "Video",
    title: "Vector Clocks 101",
    description: "A 12 minute deep dive into logical clock mechanisms.",
  },
];

export const randomResourcePool: Omit<WorkspaceResource, "id">[] = [
  {
    type: "PDF",
    title: "New Study: Sustainable Systems",
    description: "Research digest on resilient infrastructure and circular policy models.",
  },
  {
    type: "Video",
    title: "Distributed Consensus in 15 Minutes",
    description: "Compact walkthrough of leader election and log replication patterns.",
  },
  {
    type: "Article",
    title: "Design Critique: Quiet Interfaces",
    description: "How minimal interaction design improves comprehension and recall.",
  },
];

export const workspaceMastery = {
  value: 70,
  message: "You're nearing full understanding of this concept.",
};
