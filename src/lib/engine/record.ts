import type { BlockType, Child, ScaleId, Session } from "../types";
import { BLOCK_ORDER } from "../types";
import { dateKey, weekDays, weekKey, addDays, parseDateKey, daysBetween } from "../utils/date";

/** The six disciplines in the design's language. */
export const DISCIPLINE: Record<BlockType, { title: string; short: string; label: string }> = {
  scales: { title: "Technique", short: "Warm up", label: "TECHNIQUE" },
  rhythm: { title: "Timing", short: "Timing", label: "TIMING" },
  reading: { title: "Sight reading", short: "Reading", label: "READING" },
  theory: { title: "Harmony", short: "Harmony", label: "HARMONY" },
  repertoire: { title: "Pieces", short: "Pieces", label: "PIECES" },
  improv: { title: "Your own", short: "Your own", label: "YOUR OWN" },
};

export const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

export function fmtClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** "1 h 40 m", "0 h 34 m". */
export function fmtHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h} h ${String(m).padStart(2, "0")} m`;
}

export function sessionMinutes(s: Session): number {
  return Math.round(s.durationSec / 60);
}

/** Minutes played per calendar day, from sessions. */
export function minutesByDay(sessions: Session[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const s of sessions) m.set(s.date, (m.get(s.date) ?? 0) + s.durationSec / 60);
  return m;
}

/** The seven cells of a week for the WeekStrip. */
export function weekCells(child: Child, sessions: Session[], today = dateKey(), activeToday = false) {
  const days = weekDays(today);
  const mins = minutesByDay(sessions);
  return days.map((d, i) => {
    const played = mins.get(d) ?? 0;
    const isRest = child.settings.restDays.includes(i);
    if (d === today && activeToday) return { letter: DAY_LETTERS[i], state: "playing" as const, minutes: Math.round(played) };
    if (played >= 1) return { letter: DAY_LETTERS[i], state: "played" as const, minutes: Math.round(played) };
    if (d === today) return { letter: DAY_LETTERS[i], state: "today" as const };
    if (isRest) return { letter: DAY_LETTERS[i], state: "rest" as const };
    return { letter: DAY_LETTERS[i], state: "future" as const };
  });
}

/** Days practised this week vs the target. */
export function weekProgress(child: Child, sessions: Session[], today = dateKey()) {
  const days = weekDays(today);
  const mins = minutesByDay(sessions);
  const played = days.filter((d) => (mins.get(d) ?? 0) >= 1).length;
  const minutes = days.reduce((a, d) => a + (mins.get(d) ?? 0), 0);
  return { played, target: child.settings.practiceDaysPerWeek, minutes: Math.round(minutes), targetMinutes: child.settings.practiceDaysPerWeek * child.settings.sessionMinutes };
}

/** Consecutive weeks at target, counted back from the most recent completed week. */
export function weeksAtTarget(child: Child, today = dateKey()): number {
  const done = new Set(child.completedWeeks);
  let n = 0;
  let cursor = addDays(weekDays(today)[0], -7); // last week's Monday
  if (done.has(weekKey(today))) { n++; }
  while (done.has(weekKey(cursor))) { n++; cursor = addDays(cursor, -7); }
  return n;
}

/** Time by discipline as percentages (sums to 100) plus minutes. */
export function timeByDiscipline(sessions: Session[]): { type: BlockType; minutes: number; pct: number }[] {
  const totals = new Map<BlockType, number>();
  for (const s of sessions) for (const b of s.blocks) totals.set(b.type, (totals.get(b.type) ?? 0) + b.durationSec / 60);
  const all = Array.from(totals.values()).reduce((a, b) => a + b, 0) || 1;
  return BLOCK_ORDER.map((t) => ({ type: t, minutes: Math.round(totals.get(t) ?? 0), pct: Math.round(((totals.get(t) ?? 0) / all) * 100) })).sort((a, b) => b.minutes - a.minutes);
}

/** "FRI 14" style date label. */
export function dayLabel(date: string): string {
  const d = parseDateKey(date);
  return `${["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][d.getDay()]} ${String(d.getDate()).padStart(2, "0")}`;
}

/** The headline fact of a session for a log row: level held, clean scale, a drift figure, or the input. */
export function sessionHeadline(s: Session): { text: string; marked: boolean } {
  const scale = s.blocks.find((b) => b.type === "scales");
  const reading = s.blocks.find((b) => b.type === "reading");
  const rhythm = s.blocks.find((b) => b.type === "rhythm");
  if (scale?.midiScore?.badge === "clean-scale") return { text: `CLEAN SCALE${scale.details?.bpm ? ` · ${scale.details.bpm} BPM` : ""}`, marked: true };
  if (reading?.midiScore?.badge === "no-stop-reading") return { text: `LEVEL ${reading.details?.level ?? "?"} HELD`, marked: true };
  if (reading?.details?.level) return { text: `LEVEL ${reading.details.level}`, marked: false };
  if (rhythm?.midiScore?.components?.avgDeviationMs != null) return { text: `${rhythm.midiScore.components.avgDeviationMs} MS DRIFT`, marked: false };
  if (s.inputMode === "timer") return { text: "TIMER", marked: false };
  if (s.inputMode === "mic") return { text: "MIC", marked: false };
  return { text: s.completed ? "DONE" : "PARTIAL", marked: false };
}

export function completedBlocks(s: Session): number {
  return s.blocks.filter((b) => b.completed).length;
}

/** The clean-scale tempo series (bpm) by session, oldest first, for the Progress chart. `scale` is the key that run was in. */
export function cleanScaleTempos(sessions: Session[]): { date: string; bpm: number; scale: ScaleId }[] {
  return sessions
    .slice()
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
    .map((s) => {
      const b = s.blocks.find((x) => x.type === "scales");
      const bpm = typeof b?.details?.bpm === "number" ? b.details.bpm : null;
      return b?.midiScore && b.midiScore.badge === "clean-scale" && bpm ? { date: s.date, bpm, scale: s.scale } : null;
    })
    .filter((x): x is { date: string; bpm: number; scale: ScaleId } => !!x);
}

/** Best (fastest) clean scale tempo across sessions. */
export function fastestClean(sessions: Session[]): number | null {
  const t = cleanScaleTempos(sessions);
  return t.length ? Math.max(...t.map((x) => x.bpm)) : null;
}

/**
 * How far ahead of the click the last measured timing block landed, in ms. Positive = early, negative = late.
 * Blocks that only stored an unsigned deviation report it as-is. Null until a timing block has been measured.
 */
export function aheadOfBeatMs(sessions: Session[]): number | null {
  const ordered = sessions.slice().sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  for (const s of ordered) {
    const b = s.blocks.find((x) => x.type === "rhythm" && x.midiScore);
    if (!b?.midiScore) continue;
    const c = b.midiScore.components;
    const d = b.details ?? {};
    const signed = [c.aheadMs, c.meanOffsetMs, d.aheadMs, d.meanOffsetMs].find((v) => typeof v === "number");
    if (typeof signed === "number") return Math.round(signed);
    if (typeof c.avgDeviationMs === "number") return Math.round(c.avgDeviationMs);
  }
  return null;
}

/** Sessions per piece, from the Pieces block's details (`songId` or `songIds`). */
export function sessionsBySong(sessions: Session[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const s of sessions) {
    for (const b of s.blocks) {
      if (b.type !== "repertoire") continue;
      const d = b.details ?? {};
      const ids = Array.isArray(d.songIds) ? (d.songIds as unknown[]) : typeof d.songId === "string" ? [d.songId] : [];
      for (const id of ids) if (typeof id === "string") m.set(id, (m.get(id) ?? 0) + 1);
    }
  }
  return m;
}

/** Minutes for a stat tile: "41" under an hour, "1:04" from an hour up (the kit's "13:40"). */
export function fmtMinutes(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}`;
  return `${Math.floor(minutes / 60)}:${String(Math.round(minutes % 60)).padStart(2, "0")}`;
}

/** Whole weeks since an ISO date, at least 1. */
export function weeksSince(iso: string, today = dateKey()): number {
  const start = dateKey(new Date(iso));
  return Math.max(1, Math.floor(daysBetween(start, today) / 7) + 1);
}

/** "June", "September" for the month a date key falls in. */
export function monthName(date: string): string {
  return parseDateKey(date).toLocaleDateString("en-GB", { month: "long" });
}

/** "12 Sep" style short date. */
export function shortDate(date: string): string {
  const d = parseDateKey(date);
  return `${d.getDate()} ${d.toLocaleDateString("en-GB", { month: "short" })}`;
}
