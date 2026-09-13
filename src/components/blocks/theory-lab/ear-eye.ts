import type { InputMode, MidiScore, Scale, Triad } from "@/lib/types";
import { invertTriad, primaryTriads } from "@/lib/music/scales";
import { chordSymbol, seventhOf } from "@/lib/music/chords";
import { intervalPool, type IntervalDef } from "@/lib/music/intervals";
import { pick, shuffle } from "@/lib/utils/random";

export type RoundKind = "chord" | "interval";
export type Inversion = 0 | 1 | 2;

export interface Choice {
  id: string;
  label: string;
}

export interface StaffOption {
  id: string;
  midis: number[];
}

export interface Round {
  kind: RoundKind;
  /** Notes the app plays and, after the round, reveals. */
  midis: number[];
  answerId: string;
  answerLabel: string;
  /** Step 1: identify by ear. */
  choices: Choice[];
  /** Step 2: find it on the staff (exactly one has id === answerId). */
  staffOptions: StaffOption[];
  /** Level-1 chord rounds ask major vs minor as a mini question. */
  quality?: "major" | "minor";
  inversion?: Inversion;
  seventh?: boolean;
  semitones?: number;
}

export interface RoundRecord {
  kind: RoundKind;
  answer: string;
  step1: boolean;
  step2: boolean;
  /** Both halves right. */
  point: boolean;
  /** Level-1 quality mini question, when asked. */
  quality?: boolean;
  /** Whether step 2 was solved by playing (vs. tapping the staff). */
  played?: boolean;
}

/** Chords available at a theory level: I IV V at level 1, plus vi from level 2. */
export function chordPoolFor(scale: Scale, level: number): Triad[] {
  const p = primaryTriads(scale);
  return level <= 1 ? p.slice(0, 3) : p;
}

/** Rotate a chord upward `inv` times (generic inversion for triads and sevenths). */
export function invertNotes(midis: number[], inv: number): number[] {
  let out = [...midis];
  for (let k = 0; k < inv; k++) {
    const [first, ...rest] = out;
    out = [...rest, first + 12];
  }
  return out;
}

export function chordNotes(triad: Triad, scale: Scale, inversion: Inversion, seventh: boolean): number[] {
  return seventh ? invertNotes(seventhOf(triad, scale), inversion) : invertTriad(triad.midi, inversion);
}

export function chordLabel(triad: Triad, seventh: boolean): string {
  return chordSymbol(triad) + (seventh ? "7" : "");
}

export interface MakeRoundOptions {
  /** Number of step-1 answer buttons (2–4). */
  choiceCount: number;
  rng?: () => number;
  kind?: RoundKind;
}

/** Build a linked ear-eye round for the scale at a theory level (1–5). */
export function makeRound(scale: Scale, level: number, opts: MakeRoundOptions): Round {
  const rng = opts.rng ?? Math.random;
  const kind: RoundKind = opts.kind ?? (rng() < 0.5 ? "chord" : "interval");
  return kind === "chord" ? makeChordRound(scale, level, opts.choiceCount, rng) : makeIntervalRound(scale, level, opts.choiceCount, rng);
}

function makeChordRound(scale: Scale, level: number, choiceCount: number, rng: () => number): Round {
  const pool = chordPoolFor(scale, level);
  const triad = pick(rng, pool);
  const inversion: Inversion = level >= 3 ? pick(rng, [0, 1, 2] as Inversion[]) : 0;
  const seventh = level >= 4 && rng() < 0.3;
  const others = shuffle(rng, pool.filter((t) => t !== triad));
  const count = Math.max(2, Math.min(choiceCount, pool.length));
  const choices = shuffle(rng, [triad, ...others.slice(0, count - 1)]).map((t) => ({ id: t.roman, label: chordLabel(t, seventh) }));
  const staffOptions = shuffle(rng, [triad, ...others.slice(0, 2)]).map((t) => ({ id: t.roman, midis: chordNotes(t, scale, inversion, seventh) }));
  return {
    kind: "chord",
    midis: chordNotes(triad, scale, inversion, seventh),
    answerId: triad.roman,
    answerLabel: chordLabel(triad, seventh),
    choices,
    staffOptions,
    quality: level <= 1 && (triad.quality === "major" || triad.quality === "minor") ? triad.quality : undefined,
    inversion,
    seventh,
  };
}

