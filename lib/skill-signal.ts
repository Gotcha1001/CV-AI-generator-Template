// lib/skill-signal.ts
//
// GeneratedCvContent.topSkills (lib/cv-types.ts) is a flat string[] with
// no numeric weight, so there's nothing to chart directly. This derives
// a 0-100 "relevance signal" per skill instead of fabricating numbers,
// blending:
//   - how often the skill is mentioned across the summary + experience
//     bullets (the AI tends to repeat what it judges most relevant to
//     the target role)
//   - the skill's position in topSkills (the AI already returns that
//     list in ranked order)
// This is a heuristic, not a competency assessment — the graph-stats
// layout labels it "Relevance signal", not "Skill level", for that
// reason. Shared by the web layout and the PDF builder so both charts
// agree.
import type { GeneratedCvContent } from "@/lib/cv-types";

export interface SkillSignal {
  skill: string;
  score: number; // 0-100, floored at 10 so every bar stays visible
  mentions: number;
}

export function computeSkillSignals(
  g: GeneratedCvContent | undefined,
): SkillSignal[] {
  if (!g || g.topSkills.length === 0) return [];

  const corpus = [
    g.summary,
    g.closingNote,
    ...g.experience.flatMap((e) => e.bullets),
  ]
    .join(" \n ")
    .toLowerCase();

  const raw = g.topSkills.map((skill, i) => {
    const needle = skill.toLowerCase().trim();
    const mentions = needle ? corpus.split(needle).length - 1 : 0;
    // topSkills is already ranked by the AI — give earlier entries a
    // base boost so a #1-ranked skill mentioned zero times still beats
    // one ranked last, instead of both showing as flat zero.
    const rankBoost = (g.topSkills.length - i) / g.topSkills.length;
    return { skill, mentions, weighted: mentions * 2 + rankBoost * 3 };
  });

  const max = Math.max(...raw.map((r) => r.weighted), 1);
  return raw
    .map((r) => ({
      skill: r.skill,
      mentions: r.mentions,
      score: Math.round(10 + (r.weighted / max) * 90),
    }))
    .sort((a, b) => b.score - a.score);
}

export interface ExperienceDepthPoint {
  label: string; // role, shown on the radar axis
  company: string;
  bullets: number;
}

export function computeExperienceDepth(
  g: GeneratedCvContent | undefined,
): ExperienceDepthPoint[] {
  if (!g) return [];
  return g.experience.map((e) => ({
    label: e.role,
    company: e.company,
    bullets: e.bullets.length,
  }));
}
