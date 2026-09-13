import type { Child } from "@/lib/types";

/** Re-assess every 4 weeks (§3). */
export const REASSESS_AFTER_DAYS = 28;

/**
 * True when the child has never taken the skill check, or the last one is older than 28 days.
 * Pass `now` (ms) to make the check deterministic in tests.
 */
export function assessmentDue(child: Pick<Child, "skillProfile">, now: number = Date.now()): boolean {
  const profile = child.skillProfile;
  if (!profile) return true;
  const assessedAt = Date.parse(profile.assessedAt);
  if (Number.isNaN(assessedAt)) return true;
  return now - assessedAt > REASSESS_AFTER_DAYS * 24 * 60 * 60 * 1000;
}

/** Whole days since the last assessment, or null if never assessed. */
export function daysSinceAssessment(child: Pick<Child, "skillProfile">, now: number = Date.now()): number | null {
  const profile = child.skillProfile;
  if (!profile) return null;
  const assessedAt = Date.parse(profile.assessedAt);
  if (Number.isNaN(assessedAt)) return null;
  return Math.floor((now - assessedAt) / (24 * 60 * 60 * 1000));
}
