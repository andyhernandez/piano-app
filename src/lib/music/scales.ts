import type { PitchClass, Scale, ScaleId, ScaleMode, Triad } from "../types";
import { FLAT_NAMES, SHARP_NAMES, pcIndex, pcToMidi, prettyPc } from "./notes";

const INTERVALS: Record<ScaleMode, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  "natural-minor": [0, 2, 3, 5, 7, 8, 10],
  "harmonic-minor": [0, 2, 3, 5, 7, 8, 11],
};

/** Key signature accidental count for the tonic (major) or relative (minor). */
const MAJOR_ACCIDENTALS: Record<string, number> = {
  C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, "F#": 6, "C#": 7,
  F: -1, Bb: -2, Eb: -3, Ab: -4, Db: -5, Gb: -6, Cb: -7,
};

const MINOR_ACCIDENTALS: Record<string, number> = {
  A: 0, E: 1, B: 2, "F#": 3, "C#": 4, "G#": 5,
  D: -1, G: -2, C: -3, F: -4, Bb: -5, Eb: -6,
};

/**
 * Standard two-octave fingerings for the scales in the default roadmap.
 * Each array has 15 entries (ascending, tonic to tonic two octaves up).
 * Thumb-under indices mark where the thumb crosses (RH ascending) or 3rd/4th crosses over (LH ascending).
 */
const RH_STANDARD = [1, 2, 3, 1, 2, 3, 4, 1, 2, 3, 1, 2, 3, 4, 5];
const LH_STANDARD = [5, 4, 3, 2, 1, 3, 2, 1, 4, 3, 2, 1, 3, 2, 1];

const FINGERINGS: Record<string, { rh: number[]; lh: number[] }> = {
  // Standard group: C G D A E and minors A E use the standard pattern.
  "C-major": { rh: RH_STANDARD, lh: LH_STANDARD },
  "G-major": { rh: RH_STANDARD, lh: LH_STANDARD },
  "D-major": { rh: RH_STANDARD, lh: LH_STANDARD },
  "A-major": { rh: RH_STANDARD, lh: LH_STANDARD },
  "E-major": { rh: RH_STANDARD, lh: LH_STANDARD },
  "A-natural-minor": { rh: RH_STANDARD, lh: LH_STANDARD },
  "A-harmonic-minor": { rh: RH_STANDARD, lh: LH_STANDARD },
  "E-natural-minor": { rh: RH_STANDARD, lh: LH_STANDARD },
  "E-harmonic-minor": { rh: RH_STANDARD, lh: LH_STANDARD },
  // F major: RH 1234 123 1234 1234? Standard RH: 1 2 3 4 1 2 3 | 1 2 3 4 1 2 3 4. LH standard.
  "F-major": { rh: [1, 2, 3, 4, 1, 2, 3, 1, 2, 3, 4, 1, 2, 3, 4], lh: LH_STANDARD },
  // Bb major: RH 2 1 2 3 1 2 3 4 1 2 3 1 2 3 4 ; LH 3 2 1 4 3 2 1 3 2 1 4 3 2 1 2
  "Bb-major": { rh: [2, 1, 2, 3, 1, 2, 3, 4, 1, 2, 3, 1, 2, 3, 4], lh: [3, 2, 1, 4, 3, 2, 1, 3, 2, 1, 4, 3, 2, 1, 2] },
  // Eb major: RH 3 1 2 3 4 1 2 3 1 2 3 4 1 2 3 ; LH 3 2 1 4 3 2 1 3 2 1 4 3 2 1 2
  "Eb-major": { rh: [3, 1, 2, 3, 4, 1, 2, 3, 1, 2, 3, 4, 1, 2, 3], lh: [3, 2, 1, 4, 3, 2, 1, 3, 2, 1, 4, 3, 2, 1, 2] },
  // Ab major: RH 3 4 1 2 3 1 2 3 4 1 2 3 1 2 3 ; LH 3 2 1 4 3 2 1 3 2 1 4 3 2 1 2
  "Ab-major": { rh: [3, 4, 1, 2, 3, 1, 2, 3, 4, 1, 2, 3, 1, 2, 3], lh: [3, 2, 1, 4, 3, 2, 1, 3, 2, 1, 4, 3, 2, 1, 2] },
  // Db major: RH 2 3 1 2 3 4 1 2 3 1 2 3 4 1 2 ; LH 3 2 1 4 3 2 1 3 2 1 4 3 2 1 2
  "Db-major": { rh: [2, 3, 1, 2, 3, 4, 1, 2, 3, 1, 2, 3, 4, 1, 2], lh: [3, 2, 1, 4, 3, 2, 1, 3, 2, 1, 4, 3, 2, 1, 2] },
};

function thumbCrossings(fingering: number[], hand: "RH" | "LH"): number[] {
  const out: number[] = [];
  for (let i = 1; i < fingering.length; i++) {
    if (hand === "RH" && fingering[i] === 1 && fingering[i - 1] > 1) out.push(i);
    if (hand === "LH" && fingering[i - 1] === 1 && fingering[i] > 1) out.push(i);
  }
  return out;
}

export function scaleSlug(id: ScaleId): string {
  return `${id.key}-${id.mode}`;
}

export function parseScaleSlug(slug: string): ScaleId {
  const idx = slug.indexOf("-");
  return { key: slug.slice(0, idx) as PitchClass, mode: slug.slice(idx + 1) as ScaleMode };
}

export function scaleName(id: ScaleId): string {
  const mode = id.mode === "major" ? "major" : id.mode === "natural-minor" ? "minor" : "harmonic minor";
  return `${prettyPc(id.key)} ${mode}`;
}

export function prefersFlats(id: ScaleId): boolean {
  const acc = id.mode === "major" ? MAJOR_ACCIDENTALS[id.key] : MINOR_ACCIDENTALS[id.key];
  return (acc ?? 0) < 0 || id.key.includes("b");
}

