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
import { matchAnalysisValidator } from "./schema";
import { Id } from "./_generated/dataModel";

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

// Shared so every place that inserts a cvVersions row numbers it the same
// way — max existing versionNumber + 1, not row count (row count breaks
// once any version has been deleted).
async function nextVersionNumber(ctx: MutationCtx, cvId: Id<"cvs">) {
  const last = await ctx.db
    .query("cvVersions")
    .withIndex("by_cv", (q) => q.eq("cvId", cvId))
    .order("desc")
    .first();
  return (last?.versionNumber ?? 0) + 1;
}

// Input fields for the application itself. NOTE: style/layout are NOT here
// — those are per-version now (see cvVersions in schema.ts), chosen at
// generation/restyle time via _saveGeneratedContent, not on the base draft.
const cvFields = {
  title: v.string(),
  targetRole: v.optional(v.string()),
  jobDescription: v.optional(v.string()),
  isNeutral: v.boolean(),
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
//
// preserveStatus: pass true when this call is just saving shared fields
// in place (e.g. from the version-edit form) and should NOT knock the cv
// back to "draft". cv.status is a single field shared across every
// version — forcing it to "draft" here used to make every version's
// preview show the "Generating..." placeholder forever, since nothing
// re-triggers AI generation from this mutation. Default is false so the
// original create-flow behavior (draft -> generate -> ready) is unchanged
// for callers that don't pass it.
export const upsertCv = mutation({
  args: {
    cvId: v.optional(v.id("cvs")),
    preserveStatus: v.optional(v.boolean()),
    ...cvFields,
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const { cvId, preserveStatus, ...fields } = args;
    if (cvId) {
      const existing = await ctx.db.get(cvId);
      if (!existing || existing.userId !== user._id)
        throw new Error("Not found");
      await ctx.db.patch(cvId, {
        ...fields,
        updatedAt: Date.now(),
        ...(preserveStatus ? {} : { status: "draft" }),
      });
      return cvId;
    }
    return await ctx.db.insert("cvs", {
      ...fields,
      userId: user._id,
      shareId: nanoid(),
      status: "draft",
      // no generatedContent/activeVersionId here — nothing has been
      // generated yet, so there's nothing to point at
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

    // Clean up every version too — orphaned cvVersions rows would otherwise
    // sit around forever with no parent.
    const versions = await ctx.db
      .query("cvVersions")
      .withIndex("by_cv", (q) => q.eq("cvId", args.cvId))
      .collect();
    for (const version of versions) {
      await ctx.db.delete(version._id);
    }

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

// Convenience for the editor/preview UI: the cv plus its currently active
// version's content, joined into one object. Avoids every screen having to
// do the two-query dance itself.
export const getCvWithActiveVersion = query({
  args: { cvId: v.id("cvs") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const cv = await ctx.db.get(args.cvId);
    if (!cv || cv.userId !== user._id) return null;
    const activeVersion = cv.activeVersionId
      ? await ctx.db.get(cv.activeVersionId)
      : null;
    return { cv, activeVersion };
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
    if (!cv || cv.status !== "ready" || !cv.activeVersionId) return null;

    const activeVersion = await ctx.db.get(cv.activeVersionId);
    if (!activeVersion) return null;

    return { cv, activeVersion };
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

// Appends a new version (AI regeneration OR a style/layout-only change use
// this same path — see the message above for why that's one function, not
// two). Never overwrites a prior version; the new one becomes active.
export const _saveGeneratedContent = internalMutation({
  args: {
    cvId: v.id("cvs"),
    generatedContent: v.any(),
    style: v.optional(v.string()),
    layout: v.optional(v.string()),
    label: v.optional(v.string()), // e.g. from UI: "Centered"
    matchAnalysis: v.optional(matchAnalysisValidator),
  },
  handler: async (ctx, args) => {
    const cv = await ctx.db.get(args.cvId);
    if (!cv) throw new Error("CV not found");

    const versionNumber = await nextVersionNumber(ctx, args.cvId);

    const versionId = await ctx.db.insert("cvVersions", {
      cvId: args.cvId,
      userId: cv.userId,
      versionNumber,
      label: args.label ?? args.style ?? `Version ${versionNumber}`,
      style: args.style,
      layout: args.layout,
      generatedContent: args.generatedContent,
      matchAnalysis: args.matchAnalysis,
      createdAt: Date.now(),
    });

    await ctx.db.patch(args.cvId, {
      activeVersionId: versionId, // newest version becomes the live one by default
      status: "ready",
      updatedAt: Date.now(),
    });

    return versionId;
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

// Match analysis is per-version now (it's computed against a specific
// generatedContent snapshot), so this patches the version, not the cv.
// If you compute match analysis in the same action call as generation,
// just pass matchAnalysis into _saveGeneratedContent above instead and
// skip this call entirely.
export const _saveMatchAnalysisForVersion = internalMutation({
  args: {
    versionId: v.id("cvVersions"),
    matchAnalysis: matchAnalysisValidator,
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.versionId, { matchAnalysis: args.matchAnalysis });
  },
});

// Light payload for the history gallery — no generatedContent, so the list
// stays fast even with many versions. Full snapshot comes from
// getCvVersionContent when the user actually opens/previews one.
export const listCvVersions = query({
  args: { cvId: v.id("cvs") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const cv = await ctx.db.get(args.cvId);
    if (!cv || cv.userId !== user._id) throw new Error("Not found");

    const versions = await ctx.db
      .query("cvVersions")
      .withIndex("by_cv", (q) => q.eq("cvId", args.cvId))
      .order("desc")
      .collect();

    return versions.map((version) => ({
      _id: version._id,
      versionNumber: version.versionNumber,
      label: version.label,
      style: version.style,
      layout: version.layout,
      matchScore: version.matchAnalysis?.score,
      isActive: version._id === cv.activeVersionId,
      createdAt: version.createdAt,
    }));
  },
});

export const getCvVersionContent = query({
  args: { versionId: v.id("cvVersions") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const version = await ctx.db.get(args.versionId);
    if (!version || version.userId !== user._id) throw new Error("Not found");
    return version;
  },
});

// Point the share link at a different existing version. This is the whole
// "pick which one to send to the employer" flow — no copying, no diffing.
export const setActiveVersion = mutation({
  args: { cvId: v.id("cvs"), versionId: v.id("cvVersions") },
  handler: async (ctx, { cvId, versionId }) => {
    const user = await requireUser(ctx);
    const cv = await ctx.db.get(cvId);
    if (!cv || cv.userId !== user._id) throw new Error("Not found");

    const version = await ctx.db.get(versionId);
    if (!version || version.cvId !== cvId) throw new Error("Not found");

    await ctx.db.patch(cvId, {
      activeVersionId: versionId,
      updatedAt: Date.now(),
    });
  },
});

// Permanent delete. If the deleted version was the active one, fall back
// to the newest remaining version (or clear activeVersionId if none left).
export const deleteVersion = mutation({
  args: { versionId: v.id("cvVersions") },
  handler: async (ctx, { versionId }) => {
    const user = await requireUser(ctx);
    const version = await ctx.db.get(versionId);
    if (!version || version.userId !== user._id) throw new Error("Not found");

    const cv = await ctx.db.get(version.cvId);
    if (!cv || cv.userId !== user._id) throw new Error("Not found");

    await ctx.db.delete(versionId);

    if (cv.activeVersionId === versionId) {
      const fallback = await ctx.db
        .query("cvVersions")
        .withIndex("by_cv", (q) => q.eq("cvId", version.cvId))
        .order("desc")
        .first();
      await ctx.db.patch(version.cvId, {
        activeVersionId: fallback?._id,
        updatedAt: Date.now(),
      });
    }
  },
});

// convex/cvs.ts
// Replace the existing updateVersionContent mutation with this version.
// Only change: style and layout are now optional args that get patched
// alongside generatedContent, since the edit page lets you change them too.

export const updateVersionContent = mutation({
  args: {
    versionId: v.id("cvVersions"),
    generatedContent: v.any(),
    label: v.optional(v.string()),
    style: v.optional(v.string()),
    layout: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const version = await ctx.db.get(args.versionId);
    if (!version || version.userId !== user._id) throw new Error("Not found");
    await ctx.db.patch(args.versionId, {
      generatedContent: args.generatedContent,
      ...(args.label !== undefined ? { label: args.label } : {}),
      ...(args.style !== undefined ? { style: args.style } : {}),
      ...(args.layout !== undefined ? { layout: args.layout } : {}),
      editedAt: Date.now(), // see schema note below
    });
  },
});

// One-time repair for cvs whose status got stuck on "draft"/"generating"
// by the old upsertCv bug, even though they have a perfectly good
// activeVersionId sitting there. Safe no-op if nothing's broken.
// One-time repair for cvs whose status got stuck on "draft"/"generating"
// by the old upsertCv bug, even though they have a working activeVersionId.
// Only touches your own cvs. Safe no-op on anything not actually broken.
export const _repairStuckStatuses = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const myCvs = await ctx.db
      .query("cvs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    let repaired = 0;
    for (const cv of myCvs) {
      if (cv.activeVersionId && cv.status !== "ready") {
        await ctx.db.patch(cv._id, { status: "ready" });
        repaired++;
      }
    }
    return { checked: myCvs.length, repaired };
  },
});
