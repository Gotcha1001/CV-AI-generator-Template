"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { computeMatch, flattenCandidateText } from "../lib/keyword-match";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Tried in order. The first is your original pick — fast and free, but its
// NIM backing function has been going DEGRADED intermittently on OpenRouter
// (an NVIDIA-side infra issue, not us). Each entry after it is a fallback
// used only if the previous one is actually down, not a general A/B.
const MODEL_CHAIN = [
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "qwen/qwen-2.5-72b-instruct",
];

async function callOpenRouter(apiKey: string, prompt: string) {
  let lastErr: Error | null = null;

  for (const model of MODEL_CHAIN) {
    // Up to 2 tries per model: the first failure might be a one-off network
    // blip worth retrying on the SAME model; a provider-down error is not,
    // so that case breaks out to the next model immediately (see below).
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          stream: false,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const raw = data.choices?.[0]?.message?.content ?? "";
        return JSON.parse(raw.replace(/```json|```/g, "").trim());
      }

      const text = await response.text();
      lastErr = new Error(
        `OpenRouter error ${response.status} (${model}): ${text}`,
      );

      // "DEGRADED function cannot be invoked" (NVIDIA NIM backend down),
      // 503 (no capacity), and 429 (rate-limited) won't resolve by hitting
      // the same model again — move straight to the next one in the chain.
      const isProviderDown =
        text.includes("DEGRADED") ||
        response.status === 503 ||
        response.status === 429;
      if (isProviderDown) break;

      // Otherwise, likely transient — brief backoff, retry same model once.
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }
    }
  }

  throw lastErr ?? new Error("All OpenRouter models failed");
}

export const generateCv = action({
  args: {
    cvId: v.id("cvs"),
    style: v.optional(v.string()),
    layout: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const cv = await ctx.runQuery(internal.cvs._getCvInternal, {
      cvId: args.cvId,
    });
    if (!cv) throw new Error("CV not found");

    await ctx.runMutation(internal.cvs._setGenerating, { cvId: args.cvId });

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY not set in Convex env");

    try {
      const hasJd = !!cv.jobDescription?.trim();
      let requiredKeywords: string[] = [];
      let niceToHaveKeywords: string[] = [];
      let matchNotes = "";
      let matchAnalysisPayload:
        | {
            score: number;
            requiredKeywords: string[];
            niceToHaveKeywords: string[];
            matchedKeywords: string[];
            missingKeywords: string[];
            suggestions: string[];
          }
        | undefined;

      // ---- PASS 1: extract structured requirements from the JD ----
      // Only runs when a JD is actually provided — falls back to plain
      // targetRole tailoring otherwise, so this stays backward-compatible
      // with existing CVs / the "neutral" flow.
      if (hasJd) {
        const extractPrompt = `
You are analyzing a job description. Output ONLY valid JSON (no markdown fences, no commentary):

{
  "requiredKeywords": string[],   // 6-14 must-have skills/tools/qualifications, each 1-3 words
  "niceToHaveKeywords": string[], // 3-8 bonus skills/tools mentioned as preferred, not required
  "seniority": string,            // e.g. "mid-level", "senior", "entry-level"
  "coreResponsibilities": string[] // 3-6 short phrases, the actual day-to-day of the role
}

Extract only from what's explicitly stated or clearly implied by the posting.
Prefer specific, ATS-style keywords ("React", "stakeholder management", "AWS")
over vague ones ("team player").

JOB DESCRIPTION:
${cv.jobDescription}
        `.trim();

        const extracted = await callOpenRouter(apiKey, extractPrompt);
        requiredKeywords = extracted.requiredKeywords ?? [];
        niceToHaveKeywords = extracted.niceToHaveKeywords ?? [];

        // ---- PASS 2 (code, not AI): deterministic coverage score ----
        const candidateText = flattenCandidateText(cv);
        const match = computeMatch(
          requiredKeywords,
          niceToHaveKeywords,
          candidateText,
        );

        matchNotes = `
JOB MATCH CONTEXT (for your reference — use to decide emphasis, do not repeat verbatim):
Required keywords for this role: ${requiredKeywords.join(", ")}
Nice-to-have: ${niceToHaveKeywords.join(", ")}
Candidate currently demonstrates: ${match.matchedKeywords.join(", ") || "none detected yet"}
Candidate is missing: ${match.missingKeywords.join(", ") || "none"}

For any "missing" keyword: if the candidate's real experience genuinely covers
it under different wording (e.g. they wrote "built REST endpoints" and the
keyword is "API development"), you MAY surface the standard terminology in a
bullet. Do NOT claim a missing keyword if there's no underlying evidence for
it anywhere in the candidate data — that's fabrication, not reframing.
        `.trim();

        // Stored on the version via _saveGeneratedContent — there is no
        // separate _saveMatchAnalysis mutation anymore.
        matchAnalysisPayload = {
          score: match.score,
          requiredKeywords,
          niceToHaveKeywords,
          matchedKeywords: match.matchedKeywords,
          missingKeywords: match.missingKeywords,
          suggestions: match.missingKeywords
            .slice(0, 5)
            .map(
              (kw) =>
                `Consider adding "${kw}" if you have relevant experience — this role lists it.`,
            ),
        };
      }

      // ---- PASS 3: tailor the CV, same shape as before, JD-aware ----
      const targetLine = cv.isNeutral
        ? "Produce a NEUTRAL, general-purpose CV that fairly represents their experience — do not favor any one job type."
        : hasJd
          ? `Tailor this CV specifically for the job description below. Re-order and re-weight bullets toward what THIS SPECIFIC posting cares about most — not just the job title in general. Do not invent facts not present in the source data — only reframe and prioritize what's given.\n\nJOB DESCRIPTION:\n${cv.jobDescription}\n\n${matchNotes}`
          : `Tailor this CV specifically for a "${cv.targetRole}" role. Re-order and re-weight bullets toward what that role cares about most. Do not invent facts not present in the source data — only reframe and prioritize what's given.`;

      const prompt = `
You are a professional CV writer. Given the candidate data below, output ONLY valid JSON
(no markdown fences, no commentary) matching this shape:

{
  "headline": string,
  "summary": string,
  "topSkills": string[],
  "experience": [{ "company": string, "role": string, "period": string, "bullets": string[] }],
  "education": [{ "institution": string, "qualification": string, "period": string, "description": string | null }],
  "testimonialHighlights": [{ "author": string, "text": string }],
  "achievementHighlights": [{ "title": string, "description": string }],
  "closingNote": string
}

SUMMARY REQUIREMENTS:
Write "summary" as a polished, third-person professional biography of 5-7 sentences
(roughly 100-150 words).

EDUCATION REQUIREMENTS:
For each education entry, set "description" to the source entry's "description" field
copied VERBATIM when present.

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

      const parsed = await callOpenRouter(apiKey, prompt);

      await ctx.runMutation(internal.cvs._saveGeneratedContent, {
        cvId: args.cvId,
        generatedContent: parsed,
        style: args.style ?? "neutral",
        layout: args.layout ?? "centered",
        label: cv.isNeutral
          ? "Neutral"
          : cv.targetRole
            ? String(cv.targetRole)
            : undefined,
        matchAnalysis: matchAnalysisPayload,
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
