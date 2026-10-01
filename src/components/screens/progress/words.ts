import type { Child, Session } from "@/lib/types";
import { cleanScaleTempos, aheadOfBeatMs, weeksSince, monthName } from "@/lib/engine/record";
import { tempoStaircase } from "./tempo-chart";

const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];

/** "Twelve", "three", "24" — words up to twenty, digits after. */
export function numberWord(n: number, capital = false): string {
  const w = n >= 0 && n <= 20 ? WORDS[n] : String(n);
  return capital ? w.charAt(0).toUpperCase() + w.slice(1) : w;
}

/** The record's headline: how long they have been playing. A scrapbook, never a score. */
export function progressHeadline(child: Child, sessions: Session[]): string {
  if (!sessions.length) return "Nothing on the record yet.";
  const weeks = Math.max(1, weeksSince(child.createdAt));
  if (weeks === 1) return "One week of playing.";
  return `${numberWord(weeks, true)} weeks of playing.`;
}

/** The second line under the headline: the facts that changed, if any. */
export function progressFacts(child: Child, sessions: Session[]): string | null {
  if (!sessions.length) return null;
  const facts: string[] = [];
  const tempos = cleanScaleTempos(sessions);
  if (tempos.length > 1 && tempos[tempos.length - 1].bpm > tempos[0].bpm) facts.push("faster");
  if (driftTrend(sessions) === "steadier") facts.push("steadier");
  const levelsUp = child.settings.readingLevel - 1;
  if (levelsUp > 0) facts.push(`reading ${levelsUp === 1 ? "one level" : `${numberWord(levelsUp)} levels`} higher`);
  return facts.length ? `Since you started: ${facts.join(", ")}.` : null;
}

/** Whether timing drift shrank between the first and last measured timing block. */
export function driftTrend(sessions: Session[]): "steadier" | "same" | "looser" | null {
  const ordered = sessions.slice().sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const firstHalf = ordered.slice(0, Math.ceil(ordered.length / 2));
  const secondHalf = ordered.slice(Math.ceil(ordered.length / 2));
  const a = aheadOfBeatMs(firstHalf);
  const b = aheadOfBeatMs(secondHalf);
  if (a == null || b == null) return null;
  if (Math.abs(b) < Math.abs(a) - 2) return "steadier";
  if (Math.abs(b) > Math.abs(a) + 2) return "looser";
  return "same";
}

/** The caption under the staircase: the climb since the first clean run, where it went flat, and the latest bests. */
export function tempoCaption(sessions: Session[]): string {
  const tempos = cleanScaleTempos(sessions);
  if (!tempos.length) return "A clean run is every note right at the set tempo. The first one starts the stairs.";
  if (tempos.length === 1) return `One clean run so far, at ${tempos[0].bpm} bpm. The next week adds a step.`;
  const bars = tempoStaircase(tempos);
  const first = tempos[0];
  const last = bars[bars.length - 1];
  const delta = last.bpm - bars[0].bpm;
  const since = monthName(first.date);
  const head = delta > 0 ? `Up ${delta} bpm since ${since}` : `Holding at ${last.bpm} bpm since ${since}`;
  const flats: number[] = [];
  bars.forEach((b, i) => { if (b.tone === "lilac") flats.push(i + 1); });
  const flatText = flats.length ? ` Flat in ${flats.length === 1 ? `week ${flats[0]}` : `weeks ${flats[0]}–${flats[flats.length - 1]}`}.` : "";
  let streak = 0;
  for (let i = bars.length - 1; i > 0 && bars[i].bpm > bars[i - 1].bpm; i--) streak++;
  const bestText = streak >= 2 ? ` ${numberWord(streak, true)} new bests in a row.` : last.tone === "sun" ? " The latest week is a new best." : "";
  return `${head}.${flatText}${bestText}`;
}
