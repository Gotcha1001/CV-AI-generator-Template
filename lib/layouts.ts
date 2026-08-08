// lib/layouts.ts
//
// Central registry of CV *layout* templates. A CV stores the chosen
// layout's `id` on `cv.layout` (see convex/schema.ts), exactly the same
// pattern as `cv.style` in lib/styles.ts.
//
// - The web preview (components/cv-layouts/index.tsx) picks a React
//   component from LAYOUT_COMPONENTS keyed by this id.
// - The PDF renderer (app/api/cv/[shareId]/pdf/route.ts) picks a
//   document-builder function from lib/pdf-layouts/index.ts keyed by the
//   same id.
//
// Adding a 5th layout = add an entry here + one web component +
// one pdf component + register both in the two index files below.
// Everything else (theme colors, the form, the selector UI) already
// works generically off this list.

export type CvLayoutId =
  | "centered"
  | "sidebar-photo"
  | "split-banner"
  | "minimal-ats";

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
];

export const DEFAULT_CV_LAYOUT_ID: CvLayoutId = "centered";

/** Look up a layout by id, falling back to the default when missing/unset. */
export function getCvLayoutMeta(id?: string | null): CvLayoutMeta {
  return (
    CV_LAYOUTS.find((l) => l.id === id) ??
    CV_LAYOUTS.find((l) => l.id === DEFAULT_CV_LAYOUT_ID)!
  );
}
