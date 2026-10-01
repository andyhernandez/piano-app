import type { ScaleId } from "../types";
import { hashString, seededRandom, weightedPick } from "../utils/random";
import { degreeToMidi, prefersFlats } from "../music/scales";
import { midiToPc, prettyPc } from "../music/notes";

/*
 * Ear phrases: three to five notes from the current scale, played by the app and echoed by the player, then
 * found on the staff. Seeded like the sight-reading generator so a phrase can be replayed or tested.
 */

export interface EarLevelSpec {
  level: number;
  title: string;
  /** Notes per phrase. */
  notes: number;
  /** Largest move between neighbours, in scale degrees. */
  maxLeap: number;
  /** Scale degrees the phrase may use (1 = tonic, 8 = the octave). */
  range: [number, number];
  /** Chance of a leap (2+ degrees) when one is allowed. */
  leapChance: number;
  bpm: number;
}

export const EAR_LEVELS: EarLevelSpec[] = [
  { level: 1, title: "Three notes, next door", notes: 3, maxLeap: 1, range: [1, 5], leapChance: 0, bpm: 84 },
  { level: 2, title: "Three notes, small skips", notes: 3, maxLeap: 2, range: [1, 6], leapChance: 0.35, bpm: 88 },
  { level: 3, title: "Four notes", notes: 4, maxLeap: 2, range: [1, 8], leapChance: 0.4, bpm: 92 },
  { level: 4, title: "Four notes, bigger leaps", notes: 4, maxLeap: 4, range: [1, 8], leapChance: 0.45, bpm: 96 },
  { level: 5, title: "Five notes", notes: 5, maxLeap: 4, range: [1, 8], leapChance: 0.5, bpm: 100 },
];

export function earLevel(level: number): EarLevelSpec {
  return EAR_LEVELS[Math.max(1, Math.min(EAR_LEVELS.length, Math.round(level))) - 1];
}

export interface EarPhrase {
  seed: string;
  level: number;
  /** Scale degrees, 1-based; 8 is the tonic an octave up. */
  degrees: number[];
  midis: number[];
  bpm: number;
}

/** A phrase in the key, starting on the tonic, third or fifth, moving within the level's leap limit. */
export function generatePhrase(level: number, scale: ScaleId, seed?: string, octave = 4): EarPhrase {
  const spec = earLevel(level);
  const s = seed ?? `${Date.now()}-${Math.random()}`;
  const rng = seededRandom(hashString(s));
  const [lo, hi] = spec.range;
  const starts = [1, 3, 5].filter((d) => d >= lo && d <= hi);
  const degrees: number[] = [weightedPick(rng, starts.map((d, i) => ({ value: d, weight: i === 0 ? 3 : 1 })))];
  while (degrees.length < spec.notes) {
    const prev = degrees[degrees.length - 1];
    const leap = spec.maxLeap > 1 && rng() < spec.leapChance;
    const candidates: { value: number; weight: number }[] = [];
    for (let d = lo; d <= hi; d++) {
      const dist = Math.abs(d - prev);
      if (dist === 0 || dist > spec.maxLeap) continue;
      if (leap ? dist < 2 : dist > 1) continue;
      candidates.push({ value: d, weight: 1 });
    }
    if (!candidates.length) candidates.push({ value: prev === hi ? hi - 1 : prev + 1, weight: 1 });
    degrees.push(weightedPick(rng, candidates));
  }
  return { seed: s, level: spec.level, degrees, midis: degrees.map((d) => degreeToMidi(d, scale, octave)), bpm: spec.bpm };
}

/** "G", "F♯", "B♭" — the note's letter in the key's spelling, no octave. */
export function noteName(midi: number, scale: ScaleId): string {
  return prettyPc(midiToPc(midi, prefersFlats(scale)));
}

export type Compare = "right" | "higher" | "lower";

/** How a played note sits against the expected one. */
export function compareNote(expected: number, played: number): Compare {
  if (played === expected) return "right";
  return played > expected ? "lower" : "higher";
}

/**
 * What to say after a wrong note: the right note is higher or lower than what was played, never "wrong".
 * "The last one is higher than B."
 */
export function guidance(expected: number, played: number, scale: ScaleId, position: number, total: number): string {
  const c = compareNote(expected, played);
  const which = position === total - 1 ? "The last one" : position === 0 ? "The first one" : `Note ${position + 1}`;
  if (c === "right") return `${which} is ${noteName(expected, scale)}.`;
  return `${which} is ${c} than ${noteName(played, scale)}.`;
}

/** "up, a little down, then a jump up" — the shape of what has been played so far. */
export function contourWords(midis: number[]): string {
  if (midis.length < 2) return "";
  const parts: string[] = [];
  for (let i = 1; i < midis.length; i++) {
    const d = midis[i] - midis[i - 1];
    const size = Math.abs(d);
    const dir = d > 0 ? "up" : d < 0 ? "down" : "the same";
    parts.push(d === 0 ? "the same note" : size <= 2 ? (parts.length ? `a little ${dir}` : dir) : size <= 4 ? dir : `a jump ${dir}`);
  }
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(", ")}, then ${parts[parts.length - 1]}`;
}

const LINE_OR_SPACE = (step: number) => (step % 2 === 0 ? "line" : "space");

/**
 * Where a note sits on the treble staff relative to the one before it, in words:
 * "A sits in the space just above G". Steps: 0 is the top line, each step a half space.
 */
export function stepHint(prevMidi: number, midi: number, prevStep: number, step: number, scale: ScaleId): string {
  const name = noteName(midi, scale);
  const prev = noteName(prevMidi, scale);
  const diff = prevStep - step; // positive = higher on the page
  if (diff === 0) return `${name} sits in the same place as ${prev}.`;
  const dir = diff > 0 ? "above" : "below";
  const n = Math.abs(diff);
  const place = LINE_OR_SPACE(step);
  if (n === 1) return `${name} sits ${place === "line" ? "on the line" : "in the space"} just ${dir} ${prev}.`;
  if (n === 2) return `${name} sits one ${place} ${dir} ${prev} — skip the ${LINE_OR_SPACE(step + (diff > 0 ? 1 : -1))} in between.`;
  return `${name} is ${n} steps ${dir} ${prev}, on a ${place}.`;
}

/** The first note's hint has nothing to compare with: name the line or space. */
export function firstStepHint(midi: number, step: number, scale: ScaleId): string {
  const name = noteName(midi, scale);
  if (step === 10) return `${name} is middle C — the short line just under the staff.`;
  if (step > 8) return `${name} sits below the staff, on its own short line.`;
  if (step < 0) return `${name} sits above the staff.`;
  const fromBottom = Math.floor((8 - step) / 2) + 1;
  const ord = ["first", "second", "third", "fourth", "fifth"][fromBottom - 1] ?? `${fromBottom}th`;
  return `${name} sits ${LINE_OR_SPACE(step) === "line" ? `on the ${ord} line from the bottom` : `in the ${ord} space from the bottom`}.`;
}

const LETTERS = "CDEFGAB";

/** The note a treble-staff step names, spelled in the key: step 6 in G major is "G", step 2 is "D", step 1 is "E". */
export function stepName(step: number, scale: ScaleId & { notes?: string[] }): string {
  const absolute = 38 - step; // treble top line is F5 = 5*7 + 3
  const letter = LETTERS[((absolute % 7) + 7) % 7];
  const inKey = scale.notes?.find((n) => n[0] === letter);
  return inKey ? prettyPc(inKey as Parameters<typeof prettyPc>[0]) : letter;
}

/** "3rd" for a slot label. */
export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight"];
