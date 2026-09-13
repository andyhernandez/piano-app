export const XP_PER_BLOCK = 100;
export const XP_SESSION_BONUS = 50;
export const XP_ASSESSMENT_RETAKE = 25;

/** Companion level curve: level n needs 300*n XP cumulative-ish (gentle). */
export function companionLevel(xp: number): number {
  let level = 1;
  let need = 300;
  let remaining = xp;
  while (remaining >= need) {
    remaining -= need;
    level++;
    need = Math.round(need * 1.25);
  }
  return level;
}

export function xpToNextLevel(xp: number): { level: number; into: number; need: number } {
  let level = 1;
  let need = 300;
  let remaining = xp;
  while (remaining >= need) {
    remaining -= need;
    level++;
    need = Math.round(need * 1.25);
  }
  return { level, into: remaining, need };
}
