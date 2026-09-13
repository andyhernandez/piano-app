import type { Clef, Hand, Scale, ScaleId } from "../types";
import { buildScale, degreeToMidi } from "../music/scales";
import { hashString, seededRandom, weightedPick } from "../utils/random";

/** Note durations in quarter-note beats. */
export type Dur = 4 | 3 | 2 | 1.5 | 1 | 0.5;

export interface ExNote {
  /** MIDI number, or null for a rest. */
  midi: number | null;
  /** Second voice (LH) when hands together; null otherwise. */
  midiLH?: number | null;
  beats: Dur;
  /** Tied to the next note. */
  tie?: boolean;
  /** 0-based bar index. */
  bar: number;
  /** Beat offset within the bar (0-based, quarter beats). */
  beat: number;
}

export interface Exercise {
  seed: string;
  level: number;
  scale: ScaleId;
  timeSig: [number, number];
  bars: number;
  hands: "RH" | "LH" | "alternating" | "together";
  clefs: Clef[];
  /** Notes in play order (both hands merged in `together` mode via midiLH). */
  notes: ExNote[];
  tempo: number;
}

export interface LevelSpec {
  level: number;
  title: string;
  description: string;
  hands: Exercise["hands"];
  bars: number;
  rangeDegrees: [number, number]; // inclusive scale-degree range, 1 = tonic in the hand's home octave
  motion: { step: number; skip: number; repeat: number; leap: number };
  maxLeapSemitones: number;
  rhythms: { value: Dur; weight: number }[];
  rests: boolean;
  ties: boolean;
  accidentals: boolean;
  dotted: boolean;
  syncopation: boolean;
  lhChords: boolean;
  tempo: number;
}

/** Level ladder (§11). */
export const LEVELS: LevelSpec[] = [
  { level: 1, title: "First Steps", description: "Five-finger position, right hand, quarters and halves, stepwise.", hands: "RH", bars: 4, rangeDegrees: [1, 5], motion: { step: 1, skip: 0, repeat: 0.25, leap: 0 }, maxLeapSemitones: 2, rhythms: [{ value: 1, weight: 3 }, { value: 2, weight: 2 }], rests: false, ties: false, accidentals: false, dotted: false, syncopation: false, lhChords: false, tempo: 72 },
  { level: 2, title: "Skips", description: "Add skips of a third and whole notes.", hands: "RH", bars: 4, rangeDegrees: [1, 5], motion: { step: 1, skip: 0.5, repeat: 0.25, leap: 0 }, maxLeapSemitones: 4, rhythms: [{ value: 1, weight: 3 }, { value: 2, weight: 2 }, { value: 4, weight: 1 }], rests: false, ties: false, accidentals: false, dotted: false, syncopation: false, lhChords: false, tempo: 72 },
  { level: 3, title: "Left Hand", description: "Same rules, left hand only, bass clef.", hands: "LH", bars: 4, rangeDegrees: [1, 5], motion: { step: 1, skip: 0.5, repeat: 0.25, leap: 0 }, maxLeapSemitones: 4, rhythms: [{ value: 1, weight: 3 }, { value: 2, weight: 2 }, { value: 4, weight: 1 }], rests: false, ties: false, accidentals: false, dotted: false, syncopation: false, lhChords: false, tempo: 72 },
  { level: 4, title: "Passing the Tune", description: "Alternating hands, bar by bar.", hands: "alternating", bars: 8, rangeDegrees: [1, 5], motion: { step: 1, skip: 0.5, repeat: 0.25, leap: 0 }, maxLeapSemitones: 4, rhythms: [{ value: 1, weight: 3 }, { value: 2, weight: 2 }], rests: false, ties: false, accidentals: false, dotted: false, syncopation: false, lhChords: false, tempo: 76 },
  { level: 5, title: "Eighths", description: "Eighth notes and a full octave range.", hands: "RH", bars: 8, rangeDegrees: [1, 8], motion: { step: 1, skip: 0.6, repeat: 0.2, leap: 0.1 }, maxLeapSemitones: 7, rhythms: [{ value: 1, weight: 3 }, { value: 0.5, weight: 3 }, { value: 2, weight: 1 }], rests: false, ties: false, accidentals: false, dotted: false, syncopation: false, lhChords: false, tempo: 80 },
  { level: 6, title: "Rests & Colours", description: "Accidentals appear, and rests.", hands: "RH", bars: 8, rangeDegrees: [1, 8], motion: { step: 1, skip: 0.6, repeat: 0.2, leap: 0.15 }, maxLeapSemitones: 7, rhythms: [{ value: 1, weight: 3 }, { value: 0.5, weight: 2 }, { value: 2, weight: 1 }], rests: true, ties: false, accidentals: true, dotted: false, syncopation: false, lhChords: false, tempo: 80 },
  { level: 7, title: "Dots & Leaps", description: "Dotted rhythms and leaps up to an octave.", hands: "RH", bars: 8, rangeDegrees: [1, 8], motion: { step: 1, skip: 0.6, repeat: 0.15, leap: 0.3 }, maxLeapSemitones: 12, rhythms: [{ value: 1, weight: 3 }, { value: 0.5, weight: 2 }, { value: 1.5, weight: 1.5 }, { value: 2, weight: 1 }], rests: true, ties: false, accidentals: true, dotted: true, syncopation: false, lhChords: false, tempo: 84 },
  { level: 8, title: "Hands Together", description: "Right hand melody with simple bass roots.", hands: "together", bars: 8, rangeDegrees: [1, 8], motion: { step: 1, skip: 0.5, repeat: 0.2, leap: 0.15 }, maxLeapSemitones: 7, rhythms: [{ value: 1, weight: 3 }, { value: 2, weight: 2 }, { value: 0.5, weight: 1 }], rests: false, ties: false, accidentals: false, dotted: false, syncopation: false, lhChords: false, tempo: 76 },
  { level: 9, title: "Two Octaves", description: "Wide range, ties and syncopation.", hands: "together", bars: 16, rangeDegrees: [1, 15], motion: { step: 1, skip: 0.6, repeat: 0.15, leap: 0.3 }, maxLeapSemitones: 12, rhythms: [{ value: 1, weight: 3 }, { value: 0.5, weight: 3 }, { value: 1.5, weight: 1.5 }, { value: 2, weight: 1 }], rests: true, ties: true, accidentals: true, dotted: true, syncopation: true, lhChords: false, tempo: 88 },
  { level: 10, title: "Grand Staff", description: "Block chords in the left hand under a moving melody.", hands: "together", bars: 16, rangeDegrees: [1, 15], motion: { step: 1, skip: 0.6, repeat: 0.15, leap: 0.3 }, maxLeapSemitones: 12, rhythms: [{ value: 1, weight: 3 }, { value: 0.5, weight: 3 }, { value: 1.5, weight: 1 }, { value: 2, weight: 1 }], rests: true, ties: true, accidentals: true, dotted: true, syncopation: true, lhChords: true, tempo: 88 },
];