/** Spell a pitch class inside the scale's key (sharps or flats). */
export function spellInScale(midi: number, id: ScaleId): PitchClass {
  const names = prefersFlats(id) ? FLAT_NAMES : SHARP_NAMES;
  return names[((midi % 12) + 12) % 12];
}

const TRIAD_ROMANS_MAJOR = ["I", "ii", "iii", "IV", "V", "vi", "vii°"];
const TRIAD_ROMANS_MINOR = ["i", "ii°", "III", "iv", "v", "VI", "VII"];
const TRIAD_ROMANS_HARMONIC = ["i", "ii°", "III+", "iv", "V", "VI", "vii°"];

function triadQuality(third: number, fifth: number): Triad["quality"] {
  if (third === 4 && fifth === 7) return "major";
  if (third === 3 && fifth === 7) return "minor";
  if (third === 3 && fifth === 6) return "diminished";
  return "augmented";
}

function romanFor(mode: ScaleMode, degree: number, quality: Triad["quality"]): string {
  const base = (mode === "major" ? TRIAD_ROMANS_MAJOR : mode === "natural-minor" ? TRIAD_ROMANS_MINOR : TRIAD_ROMANS_HARMONIC)[degree];
  // Sanity: romans above already encode the quality. Keep base but ensure ° for dim.
  if (quality === "diminished" && !base.includes("°")) return base + "°";
  return base;
}

export function buildScale(id: ScaleId): Scale {
  const intervals = INTERVALS[id.mode];
  const tonicIdx = pcIndex(id.key);
  const flats = prefersFlats(id);
  const names = flats ? FLAT_NAMES : SHARP_NAMES;
  const notes = intervals.map((i) => names[(tonicIdx + i) % 12]);
  const tonicMidi = pcToMidi(id.key, 4);
  const midiOneOctave = [...intervals.map((i) => tonicMidi + i), tonicMidi + 12];
  const fing = FINGERINGS[scaleSlug(id)] ?? { rh: RH_STANDARD, lh: LH_STANDARD };
  const accidentals = id.mode === "major" ? (MAJOR_ACCIDENTALS[id.key] ?? 0) : (MINOR_ACCIDENTALS[id.key] ?? 0);

  const triads: Triad[] = intervals.map((_, degree) => {
    const root = intervals[degree];
    const third = intervals[(degree + 2) % 7] + (degree + 2 >= 7 ? 12 : 0) - root;
    const fifth = intervals[(degree + 4) % 7] + (degree + 4 >= 7 ? 12 : 0) - root;
    const quality = triadQuality(third, fifth);
    const rootMidi = tonicMidi + root;
    return {
      degree: (degree + 1) as Triad["degree"],
      roman: romanFor(id.mode, degree, quality),
      root: notes[degree],
      quality,
      midi: [rootMidi, rootMidi + third, rootMidi + fifth],
    };
  });

  const vexKey = id.mode === "major" ? id.key : `${id.key}m`;

  return {
    ...id,
    name: scaleName(id),
    notes,
    midiOneOctave,
    fingeringRH: fing.rh,
    fingeringLH: fing.lh,
    thumbUnderRH: thumbCrossings(fing.rh, "RH"),
    thumbUnderLH: thumbCrossings(fing.lh, "LH"),
    accidentals,
    vexKey,
    triads,
  };
}

/** Two octaves ascending then descending (29 notes), starting at the given octave. */
export function scaleRunMidi(scale: Scale, startOctave = 4, octaves = 2): number[] {
  const tonic = pcToMidi(scale.key, startOctave);
  const intervals = INTERVALS[scale.mode];
  const up: number[] = [];
  for (let o = 0; o < octaves; o++) for (const i of intervals) up.push(tonic + o * 12 + i);
  up.push(tonic + octaves * 12);
  const down = [...up].reverse().slice(1);
  return [...up, ...down];
}

export function isInScale(midi: number, scale: ScaleId): boolean {
  const rel = (((midi - pcIndex(scale.key)) % 12) + 12) % 12;
  return INTERVALS[scale.mode].includes(rel);
}

/** Scale degree (1-7) of a MIDI note, or null if not in scale. */
export function degreeOf(midi: number, scale: ScaleId): number | null {
  const rel = (((midi - pcIndex(scale.key)) % 12) + 12) % 12;
  const idx = INTERVALS[scale.mode].indexOf(rel);
  return idx === -1 ? null : idx + 1;
}

/** MIDI for a scale degree (1-based, may exceed 7 to go up octaves) starting at octave. */
export function degreeToMidi(degree: number, scale: ScaleId, octave = 4): number {
  const intervals = INTERVALS[scale.mode];
  const d = degree - 1;
  const oct = Math.floor(d / 7);
  const idx = ((d % 7) + 7) % 7;
  return pcToMidi(scale.key, octave) + oct * 12 + intervals[idx];
}

/** Primary triads I, IV, V plus vi (or the minor equivalents). */
export function primaryTriads(scale: Scale): Triad[] {
  return [scale.triads[0], scale.triads[3], scale.triads[4], scale.triads[5]];
}

export function invertTriad(midi: [number, number, number], inversion: 0 | 1 | 2): [number, number, number] {
  if (inversion === 0) return midi;
  if (inversion === 1) return [midi[1], midi[2], midi[0] + 12];
  return [midi[2], midi[0] + 12, midi[1] + 12];
}

export const SCALE_MODES: ScaleMode[] = ["major", "natural-minor", "harmonic-minor"];
export const ROADMAP_KEYS_MAJOR: PitchClass[] = ["C", "G", "D", "A", "E", "F", "Bb", "Eb", "Ab", "Db"];
