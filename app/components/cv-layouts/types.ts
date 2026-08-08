// components/cv-layouts/types.ts
import type { Doc } from "@/convex/_generated/dataModel";

/**
 * Every web layout component (centered.tsx, sidebar-photo.tsx, ...)
 * takes exactly this prop shape. cv-preview.tsx does the data prep
 * once (via lib/cv-data.ts) and hands it down — no layout re-derives
 * `g` / testimonials / achievements itself, so they can't drift.
 */
export interface CvLayoutProps {
  cv: Doc<"cvs">;
}