export function levelSpec(level: number): LevelSpec {
  return LEVELS[Math.max(1, Math.min(LEVELS.length, Math.round(level))) - 1];
}

export interface GeneratorOptions {
  level: number;
  scale: ScaleId;
  seed?: string;
  /** Overrides (teacher). */
  bars?: number;
  hands?: Exercise["hands"];
  tempo?: number;
}

const BEATS_PER_BAR = 4;

/**
 * Generate an exercise. Deterministic for a given seed so it can be replayed.
 * Constraints (§11): start/end on tonic or dominant, leap limits, 2-bar phrase shaping (phrase ends rest on stable tones).
 */
export function generateExercise(opts: GeneratorOptions): Exercise {
  const spec = levelSpec(opts.level);
  const seed = opts.seed ?? `${Date.now()}-${Math.random()}`;
  const rng = seededRandom(hashString(seed));
  const scale = buildScale(opts.scale);
  const bars = opts.bars ?? spec.bars;
  const hands = opts.hands ?? spec.hands;

  const rhOctave = 4;
  const lhOctave = scale.key === "C" || scale.key === "D" || scale.key === "Db" || scale.key === "Eb" ? 3 : 2;
  const notes: ExNote[] = [];

  // Pool of scale degrees in the range; degrees beyond 7 wrap into next octave via degreeToMidi.
  const degrees: number[] = [];
  for (let d = spec.rangeDegrees[0]; d <= spec.rangeDegrees[1]; d++) degrees.push(d);
  const stable = degrees.filter((d) => ((d - 1) % 7) + 1 === 1 || ((d - 1) % 7) + 1 === 5); // tonic/dominant
  let currentDeg = stable[0] ?? 1;

  for (let bar = 0; bar < bars; bar++) {
    const hand: Hand = hands === "LH" ? "LH" : hands === "alternating" ? (bar % 2 === 0 ? "RH" : "LH") : "RH";
    const octave = hand === "RH" ? rhOctave : lhOctave;
    let beat = 0;
    const isPhraseEnd = bar % 2 === 1; // 2-bar phrases
    const isLast = bar === bars - 1;
    while (beat < BEATS_PER_BAR) {
      const remaining = BEATS_PER_BAR - beat;
      const candidates = spec.rhythms.filter((r) => r.value <= remaining);
      // On the off-beat, avoid dotted values unless syncopation allowed.
      const filtered = candidates.filter((r) => spec.syncopation || beat % 1 === 0 || r.value <= 1);
      let dur = weightedPick(rng, (filtered.length ? filtered : candidates).map((r) => ({ value: r.value, weight: r.weight })));
      // Phrase ends land long.
      if (isPhraseEnd && remaining >= 2 && beat >= 2) dur = remaining >= 4 ? 4 : 2;
      if (isLast && beat === 0 && remaining === 4) dur = 4;

      const restHere = spec.rests && !isLast && rng() < 0.08 && beat > 0 && dur <= 1;
      if (restHere) {
        notes.push({ midi: null, beats: dur, bar, beat });
        beat += dur;
        continue;
      }
      // Choose next degree.
      const forceStable = (isLast && beat + dur >= BEATS_PER_BAR) || (bar === 0 && beat === 0);
      let nextDeg: number;
      if (forceStable) {
        nextDeg = nearest(stable, currentDeg);
      } else if (isPhraseEnd && beat + dur >= BEATS_PER_BAR) {
        // Rest on a stable tone or the third.
        const restful = degrees.filter((d) => [1, 3, 5].includes(((d - 1) % 7) + 1));
        nextDeg = nearest(restful, currentDeg, rng);
      } else {
        nextDeg = pickMotion(rng, spec, degrees, currentDeg);
      }
      // Enforce leap limit in semitones.
      let midi = degreeToMidi(nextDeg, scale, octave);
      const prevMidi = degreeToMidi(currentDeg, scale, octave);
      if (Math.abs(midi - prevMidi) > spec.maxLeapSemitones) {
        nextDeg = currentDeg + Math.sign(nextDeg - currentDeg);
        midi = degreeToMidi(nextDeg, scale, octave);
      }
      // Accidentals: occasional chromatic neighbour (raised 4th or lowered 7th).
      if (spec.accidentals && rng() < 0.07 && !forceStable) {
        midi += rng() < 0.5 ? 1 : -1;
      }
      const note: ExNote = { midi, beats: dur, bar, beat };
      if (hands === "together") {
        note.midiLH = lhFor(spec, scale, bar, beat, lhOctave);
      }
      if (spec.ties && rng() < 0.08 && beat + dur >= BEATS_PER_BAR && !isLast) note.tie = true;
      notes.push(note);
      currentDeg = nextDeg;
      beat += dur;
    }
  }
  // If a note was tied across a bar, the first note of the next bar must match pitch.
  for (let i = 0; i < notes.length - 1; i++) {
    if (notes[i].tie) notes[i + 1].midi = notes[i].midi;
  }
  const clefs: Clef[] = hands === "RH" ? ["treble"] : hands === "LH" ? ["bass"] : ["treble", "bass"];
  return { seed, level: spec.level, scale: opts.scale, timeSig: [4, 4], bars, hands, clefs, notes, tempo: opts.tempo ?? spec.tempo };
}

