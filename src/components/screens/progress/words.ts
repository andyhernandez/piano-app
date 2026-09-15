import type { Child, Session } from "@/lib/types";
import { cleanScaleTempos, aheadOfBeatMs, weeksSince, monthName } from "@/lib/engine/record";

const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];

/** "Twelve", "three", "24" — words up to twenty, digits after. */
export function numberWord(n: number, capital = false): string {
  const w = n >= 0 && n <= 20 ? WORDS[n] : String(n);
  return capital ? w.charAt(0).toUpperCase() + w.slice(1) : w;
}

/** The record's headline: a count of weeks and the facts that changed. Nothing here is praise. */
export function progressHeadline(child: Child, sessions: Session[]): string {
  if (!sessions.length) return "Nothing on the record yet.";
  const weeks = weeksSince(child.createdAt);
  const facts: string[] = [];
  const tempos = cleanScaleTempos(sessions);
  if (tempos.length > 1 && tempos[tempos.length - 1].bpm > tempos[0].bpm) facts.push("faster");
  const drift = driftTrend(sessions);
  if (drift === "steadier") facts.push("steadier");
  const levelsUp = child.settings.readingLevel - 1;
  if (levelsUp > 0) facts.push(`reading ${levelsUp === 1 ? "one level" : `${numberWord(levelsUp)} levels`} higher`);
  const lead = weeks === 1 ? "One week in" : `${numberWord(weeks, true)} weeks in`;
  if (!facts.length) return `${lead}. ${numberWord(sessions.length, true)} ${sessions.length === 1 ? "session" : "sessions"} on the record.`;
  return `${lead}: ${facts.join(", ")}.`;
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

/** The caption under the tempo chart: the change since the first clean run, and where the plateaus were. */
export function tempoCaption(sessions: Session[]): string {
  const tempos = cleanScaleTempos(sessions);
  if (!tempos.length) return "A clean run is every note right at the set tempo. The first one starts the line.";
  if (tempos.length === 1) return `One clean run so far, at ${tempos[0].bpm} bpm. The line starts with the second.`;
  const first = tempos[0];
  const last = tempos[tempos.length - 1];
  const delta = last.bpm - first.bpm;
  let keyChanges = 0;
  for (let i = 1; i < tempos.length; i++) if (tempos[i].scale.key !== tempos[i - 1].scale.key || tempos[i].scale.mode !== tempos[i - 1].scale.mode) keyChanges++;
  const since = monthName(first.date);
  const head = delta > 0 ? `Up ${delta} bpm since ${since}` : delta < 0 ? `Down ${-delta} bpm since ${since}` : `Holding at ${last.bpm} bpm since ${since}`;
  if (!keyChanges) return `${head}, all in one key.`;
  return `${head}, across ${keyChanges === 1 ? "one new key" : `${numberWord(keyChanges)} new keys`} — the dots mark the first run in each.`;
}
