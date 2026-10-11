import type { Scale, Triad } from "../types";
import { degreeToMidi, scaleRunMidi } from "./scales";
import { daysBetween } from "../utils/date";

/*
 * The Technique stop's exercises. The scale of the week, two octaves up and back, and Hanon figures played
 * in that same key: each figure is written as scale degrees, so "Hanon 1" in G major walks G B C D E D C B,
 * then A C D E F♯ E D C, and so on — the finger pattern of the book, the notes of the week.
 */

export type ExerciseId = "scale" | "hanon1" | "hanon2";
export type Hand = "RH" | "LH" | "both";
export const EXERCISE_ORDER: ExerciseId[] = ["scale", "hanon1", "hanon2"];

export interface ExercisePage { start: number; count: number; label: "UP" | "BACK"; value: "eighth" | "whole" }

export interface TechniqueExercise {
  id: ExerciseId;
  /** "Scale", "Hanon 1". */
  title: string;
  /** The header's span: "two octaves", "one octave". */
  meta: string;
  /** The notes for this hand, in order. Hands together is measured on the right hand. */
  notes: number[];
  /** Finger for each note. */
  fingers: number[];
  /** The staff shows one page at a time: two bars of eighths, or the final held note. */
  pages: ExercisePage[];
  /** Which half of the finger chart a note belongs to: 0 for the way up, 1 for the way back. */
  bucket: (i: number) => 0 | 1;
}

/** Hanon's first figures as offsets from each group's starting degree. The way back is the mirror image. */
const HANON: Record<Exclude<ExerciseId, "scale">, { figure: number[] }> = {
  hanon1: { figure: [0, 2, 3, 4, 5, 4, 3, 2] },
  hanon2: { figure: [0, 2, 5, 4, 3, 4, 3, 2] },
};
const GROUPS = 7;
const PAGE = 16;

export const EXERCISE_TITLES: Record<ExerciseId, string> = { scale: "Scale", hanon1: "Hanon 1", hanon2: "Hanon 2" };

/** Alternate the two Hanon figures day by day, so a week sees both. */
export function hanonForDate(dateKey: string): ExerciseId {
  return Math.abs(daysBetween("2026-01-01", dateKey)) % 2 === 0 ? "hanon1" : "hanon2";
}

export function techniqueExercise(id: ExerciseId, scale: Scale, hand: Hand): TechniqueExercise {
  if (id === "scale") {
    const f = hand === "LH" ? scale.fingeringLH : scale.fingeringRH;
    return {
      id, title: EXERCISE_TITLES.scale, meta: "two octaves",
      notes: scaleRunMidi(scale, hand === "LH" ? 2 : 4, 2),
      fingers: [...f, ...f.slice(0, -1).reverse()],
      pages: [{ start: 0, count: 15, label: "UP", value: "eighth" }, { start: 14, count: 15, label: "BACK", value: "eighth" }],
      bucket: (i) => (i < 15 ? (i < 8 ? 0 : 1) : i < 22 ? 1 : 0),
    };
  }
  const { figure } = HANON[id];
  const octave = hand === "LH" ? 2 : 4;
  // The finger for an offset is its rank in the five-note span: 0 → thumb (RH) or little finger (LH).
  const ranks = Array.from(new Set(figure)).sort((a, b) => a - b);
  const rank = (o: number) => ranks.indexOf(o) + 1;
  const notes: number[] = [];
  const fingers: number[] = [];
  for (let g = 0; g < GROUPS; g++) for (const o of figure) {
    notes.push(degreeToMidi(1 + g + o, scale, octave));
    fingers.push(hand === "LH" ? 6 - rank(o) : rank(o));
  }
  const turn = notes.length;
  // Back down from the fifth above the octave, the figure turned upside down, until the group that ends on the tonic's neighbours.
  for (let g = 0; g < GROUPS; g++) for (const o of figure) {
    notes.push(degreeToMidi(12 - g - o, scale, octave));
    fingers.push(hand === "LH" ? rank(o) : 6 - rank(o));
  }
  notes.push(degreeToMidi(1, scale, octave));
  fingers.push(hand === "LH" ? 5 : 1);
  const pages: ExercisePage[] = [];
  for (let s = 0; s < turn * 2; s += PAGE) pages.push({ start: s, count: PAGE, label: s < turn ? "UP" : "BACK", value: "eighth" });
  pages.push({ start: turn * 2, count: 1, label: "BACK", value: "whole" });
  return { id, title: EXERCISE_TITLES[id], meta: "one octave", notes, fingers, pages, bucket: (i) => (i < turn ? 0 : 1) };
}

/*
 * The Harmony stop's changes: what the left hand plays in each bar of the progression. Block chords on the
 * first beat, or a bar of eighths — Hanon's first figure started on the chord's root, a broken (Alberti) chord,
 * or the arpeggio up and back.
 */

export type CompPattern = "block" | "hanon" | "broken" | "arpeggio";
export const COMP_ORDER: CompPattern[] = ["block", "hanon", "broken", "arpeggio"];
export const COMP_LABELS: Record<CompPattern, string> = { block: "Block", hanon: "Hanon", broken: "Broken", arpeggio: "Arpeggio" };
export const COMP_TITLES: Record<CompPattern, string> = { block: "Block chords", hanon: "Hanon on the changes", broken: "Broken chords", arpeggio: "Arpeggios" };

/** The pattern a day opens on; the stop can switch. Block chords every fourth day, Hanon the day after. */
export function compingForDate(dateKey: string): CompPattern {
  return COMP_ORDER[Math.abs(daysBetween("2026-01-01", dateKey)) % COMP_ORDER.length];
}

/** One bar of eighths for a chord: the notes in each of the eight slots, an empty slot being a rest. */
export function compingBar(pattern: CompPattern, triad: Triad, scale: Scale): number[][] {
  const [r, t, f] = triad.midi;
  switch (pattern) {
    case "block": return [[r, t, f], [], [], [], [], [], [], []];
    case "broken": return [r, f, t, f, r, f, t, f].map((m) => [m]);
    case "arpeggio": return [[r], [t], [f], [r + 12], [f], [t], [r], []];
    case "hanon": return HANON.hanon1.figure.map((o) => [degreeToMidi(triad.degree + o, scale, 4)]);
  }
}
