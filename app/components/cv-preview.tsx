// components/cv-preview.tsx
"use client";

import { motion } from "framer-motion";
import type { Doc } from "@/convex/_generated/dataModel";
import { getCvLayoutMeta, type CvLayoutId } from "@/lib/layouts";
import { CenteredLayout } from "./cv-layouts/centered";
import { SidebarPhotoLayout } from "./cv-layouts/sidebar-photo";
import { SplitBannerLayout } from "./cv-layouts/split-banner";
import { MinimalAtsLayout } from "./cv-layouts/minimal-ats";
import type { CvLayoutProps } from "./cv-layouts/types";
import { JSX } from "react";

/**
 * One entry per CvLayoutId in lib/layouts.ts. Adding a 5th layout means
 * adding one line here (plus registering the matching PDF builder in
 * lib/pdf-layouts/index.ts) — nothing else in the app needs to know
 * layouts exist.
 */
const LAYOUT_COMPONENTS: Record<
  CvLayoutId,
  (props: CvLayoutProps) => JSX.Element
> = {
  centered: CenteredLayout,
  "sidebar-photo": SidebarPhotoLayout,
  "split-banner": SplitBannerLayout,
  "minimal-ats": MinimalAtsLayout,
};

export function CvAnimatedView({
  cv,
  version,
}: {
  cv: Doc<"cvs">;
  version: Doc<"cvVersions">;
}) {
  const { fullName } = cv.personalInfo;

  if (cv.status === "generating" || cv.status === "draft") {
    return (
      <div className="max-w-3xl mx-auto py-20 px-4 text-center">
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2.4, repeat: Infinity }}
          className="text-muted-foreground"
        >
          Generating {fullName}&apos;s CV...
        </motion.div>
      </div>
    );
  }

  if (cv.status === "failed") {
    return (
      <div className="max-w-3xl mx-auto py-20 px-4 text-center space-y-2">
        <p className="text-lg font-medium">
          Something went wrong generating this CV.
        </p>
        {cv.generationError && (
          <p className="text-sm text-muted-foreground">{cv.generationError}</p>
        )}
      </div>
    );
  }

  const layoutId = getCvLayoutMeta(version.layout).id;
  const Layout = LAYOUT_COMPONENTS[layoutId] ?? CenteredLayout;

  return <Layout cv={cv} version={version} />;
}
