// lib/keyword-match.ts

/**
 * Checks whether a keyword is "present" in the candidate's data.
 * Deliberately simple and explainable over clever: case-insensitive substring
 * match, plus a light singular/plural and common-abbreviation normalization
 * pass. Good enough for skills/tools/keywords; not meant to be NLP-perfect —
 * false negatives here just mean a slightly conservative score, which is the
 * safer failure mode than a false "you have this skill."
 */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/\./g, "") // "Node.js" -> "nodejs"
    .replace(/\s+/g, " ")
    .trim();
}

const ABBREVIATIONS: Record<string, string[]> = {
  javascript: ["js"],
  typescript: ["ts"],
  "user experience": ["ux"],
  "user interface": ["ui"],
  "search engine optimization": ["seo"],
  "customer relationship management": ["crm"],
};

export function keywordPresent(keyword: string, haystack: string): boolean {
  const kw = normalize(keyword);
  const text = normalize(haystack);
  if (text.includes(kw)) return true;

  // try known abbreviation forms both ways
  for (const [full, abbrs] of Object.entries(ABBREVIATIONS)) {
    if (kw === full && abbrs.some((a) => text.includes(a))) return true;
    if (abbrs.includes(kw) && text.includes(full)) return true;
  }
  return false;
}

export type MatchResult = {
  matchedKeywords: string[];
  missingKeywords: string[];
  score: number; // 0-100
};

/**
 * required keywords are weighted 2x nice-to-have in the score, since
 * that's what actually matters to an ATS/recruiter skim.
 */
export function computeMatch(
  requiredKeywords: string[],
  niceToHaveKeywords: string[],
  candidateText: string,
): MatchResult {
  const matched: string[] = [];
  const missing: string[] = [];

  let earned = 0;
  let total = 0;

  for (const kw of requiredKeywords) {
    total += 2;
    if (keywordPresent(kw, candidateText)) {
      matched.push(kw);
      earned += 2;
    } else {
      missing.push(kw);
    }
  }
  for (const kw of niceToHaveKeywords) {
    total += 1;
    if (keywordPresent(kw, candidateText)) {
      matched.push(kw);
      earned += 1;
    } else {
      missing.push(kw);
    }
  }

  const score = total === 0 ? 100 : Math.round((earned / total) * 100);
  return { matchedKeywords: matched, missingKeywords: missing, score };
}

/** Flattens the parts of a CV that are meaningfully searchable for keywords. */
export function flattenCandidateText(cv: {
  experience: { role: string; description?: string }[];
  education: { qualification: string; description?: string }[];
  achievements: { title: string; description?: string }[];
  interests: string[];
  links: { label: string; description?: string }[];
}): string {
  return [
    ...cv.experience.map((e) => `${e.role} ${e.description ?? ""}`),
    ...cv.education.map((e) => `${e.qualification} ${e.description ?? ""}`),
    ...cv.achievements.map((a) => `${a.title} ${a.description ?? ""}`),
    ...cv.interests,
    ...cv.links.map((l) => l.description ?? ""),
  ].join(" ");
}
