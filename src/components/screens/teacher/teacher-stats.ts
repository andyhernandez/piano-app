import type { BlockType, Child, Session } from "@/lib/types";
import { addDays, weekKey } from "@/lib/utils/date";
import { timeByDiscipline } from "@/lib/engine/record";

export interface FourWeeks {
  window: Session[];
  daysPracticed: number;
  minutes: number;
  readingLevel: number;
  /** Whole weeks (counting this one) the reading level has been the same across sessions. */
  weeksHeld: number;
  /** Mean absolute timing deviation in ms across rhythm blocks, or null when nothing measured. */
  driftMs: number | null;
  byDiscipline: { type: BlockType; minutes: number; pct: number }[];
  smallest: BlockType | null;
}

/** The figures a teacher reads before the lesson: the last 28 days. */
export function fourWeeks(child: Child, sessions: Session[], today: string): FourWeeks {
  const from = addDays(today, -27);
  const window = sessions.filter((s) => s.date >= from && s.date <= today);
  const days = new Set(window.map((s) => s.date));
  const minutes = Math.round(window.reduce((a, s) => a + s.durationSec / 60, 0));
  const readingLevel = child.settings.readingLevel;

  const byWeek = new Map<string, number[]>();
  for (const s of window) {
    const lvl = s.blocks.find((b) => b.type === "reading")?.details?.level;
    if (typeof lvl === "number") byWeek.set(weekKey(s.date), [...(byWeek.get(weekKey(s.date)) ?? []), lvl]);
  }
  let weeksHeld = 0;
  let cursor = today;
  for (let i = 0; i < 4; i++) {
    const levels = byWeek.get(weekKey(cursor));
    if (!levels || !levels.every((l) => l === readingLevel)) break;
    weeksHeld++;
    cursor = addDays(cursor, -7);
  }

  const drifts = window.flatMap((s) => s.blocks.filter((b) => b.type === "rhythm").map((b) => b.midiScore?.components?.avgDeviationMs)).filter((d): d is number => typeof d === "number");
  const driftMs = drifts.length ? Math.round(drifts.reduce((a, b) => a + b, 0) / drifts.length) : null;

  const byDiscipline = timeByDiscipline(window);
  const withTime = byDiscipline.filter((d) => d.minutes > 0);
  const smallest = withTime.length ? withTime[withTime.length - 1].type : null;
  return { window, daysPracticed: days.size, minutes, readingLevel, weeksHeld, driftMs, byDiscipline, smallest };
}