function makeIntervalRound(scale: Scale, level: number, choiceCount: number, rng: () => number): Round {
  const pool = intervalPool(level);
  const iv = pick(rng, pool);
  const root = pick(rng, scale.midiOneOctave.slice(0, 7));
  const others = shuffle(rng, pool.filter((i) => i !== iv));
  const count = Math.max(2, Math.min(choiceCount, pool.length));
  const label = (i: IntervalDef) => i.name;
  const choices = shuffle(rng, [iv, ...others.slice(0, count - 1)]).map((i) => ({ id: i.short, label: label(i) }));
  const staffOptions = shuffle(rng, [iv, ...others.slice(0, 2)]).map((i) => ({ id: i.short, midis: [root, root + i.semitones] }));
  return {
    kind: "interval",
    midis: [root, root + iv.semitones],
    answerId: iv.short,
    answerLabel: label(iv),
    choices,
    staffOptions,
    semitones: iv.semitones,
  };
}

const pc = (m: number) => ((m % 12) + 12) % 12;

/**
 * Does a set of recently played notes match the round? Chords match by pitch class (any octave, any voicing);
 * intervals need two notes the right distance apart with the right pitch classes.
 */
export function matchesPlayed(round: Round, played: number[]): boolean {
  if (round.kind === "chord") {
    const want = new Set(round.midis.map(pc));
    const have = new Set(played.map(pc));
    for (const p of want) if (!have.has(p)) return false;
    return true;
  }
  const [a, b] = round.midis;
  const uniq = Array.from(new Set(played));
  for (let i = 0; i < uniq.length; i++) {
    for (let j = 0; j < uniq.length; j++) {
      if (i === j) continue;
      const lo = uniq[i];
      const hi = uniq[j];
      if (hi - lo === round.semitones && pc(lo) === pc(a) && pc(hi) === pc(b)) return true;
    }
  }
  return false;
}

export interface EarEyeStats {
  rounds: number;
  points: number;
  chordsRight: number;
  intervalsRight: number;
  /** 0-100 */
  pct: number;
}

export function statsFor(history: RoundRecord[]): EarEyeStats {
  const rounds = history.length;
  const points = history.filter((r) => r.point).length;
  return {
    rounds,
    points,
    chordsRight: history.filter((r) => r.point && r.kind === "chord").length,
    intervalsRight: history.filter((r) => r.point && r.kind === "interval").length,
    pct: rounds ? Math.round((points / rounds) * 100) : 0,
  };
}

/** Chord Detective badge: at least 5 points at 70%+. */
export function earEyeScore(history: RoundRecord[], inputMode: InputMode): MidiScore {
  const s = statsFor(history);
  return {
    score: s.pct,
    components: { rounds: s.rounds, points: s.points, chordsRight: s.chordsRight, intervalsRight: s.intervalsRight },
    badge: s.points >= 5 && s.pct >= 70 ? "chord-detective" : null,
    inputMode,
  };
}

/** Level-up rule: 80%+ over at least 6 rounds. */
export function shouldLevelUp(history: RoundRecord[], level: number): boolean {
  const s = statsFor(history);
  return level < 5 && s.rounds >= 6 && s.pct >= 80;
}

/** Answer buttons: 2 for weak ears on the first rounds, else 3 at level 1 and 4 above. */
export function choiceCountFor(level: number, ear: number, roundsPlayed: number): number {
  if (ear < 40 && roundsPlayed < 3) return 2;
  return level <= 1 ? 3 : 4;
}