function lhFor(spec: LevelSpec, scale: Scale, bar: number, beat: number, octave: number): number | null {
  // Level 8-9: bass root on beat 1 held for the bar. Level 10: root on 1 and 3 as block chord root (staff render adds chord).
  const rootDegrees = [1, 4, 5, 1];
  const deg = rootDegrees[bar % 4];
  if (beat === 0) return degreeToMidi(deg, scale, octave);
  if (spec.lhChords && beat === 2) return degreeToMidi(deg, scale, octave);
  return null;
}

function pickMotion(rng: () => number, spec: LevelSpec, degrees: number[], current: number): number {
  const kind = weightedPick(rng, [
    { value: "step", weight: spec.motion.step },
    { value: "skip", weight: spec.motion.skip },
    { value: "repeat", weight: spec.motion.repeat },
    { value: "leap", weight: spec.motion.leap },
  ]);
  const dir = rng() < 0.5 ? -1 : 1;
  const lo = degrees[0], hi = degrees[degrees.length - 1];
  const clamp = (d: number) => Math.max(lo, Math.min(hi, d));
  switch (kind) {
    case "repeat": return current;
    case "step": return bounce(current + dir, lo, hi, current - dir);
    case "skip": return bounce(current + 2 * dir, lo, hi, current - 2 * dir);
    case "leap": {
      const size = 3 + Math.floor(rng() * 3);
      return clamp(bounce(current + size * dir, lo, hi, current - size * dir));
    }
  }
  return current;
}

function bounce(candidate: number, lo: number, hi: number, alt: number): number {
  if (candidate < lo || candidate > hi) return Math.max(lo, Math.min(hi, alt));
  return candidate;
}

function nearest(pool: number[], current: number, rng?: () => number): number {
  if (!pool.length) return current;
  const sorted = [...pool].sort((a, b) => Math.abs(a - current) - Math.abs(b - current));
  if (rng && sorted.length > 1 && rng() < 0.3) return sorted[1];
  return sorted[0];
}

/** Total beats in the exercise. */
export function exerciseBeats(ex: Exercise): number {
  return ex.bars * ex.timeSig[0];
}

/** Absolute beat position for each sounding note. */
export function noteTimeline(ex: Exercise): { midi: number; beat: number; beats: number; index: number }[] {
  const out: { midi: number; beat: number; beats: number; index: number }[] = [];
  ex.notes.forEach((n, i) => {
    if (n.midi != null) out.push({ midi: n.midi, beat: n.bar * ex.timeSig[0] + n.beat, beats: n.beats, index: i });
  });
  return out;
}
