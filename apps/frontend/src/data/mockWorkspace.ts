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
  status?: "draft" | "active" | "archived";
  note: WorkspaceNote;
};

export type WorkspaceResource = {
  id: string;
  type: "PDF" | "Video" | "Article";
  title: string;
  description: string;
  url: string;
};
