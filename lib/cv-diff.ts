// lib/cv-diff.ts
import type {
  GeneratedCvContent,
  GeneratedExperienceEntry,
} from "@/lib/cv-types";

export interface DiffOpItem<T> {
  op: "equal" | "add" | "remove";
  value: T;
}

/** Generic LCS-based diff. Fine for CV-length inputs (dozens of tokens
 *  per field) --- this is O(n*m), don't reuse it on long documents. */
function lcsDiff<T>(
  a: T[],
  b: T[],
  eq: (x: T, y: T) => boolean = (x, y) => x === y,
): DiffOpItem<T>[] {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array(m + 1).fill(0),
  );
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = eq(a[i], b[j])
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops: DiffOpItem<T>[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (eq(a[i], b[j])) {
      ops.push({ op: "equal", value: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ op: "remove", value: a[i] });
      i++;
    } else {
      ops.push({ op: "add", value: b[j] });
      j++;
    }
  }
  while (i < n) ops.push({ op: "remove", value: a[i++] });
  while (j < m) ops.push({ op: "add", value: b[j++] });
  return ops;
}

function tokenizeWords(s: string): string[] {
  // Keep whitespace as its own tokens so re-joining preserves spacing.
  return s.split(/(\s+)/).filter((t) => t.length > 0);
}

export function diffWords(
  a: string | undefined,
  b: string | undefined,
): DiffOpItem<string>[] {
  return lcsDiff(tokenizeWords(a ?? ""), tokenizeWords(b ?? ""));
}

export function diffStringList(
  a: string[] = [],
  b: string[] = [],
): DiffOpItem<string>[] {
  return lcsDiff(
    a,
    b,
    (x, y) => x.trim().toLowerCase() === y.trim().toLowerCase(),
  );
}

export interface ExperienceDiffEntry {
  status: "unchanged" | "added" | "removed" | "modified";
  company: string;
  oldEntry?: GeneratedExperienceEntry;
  newEntry?: GeneratedExperienceEntry;
  roleDiff?: DiffOpItem<string>[];
  bulletsDiff?: DiffOpItem<string>[];
}

/** Matches entries by company (case-insensitive) so a reordered or
 *  reworded timeline --- the whole point of retailoring --- still
 *  diffs per-role instead of reading as wholesale add/remove. */
export function diffExperience(
  oldExp: GeneratedExperienceEntry[] = [],
  newExp: GeneratedExperienceEntry[] = [],
): ExperienceDiffEntry[] {
  const norm = (s: string) => s.trim().toLowerCase();
  const oldByCompany = new Map(oldExp.map((e) => [norm(e.company), e]));
  const usedOld = new Set<string>();
  const results: ExperienceDiffEntry[] = [];

  for (const ne of newExp) {
    const key = norm(ne.company);
    const oe = oldByCompany.get(key);
    if (!oe) {
      results.push({ status: "added", company: ne.company, newEntry: ne });
      continue;
    }
    usedOld.add(key);
    const roleDiff = diffWords(oe.role, ne.role);
    const bulletsDiff = diffStringList(oe.bullets, ne.bullets);
    const changed =
      roleDiff.some((t) => t.op !== "equal") ||
      bulletsDiff.some((t) => t.op !== "equal") ||
      oe.period !== ne.period;
    results.push({
      status: changed ? "modified" : "unchanged",
      company: ne.company,
      oldEntry: oe,
      newEntry: ne,
      roleDiff,
      bulletsDiff,
    });
  }

  for (const oe of oldExp) {
    if (!usedOld.has(norm(oe.company))) {
      results.push({ status: "removed", company: oe.company, oldEntry: oe });
    }
  }

  return results;
}

export interface CvContentDiff {
  headline: DiffOpItem<string>[];
  summary: DiffOpItem<string>[];
  topSkills: DiffOpItem<string>[];
  experience: ExperienceDiffEntry[];
  closingNote: DiffOpItem<string>[];
}

export function diffGeneratedCvContent(
  oldG: GeneratedCvContent | undefined,
  newG: GeneratedCvContent | undefined,
): CvContentDiff {
  return {
    headline: diffWords(oldG?.headline, newG?.headline),
    summary: diffWords(oldG?.summary, newG?.summary),
    topSkills: diffStringList(oldG?.topSkills, newG?.topSkills),
    experience: diffExperience(oldG?.experience, newG?.experience),
    closingNote: diffWords(oldG?.closingNote, newG?.closingNote),
  };
}
