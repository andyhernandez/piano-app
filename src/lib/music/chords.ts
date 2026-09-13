import type { Scale, Triad, PitchClass } from "../types";
import { prettyPc } from "./notes";

/** Resolve a roman numeral chord symbol (as used in song charts) against a scale. */
export function romanToTriad(roman: string, scale: Scale): Triad | undefined {
  const norm = roman.replace("°", "").replace("+", "").toLowerCase();
  const map: Record<string, number> = { i: 0, ii: 1, iii: 2, iv: 3, v: 4, vi: 5, vii: 6 };
  const idx = map[norm];
  if (idx === undefined) return undefined;
  return scale.triads[idx];
}

export function chordSymbol(triad: Triad): string {
  const root = prettyPc(triad.root as PitchClass);
  switch (triad.quality) {
    case "major": return root;
    case "minor": return `${root}m`;
    case "diminished": return `${root}dim`;
    case "augmented": return `${root}aug`;
  }
}

export function qualityLabel(q: Triad["quality"]): string {
  return q === "major" ? "Major" : q === "minor" ? "Minor" : q === "diminished" ? "Diminished" : "Augmented";
}

/** Build a seventh chord from a triad by stacking the diatonic 7th. */
export function seventhOf(triad: Triad, scale: Scale): [number, number, number, number] {
  const degIdx = triad.degree - 1;
  const seventhDeg = (degIdx + 6) % 7;
  const seventhTriad = scale.triads[seventhDeg];
  let seventh = seventhTriad.midi[0];
  while (seventh <= triad.midi[2]) seventh += 12;
  while (seventh - triad.midi[0] > 12) seventh -= 12;
  return [...triad.midi, seventh];
}
