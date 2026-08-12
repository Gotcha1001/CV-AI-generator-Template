export type CvLayoutId =
  | "centered"
  | "sidebar-photo"
  | "split-banner"
  | "minimal-ats"
  | "graph-stats";

export interface CvLayoutMeta {
  id: CvLayoutId;
  name: string;
  description: string;
}

export const CV_LAYOUTS: CvLayoutMeta[] = [
  {
    id: "centered",
    name: "Centered Hero",
    description:
      "Original layout — centered photo/name header, then a sidebar + main two-column body. Friendly and modern.",
  },
  {
    id: "sidebar-photo",
    name: "Sidebar Photo",
    description:
      "Full-height dark sidebar with photo, contact list and skill bars; content panel with a timeline experience section.",
  },
  {
    id: "split-banner",
    name: "Split Banner",
    description:
      "Bold full-width color banner header, then a flowing single-column body with left-accent timeline blocks.",
  },
  {
    id: "minimal-ats",
    name: "Minimal ATS",
    description:
      "Clean single-column, no decorative cards — optimized for readability and applicant-tracking-system parsing.",
  },
  {
    id: "graph-stats",
    name: "Graph Stats",
    description:
      "Animated skill-signal bar chart and experience-depth radar chart, plus the standard header/experience/education sections.",
  },
];

export const DEFAULT_CV_LAYOUT_ID: CvLayoutId = "centered";

/** Look up a layout by id, falling back to the default when missing/unset. */
export function getCvLayoutMeta(id?: string | null): CvLayoutMeta {
  return (
    CV_LAYOUTS.find((l) => l.id === id) ??
    CV_LAYOUTS.find((l) => l.id === DEFAULT_CV_LAYOUT_ID)!
  );
}
