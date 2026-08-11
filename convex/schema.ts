import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const matchAnalysisValidator = v.object({
  score: v.number(), // 0-100, code-computed
  requiredKeywords: v.array(v.string()),
  niceToHaveKeywords: v.array(v.string()),
  matchedKeywords: v.array(v.string()),
  missingKeywords: v.array(v.string()),
  // short, human-readable coaching notes, e.g. "Add 'CI/CD' if you've
  // used GitHub Actions / Jenkins — this role lists it as required."
  suggestions: v.array(v.string()),
});

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
    role: v.union(v.literal("admin"), v.literal("user")),
    createdAt: v.number(),
  }).index("by_clerk_id", ["clerkId"]),

  // One row per "application" — the input data + target job.
  // Styling/layout/generation output live in cvVersions, not here.
  cvs: defineTable({
    userId: v.id("users"),
    title: v.string(), // internal label, e.g. "Web Designer version"
    targetRole: v.optional(v.string()), // e.g. "Web Designer"; empty/undefined = neutral
    isNeutral: v.boolean(),
    jobDescription: v.optional(v.string()),
    jobSourceUrl: v.optional(v.string()), // where it was imported from, if any

    shareId: v.string(), // public slug: /cv/[shareId]
    activeVersionId: v.optional(v.id("cvVersions")), // which version is live on the share link

    status: v.union(
      v.literal("draft"),
      v.literal("generating"),
      v.literal("ready"),
      v.literal("failed"),
    ),

    personalInfo: v.object({
      fullName: v.string(),
      idNumber: v.optional(v.string()),
      address: v.optional(v.string()),
      email: v.string(),
      phone: v.optional(v.string()),
      photoUrl: v.optional(v.string()),
      videoUrl: v.optional(v.string()),
    }),
    education: v.array(
      v.object({
        institution: v.string(),
        qualification: v.string(),
        startDate: v.string(),
        endDate: v.optional(v.string()),
        description: v.optional(v.string()),
      }),
    ),
    experience: v.array(
      v.object({
        company: v.string(),
        role: v.string(),
        startDate: v.string(),
        endDate: v.optional(v.string()),
        current: v.boolean(),
        description: v.optional(v.string()),
      }),
    ),
    testimonials: v.array(
      v.object({
        author: v.string(),
        authorRole: v.optional(v.string()),
        text: v.string(),
      }),
    ),
    references: v.array(
      v.object({
        name: v.string(),
        relationship: v.optional(v.string()),
        contact: v.string(),
      }),
    ),
    links: v.array(
      v.object({
        label: v.string(), // e.g. "Portfolio", "LinkedIn", "GitHub"
        url: v.string(),
        description: v.optional(v.string()), // e.g. "Case studies from my last 3 freelance projects"
      }),
    ),
    achievements: v.array(
      v.object({
        title: v.string(), // e.g. "Won Regional UX Hackathon"
        description: v.optional(v.string()),
        date: v.optional(v.string()),
      }),
    ),
    interests: v.array(v.string()), // e.g. ["Chess", "Open-source", "Trail running"]

    generationError: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_share_id", ["shareId"]),

  // Append-only. Every regeneration AND every style/layout change on the
  // same application creates a new row here — never overwritten.
  cvVersions: defineTable({
    cvId: v.id("cvs"),
    userId: v.id("users"), // denormalized so ownership checks don't need a join back to cvs
    versionNumber: v.number(), // 1, 2, 3... monotonic per cv, for display ("v3") and ordering
    label: v.string(), // e.g. "Centered", "Minimal ATS", or auto "Version 3"

    style: v.optional(v.string()),
    // which of the layout templates (lib/layouts.ts CvLayoutId) renders this
    // version, both in the web preview and the PDF download. Optional —
    // unset rows fall back to DEFAULT_CV_LAYOUT_ID via getCvLayoutMeta().
    layout: v.optional(v.string()),

    generatedContent: v.any(), // full AI output snapshot for this version
    matchAnalysis: v.optional(matchAnalysisValidator),

    createdAt: v.number(),
    editedAt: v.optional(v.number()),
  })
    .index("by_cv", ["cvId"])
    .index("by_cv_and_version", ["cvId", "versionNumber"]),
});
