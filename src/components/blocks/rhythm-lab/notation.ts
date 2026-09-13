import type { RhythmPattern } from "@/lib/generator/rhythm";
import type { StaffNote } from "@/components/staff/staff";

export type NoteState = StaffNote["state"];

/** Pitch used to draw rhythm-only notation (B4 sits on the middle line of the treble staff). */
export const RHYTHM_PITCH = 71;

/**
 * Convert a rhythm pattern into Staff bars: every sounding note on one pitch, rests as empty midis.
 * `states` is indexed by position in `pattern.notes` (rests included).
 */
export function rhythmToBars(pattern: RhythmPattern, states: (NoteState | undefined)[] = []): StaffNote[][] {
  const bpb = pattern.beatsPerBar;
  const bars: StaffNote[][] = Array.from({ length: pattern.bars }, () => []);
  pattern.notes.forEach((n, i) => {
    const bar = Math.floor(n.onset / bpb);
    if (!bars[bar]) return;
    bars[bar].push({ midis: n.rest ? [] : [RHYTHM_PITCH], beats: n.beats, state: states[i] });
  });
  return bars.map((b) => (b.length ? b : [{ midis: [], beats: bpb }]));
}

/** Greedy nearest matching: for each expected onset, was there an unused tap within `windowMs`? */
export function matchOnsets(expected: number[], actual: number[], windowMs = 120): boolean[] {
  const used = new Set<number>();
  return expected.map((e) => {
    let best = -1;
    let bestDelta = Infinity;
    actual.forEach((a, i) => {
      if (used.has(i)) return;
      const d = Math.abs(a - e);
      if (d < bestDelta) { bestDelta = d; best = i; }
    });
    if (best >= 0 && bestDelta <= windowMs) { used.add(best); return true; }
    return false;
  });
}

/** Per-note states after a round: correct/wrong for sounding notes, undefined for rests. */
export function feedbackStates(pattern: RhythmPattern, hits: boolean[]): (NoteState | undefined)[] {
  let k = 0;
  return pattern.notes.map((n) => {
    if (n.rest) return undefined;
    const hit = hits[k++];
    return hit ? "correct" : "wrong";
  });
}

/** Highlight the notes that start within the given beat (used while listening / tapping). */
export function currentStates(pattern: RhythmPattern, beat: number | null): (NoteState | undefined)[] {
  return pattern.notes.map((n) => (beat !== null && !n.rest && n.onset >= beat && n.onset < beat + 1 ? "current" : undefined));
}
