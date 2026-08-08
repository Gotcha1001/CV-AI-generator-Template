// "use node";

// import { v } from "convex/values";
// import { action } from "./_generated/server";
// import { internal } from "./_generated/api";

// export const generateCv = action({
//   args: { cvId: v.id("cvs") },
//   handler: async (ctx, args) => {
//     const cv = await ctx.runQuery(internal.cvs._getCvInternal, {
//       cvId: args.cvId,
//     });
//     if (!cv) throw new Error("CV not found");

//     await ctx.runMutation(internal.cvs._setGenerating, { cvId: args.cvId });

//     const apiKey = process.env.OPENROUTER_API_KEY;
//     if (!apiKey) throw new Error("OPENROUTER_API_KEY not set in Convex env");

//     const targetLine = cv.isNeutral
//       ? "Produce a NEUTRAL, general-purpose CV that fairly represents all their experience — do not favor any one job type."
//       : `Tailor this CV specifically for a "${cv.targetRole}" role. Re-order and re-weight bullets toward what that role cares about most. Do not invent facts not present in the source data — only reframe and prioritize what's given.`;

//     const prompt = `
// You are a professional CV writer. Given the candidate data below, output ONLY valid JSON
// (no markdown fences, no commentary) matching this shape:

// {
//   "headline": string,
//   "summary": string,
//   "topSkills": string[],
//   "experience": [{ "company": string, "role": string, "period": string, "bullets": string[] }],
//   "education": [{ "institution": string, "qualification": string, "period": string }],
//   "testimonialHighlights": [{ "author": string, "text": string }],
//   "achievementHighlights": [{ "title": string, "description": string }],
//   "closingNote": string
// }

// ${targetLine}
// If achievements are provided, select and order the ones most relevant to the target role in
// "achievementHighlights" — do not invent achievements not present in the source data.

// CANDIDATE DATA:
// ${JSON.stringify(
//   {
//     personalInfo: cv.personalInfo,
//     education: cv.education,
//     experience: cv.experience,
//     testimonials: cv.testimonials,
//     references: cv.references,
//     achievements: cv.achievements,
//     interests: cv.interests,
//   },
//   null,
//   2,
// )}
// `.trim();

//     try {
//       const response = await fetch(
//         "https://openrouter.ai/api/v1/chat/completions",
//         {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//             Authorization: `Bearer ${apiKey}`,
//           },
//           body: JSON.stringify({
//             model: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
//             messages: [{ role: "user", content: prompt }],
//             stream: false, // no persistent client connection to stream to — Convex's
//             // reactive `getCv`/`getByShareId` query already updates the
//             // UI the instant status flips to "ready"
//           }),
//         },
//       );

//       if (!response.ok) {
//         throw new Error(
//           `OpenRouter error ${response.status}: ${await response.text()}`,
//         );
//       }

//       const data = await response.json();
//       const raw = data.choices?.[0]?.message?.content ?? "";
//       const cleaned = raw.replace(/```json|```/g, "").trim();
//       const parsed = JSON.parse(cleaned);

//       await ctx.runMutation(internal.cvs._saveGeneratedContent, {
//         cvId: args.cvId,
//         generatedContent: parsed,
//       });
//     } catch (err: unknown) {
//       const message =
//         err instanceof Error ? err.message : "Unknown generation error";
//       await ctx.runMutation(internal.cvs._saveGenerationError, {
//         cvId: args.cvId,
//         error: message,
//       });
//       throw err;
//     }
//   },
// });

"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

export const generateCv = action({
  args: { cvId: v.id("cvs") },
  handler: async (ctx, args) => {
    const cv = await ctx.runQuery(internal.cvs._getCvInternal, {
      cvId: args.cvId,
    });
    if (!cv) throw new Error("CV not found");

    await ctx.runMutation(internal.cvs._setGenerating, { cvId: args.cvId });

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY not set in Convex env");

    const targetLine = cv.isNeutral
      ? "Produce a NEUTRAL, general-purpose CV that fairly represents all their experience — do not favor any one job type."
      : `Tailor this CV specifically for a "${cv.targetRole}" role. Re-order and re-weight bullets toward what that role cares about most. Do not invent facts not present in the source data — only reframe and prioritize what's given.`;

    const prompt = `
You are a professional CV writer. Given the candidate data below, output ONLY valid JSON
(no markdown fences, no commentary) matching this shape:

{
  "headline": string,
  "summary": string,
  "topSkills": string[],
  "experience": [{ "company": string, "role": string, "period": string, "bullets": string[] }],
  "education": [{ "institution": string, "qualification": string, "period": string }],
  "testimonialHighlights": [{ "author": string, "text": string }],
  "achievementHighlights": [{ "title": string, "description": string }],
  "closingNote": string
}

SUMMARY REQUIREMENTS:
Write "summary" as a polished, third-person professional biography of 5-7 sentences
(roughly 100-150 words) — not a one-liner. It should read like the opening paragraph
of a strong LinkedIn "About" section or executive bio, written in a natural,
confident, human tone (not a list of buzzwords). Weave together, where the data
supports it:
- who they are professionally and their strongest area of expertise
- relevant education/qualifications
- a concrete highlight or two from their work experience (not just "experienced in X")
- their personal interests, briefly, to add personality and make them memorable
- if links are provided (portfolio, LinkedIn, GitHub, etc.), reference what's there
  naturally (e.g. "with a portfolio showcasing...") without just listing raw URLs
Do not invent facts not present in the source data — only elaborate on and connect
what's given, in the candidate's own domain and voice.

${targetLine}
If achievements are provided, select and order the ones most relevant to the target role in
"achievementHighlights" — do not invent achievements not present in the source data.

CANDIDATE DATA:
${JSON.stringify(
  {
    personalInfo: cv.personalInfo,
    education: cv.education,
    experience: cv.experience,
    testimonials: cv.testimonials,
    references: cv.references,
    achievements: cv.achievements,
    interests: cv.interests,
    links: cv.links,
  },
  null,
  2,
)}
`.trim();

    try {
      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
            messages: [{ role: "user", content: prompt }],
            stream: false, // no persistent client connection to stream to — Convex's
            // reactive `getCv`/`getByShareId` query already updates the
            // UI the instant status flips to "ready"
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          `OpenRouter error ${response.status}: ${await response.text()}`,
        );
      }

      const data = await response.json();
      const raw = data.choices?.[0]?.message?.content ?? "";
      const cleaned = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      await ctx.runMutation(internal.cvs._saveGeneratedContent, {
        cvId: args.cvId,
        generatedContent: parsed,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unknown generation error";
      await ctx.runMutation(internal.cvs._saveGenerationError, {
        cvId: args.cvId,
        error: message,
      });
      throw err;
    }
  },
});
