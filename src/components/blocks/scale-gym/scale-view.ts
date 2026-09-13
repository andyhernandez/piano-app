import type { Hand, Scale } from "@/lib/types";
import { scaleRunMidi } from "@/lib/music/scales";
import { isBlackKey } from "@/lib/music/notes";

export type Octaves = 1 | 2;

/** Ascending + descending run for the hand. RH lives around middle C; LH sits in the bass. */
export function runFor(scale: Scale, hand: Hand, octaves: Octaves): number[] {
  const start = hand === "RH" ? 4 : octaves === 2 ? 2 : 3;
  return scaleRunMidi(scale, start, octaves);
}

/** The ascending half of a run (tonic to top tonic). */
export function ascendingOf(run: number[]): number[] {
  return run.slice(0, (run.length + 1) / 2);
}

/**
 * Fingering for the notes of the ascending run. The scale carries two-octave fingerings; for the one-octave
 * view we take the first eight and, for RH, finish on the next finger instead of crossing the thumb under.
 */
export function fingeringFor(scale: Scale, hand: Hand, octaves: Octaves): number[] {
  const full = hand === "RH" ? scale.fingeringRH : scale.fingeringLH;
  if (octaves === 2) return full;
  const one = full.slice(0, 8);
  if (hand === "RH" && one[7] === 1) one[7] = Math.min(5, one[6] + 1);
  return one;
}

/** Indices into the ascending run where the thumb crosses (RH) or the hand crosses over the thumb (LH). */
export function thumbUnderFor(scale: Scale, hand: Hand, fingering: number[]): number[] {
  const idx = hand === "RH" ? scale.thumbUnderRH : scale.thumbUnderLH;
  return idx.filter((i) => i < fingering.length && (hand === "LH" || fingering[i] === 1));
}

/** Keyboard window: the whole 88 keys, or a clean white-key-aligned span around the run (>= 2 octaves). */
export function viewRange(run: number[], full: boolean): [number, number] {
  if (full) return [21, 108];
  let lo = Math.min(...run);
  let hi = Math.max(...run);
  while (lo % 12 !== 0 && lo % 12 !== 5) lo--;
  if (hi - lo < 24) hi = lo + 24;
  while (isBlackKey(hi)) hi++;
  return [lo, hi];
}

export interface RouletteOption {
  id: "legato" | "staccato" | "slow" | "fast" | "hands";
  label: string;
  emoji: string;
  tip: string;
  /** Suggested metronome tempo. */
  bpm?: number;
}

export const ROULETTE: RouletteOption[] = [
  { id: "legato", label: "Legato", emoji: "🌊", tip: "Smooth and joined up — no gaps between notes." },
  { id: "staccato", label: "Staccato", emoji: "🐇", tip: "Short and bouncy — let every key pop back up." },
  { id: "slow", label: "Slow", emoji: "🐢", tip: "Slow and steady at 60. Make every note the same size.", bpm: 60 },
  { id: "fast", label: "Fast", emoji: "🚀", tip: "Zoom to 120 — keep those wrists floppy!", bpm: 120 },
  { id: "hands", label: "Hands Together", emoji: "🙌", tip: "Both hands, one octave apart. Thumbs meet on the way." },
];
