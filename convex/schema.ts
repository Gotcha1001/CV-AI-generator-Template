import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
    role: v.union(v.literal("admin"), v.literal("user")),
    createdAt: v.number(),
  }).index("by_clerk_id", ["clerkId"]),

  cvs: defineTable({
    userId: v.id("users"),
    title: v.string(), // internal label, e.g. "Web Designer version"
    targetRole: v.optional(v.string()), // e.g. "Web Designer"; empty/undefined = neutral
    isNeutral: v.boolean(),
    style: v.optional(v.string()),
    // NEW: which of the 4 layout templates (lib/layouts.ts CvLayoutId)
    // renders this CV, both in the web preview and the PDF download.
    // Optional/string, same pattern as `style` — unset rows fall back
    // to DEFAULT_CV_LAYOUT_ID via getCvLayoutMeta(), no migration needed.
    layout: v.optional(v.string()),
    shareId: v.string(), // public slug: /cv/[shareId]
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
    // Raw AI output — shape varies by prompt, so kept loose
    generatedContent: v.optional(v.any()),
    generationError: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_share_id", ["shareId"]),
});
