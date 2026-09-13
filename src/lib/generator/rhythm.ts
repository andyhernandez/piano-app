import { hashString, seededRandom, weightedPick } from "../utils/random";

/** Rhythm cell durations in beats. */
export type RDur = 4 | 3 | 2 | 1.5 | 1 | 0.75 | 0.5 | 0.25;

export interface RhythmNote {
  beats: RDur;
  rest: boolean;
  /** Absolute onset in beats from the start. */
  onset: number;
}

export interface RhythmPattern {
  seed: string;
  level: number;
  bpm: number;
  bars: number;
  beatsPerBar: number;
  notes: RhythmNote[];
}

export interface RhythmLevelSpec {
  level: number;
  title: string;
  bpm: number;
  bars: number;
  cells: { value: RDur; weight: number }[];
  rests: boolean;
  syncopation: boolean;
}

/** Clap-Tap level ladder: quarter notes → syncopation and dotted rhythms (§4B). */
export const RHYTHM_LEVELS: RhythmLevelSpec[] = [
  { level: 1, title: "Steady Quarters", bpm: 70, bars: 2, cells: [{ value: 1, weight: 1 }], rests: false, syncopation: false },
  { level: 2, title: "Halves & Quarters", bpm: 72, bars: 2, cells: [{ value: 1, weight: 3 }, { value: 2, weight: 2 }], rests: false, syncopation: false },
  { level: 3, title: "Whole Notes", bpm: 72, bars: 2, cells: [{ value: 1, weight: 3 }, { value: 2, weight: 2 }, { value: 4, weight: 1 }], rests: false, syncopation: false },
  { level: 4, title: "Quarter Rests", bpm: 76, bars: 2, cells: [{ value: 1, weight: 3 }, { value: 2, weight: 1 }], rests: true, syncopation: false },
  { level: 5, title: "Eighth Pairs", bpm: 76, bars: 2, cells: [{ value: 1, weight: 3 }, { value: 0.5, weight: 3 }, { value: 2, weight: 1 }], rests: false, syncopation: false },
  { level: 6, title: "Eighths & Rests", bpm: 80, bars: 4, cells: [{ value: 1, weight: 3 }, { value: 0.5, weight: 3 }, { value: 2, weight: 1 }], rests: true, syncopation: false },
  { level: 7, title: "Dotted Quarters", bpm: 80, bars: 4, cells: [{ value: 1, weight: 3 }, { value: 0.5, weight: 2 }, { value: 1.5, weight: 2 }], rests: true, syncopation: false },
  { level: 8, title: "Off-beats", bpm: 84, bars: 4, cells: [{ value: 1, weight: 2 }, { value: 0.5, weight: 3 }, { value: 1.5, weight: 1 }], rests: true, syncopation: true },
  { level: 9, title: "Sixteenths", bpm: 76, bars: 4, cells: [{ value: 1, weight: 2 }, { value: 0.5, weight: 3 }, { value: 0.25, weight: 2 }, { value: 0.75, weight: 1 }], rests: true, syncopation: true },
  { level: 10, title: "Groove Master", bpm: 88, bars: 4, cells: [{ value: 1, weight: 2 }, { value: 0.5, weight: 3 }, { value: 0.25, weight: 2 }, { value: 0.75, weight: 2 }, { value: 1.5, weight: 2 }], rests: true, syncopation: true },
];

export function rhythmLevel(level: number): RhythmLevelSpec {
  return RHYTHM_LEVELS[Math.max(1, Math.min(RHYTHM_LEVELS.length, Math.round(level))) - 1];
}

export function generateRhythm(level: number, seed?: string, beatsPerBar = 4): RhythmPattern {
  const spec = rhythmLevel(level);
  const s = seed ?? `${Date.now()}-${Math.random()}`;
  const rng = seededRandom(hashString(s));
  const notes: RhythmNote[] = [];
  for (let bar = 0; bar < spec.bars; bar++) {
    let beat = 0;
    while (beat < beatsPerBar) {
      const remaining = beatsPerBar - beat;
      const onBeat = Number.isInteger(beat);
      let candidates = spec.cells.filter((c) => c.value <= remaining);
      if (!spec.syncopation) candidates = candidates.filter((c) => onBeat || c.value <= 0.5 || Number.isInteger(beat + c.value));
      // Sixteenths must resolve within the beat.
      candidates = candidates.filter((c) => c.value >= 0.5 || Math.floor(beat) === Math.floor(beat + c.value - 1e-9));
      const dur = weightedPick(rng, candidates.length ? candidates : [{ value: 1 as RDur, weight: 1 }]);
      const rest = spec.rests && beat > 0 && dur <= 1 && rng() < 0.15;
      notes.push({ beats: dur, rest, onset: bar * beatsPerBar + beat });
      beat += dur;
    }
  }
  // Never start with a rest; never end with a rest.
  if (notes[0]) notes[0].rest = false;
  if (notes[notes.length - 1]) notes[notes.length - 1].rest = false;
  return { seed: s, level: spec.level, bpm: spec.bpm, bars: spec.bars, beatsPerBar, notes };
}

/** Expected onset times in ms relative to pattern start. */
export function expectedOnsetsMs(p: RhythmPattern): number[] {
  const beatMs = 60_000 / p.bpm;
  return p.notes.filter((n) => !n.rest).map((n) => n.onset * beatMs);
}

/** Short "Rhythm Echo" phrase: 1 bar, level-dependent cells. */
export function generateEcho(level: number, seed?: string): RhythmPattern {
  const p = generateRhythm(level, seed);
  const oneBar = p.notes.filter((n) => n.onset < p.beatsPerBar);
  return { ...p, bars: 1, notes: oneBar };
}
