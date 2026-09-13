import type { Streak } from "../types";
import { addDays, daysBetween } from "../utils/date";

export const MAX_FREEZES = 2;
export const FREEZE_EVERY_DAYS = 5;

export function emptyStreak(): Streak {
  return { current: 0, best: 0, freezes: 0, lastActiveDate: null, freezeDates: [], daysSinceFreezeEarned: 0 };
}

/**
 * Reconcile the streak with the calendar. Call at app open and before recording a session.
 * Any gap day between lastActiveDate and today is covered by a freeze if available; otherwise the streak resets.
 * Today itself is never a gap (the kid still has time to practise).
 */
export function reconcile(streak: Streak, today: string): Streak {
  if (!streak.lastActiveDate) return streak;
  const gap = daysBetween(streak.lastActiveDate, today) - 1; // days strictly between
  if (gap <= 0) return streak;
  const s: Streak = { ...streak, freezeDates: [...streak.freezeDates] };
  let cursor = streak.lastActiveDate;
  for (let i = 0; i < gap; i++) {
    cursor = addDays(cursor, 1);
    if (s.freezes > 0) {
      s.freezes--;
      s.freezeDates.push(cursor);
      s.lastActiveDate = cursor;
    } else {
      s.current = 0;
      s.daysSinceFreezeEarned = 0;
      s.lastActiveDate = null;
      return s;
    }
  }
  return s;
}

/** Record a practice day. Idempotent for the same date. */
export function recordPractice(streak: Streak, today: string): { streak: Streak; earnedFreeze: boolean } {
  const s = reconcile(streak, today);
  if (s.lastActiveDate === today) return { streak: s, earnedFreeze: false };
  const next: Streak = { ...s, freezeDates: [...s.freezeDates] };
  next.current = s.lastActiveDate && daysBetween(s.lastActiveDate, today) === 1 ? s.current + 1 : s.current === 0 ? 1 : s.current + 1;
  if (!s.lastActiveDate) next.current = 1;
  next.best = Math.max(next.best, next.current);
  next.lastActiveDate = today;
  next.daysSinceFreezeEarned = s.daysSinceFreezeEarned + 1;
  let earnedFreeze = false;
  if (next.daysSinceFreezeEarned >= FREEZE_EVERY_DAYS) {
    next.daysSinceFreezeEarned = 0;
    if (next.freezes < MAX_FREEZES) {
      next.freezes++;
      earnedFreeze = true;
    }
  }
  return { streak: next, earnedFreeze };
}

export function grantFreeze(streak: Streak): Streak {
  return { ...streak, freezes: Math.min(MAX_FREEZES, streak.freezes + 1) };
}
