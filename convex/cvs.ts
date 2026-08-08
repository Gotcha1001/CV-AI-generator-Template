import { v } from "convex/values";
import {
  mutation,
  query,
  internalMutation,
  internalQuery,
  QueryCtx,
  MutationCtx,
} from "./_generated/server";
import { customAlphabet } from "nanoid";

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 10);

async function requireUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .first();
  if (!user) throw new Error("User record not found — call createOrGet first");
  return user;
}

const cvFields = {
  title: v.string(),
  targetRole: v.optional(v.string()),
  isNeutral: v.boolean(),
  style: v.optional(v.string()),
  layout: v.optional(v.string()), // NEW — see convex/schema.ts
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
      label: v.string(),
      url: v.string(),
      description: v.optional(v.string()),
    }),
  ),
  achievements: v.array(
    v.object({
      title: v.string(),
      description: v.optional(v.string()),
      date: v.optional(v.string()),
    }),
  ),
  interests: v.array(v.string()),
};

// Create new draft, or update an existing one if cvId is passed.
// Does NOT trigger AI generation — that's a separate action call from the client.
export const upsertCv = mutation({
  args: { cvId: v.optional(v.id("cvs")), ...cvFields },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const { cvId, ...fields } = args;
    if (cvId) {
      const existing = await ctx.db.get(cvId);
      if (!existing || existing.userId !== user._id)
        throw new Error("Not found");
      await ctx.db.patch(cvId, {
        ...fields,
        updatedAt: Date.now(),
        status: "draft",
      });
      return cvId;
    }
    return await ctx.db.insert("cvs", {
      ...fields,
      userId: user._id,
      shareId: nanoid(),
      status: "draft",
      generatedContent: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const deleteCv = mutation({
  args: { cvId: v.id("cvs") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const cv = await ctx.db.get(args.cvId);
    if (!cv || cv.userId !== user._id) throw new Error("Not found");
    await ctx.db.delete(args.cvId);
  },
});

export const listMyCvs = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) return [];
    return await ctx.db
      .query("cvs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const getCv = query({
  args: { cvId: v.id("cvs") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const cv = await ctx.db.get(args.cvId);
    if (!cv || cv.userId !== user._id) return null;
    return cv;
  },
});

// PUBLIC — no auth check. This is what the /cv/[shareId] page reads.
export const getByShareId = query({
  args: { shareId: v.string() },
  handler: async (ctx, args) => {
    const cv = await ctx.db
      .query("cvs")
      .withIndex("by_share_id", (q) => q.eq("shareId", args.shareId))
      .first();
    if (!cv || cv.status !== "ready") return null;
    return cv;
  },
});

// --- internal helpers used only by convex/ai.ts ---
export const _getCvInternal = internalQuery({
  args: { cvId: v.id("cvs") },
  handler: async (ctx, args) => await ctx.db.get(args.cvId),
});

export const _setGenerating = internalMutation({
  args: { cvId: v.id("cvs") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.cvId, { status: "generating" });
  },
});

export const _saveGeneratedContent = internalMutation({
  args: { cvId: v.id("cvs"), generatedContent: v.any() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.cvId, {
      generatedContent: args.generatedContent,
      status: "ready",
      updatedAt: Date.now(),
    });
  },
});

export const _saveGenerationError = internalMutation({
  args: { cvId: v.id("cvs"), error: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.cvId, {
      status: "failed",
      generationError: args.error,
    });
  },
});
