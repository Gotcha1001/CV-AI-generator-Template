// lib/cv-data.ts
//
// Single place that turns a raw `cv` doc into the shape every layout
// (web or pdf) actually renders. Both components/cv-layouts/* and
// lib/pdf-layouts/* call this instead of re-deriving `g`,
// `testimonials`, `achievements`, `hasSidebarContent` themselves —
// keeps every layout's "what counts as content" logic identical.

import type { Doc } from "@/convex/_generated/dataModel";
import type { GeneratedCvContent } from "@/lib/cv-types";
import { getCvStyle } from "@/lib/styles";
import { getCvLayoutMeta } from "@/lib/layouts";

export function prepareCvData(cv: Doc<"cvs">) {
  const g = cv.generatedContent as GeneratedCvContent | undefined;
  const theme = getCvStyle(cv.style);
  const layout = getCvLayoutMeta(cv.layout);
  const testimonials = g?.testimonialHighlights ?? cv.testimonials;
  const achievements = g?.achievementHighlights ?? cv.achievements;
  const hasSidebarContent =
    cv.interests.length > 0 || cv.links.length > 0 || cv.references.length > 0;

  return {
    g,
    theme,
    layout,
    testimonials,
    achievements,
    hasSidebarContent,
    ...cv.personalInfo,
  };
}

/** Strip everything except digits so wa.me gets a clean international number. */
export function toWhatsAppNumber(phone: string) {
  return phone.replace(/[^\d]/g, "");
}
