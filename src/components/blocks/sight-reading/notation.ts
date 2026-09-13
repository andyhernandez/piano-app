import type { Clef, NoteEvent, ScaleId } from "@/lib/types";
import type { Exercise } from "@/lib/generator/sightreading";
import { noteTimeline } from "@/lib/generator/sightreading";
import { isInScale } from "@/lib/music/scales";
import type { StaffNote } from "@/components/staff/staff";

export type NoteState = StaffNote["state"];
/** Note states keyed by index into `exercise.notes`. */
export type StateMap = ReadonlyMap<number, NoteState>;

const BEATS_PER_BAR = 4;
const STD_DURATIONS = [4, 3, 2, 1.5, 1, 0.75, 0.5, 0.25];

export interface ReadingBars {
  clef: Clef;
  bars: StaffNote[][];
  bassBars?: StaffNote[][];
}

/** Root-position diatonic triad above a bass root (level 10 block chords). */
export function lhChord(root: number, scale: ScaleId): number[] {
  const third = isInScale(root + 4, scale) ? 4 : 3;
  return [root, root + third, root + 7];
}

/** Split an arbitrary beat length into standard note values (longest first). */
function splitBeats(beats: number): number[] {
  const out: number[] = [];
  let left = Math.round(beats * 4) / 4;
  while (left > 0) {
    const d = STD_DURATIONS.find((v) => v <= left + 1e-9) ?? 0.25;
    out.push(d);
    left = Math.round((left - d) * 4) / 4;
  }
  return out;
}

/** Fill a bar from a list of onsets (sorted by beat); notes last until the next onset, gaps become rests. */
function barFromOnsets(onsets: { beat: number; midis: number[]; state?: NoteState }[]): StaffNote[] {
  if (!onsets.length) return [{ midis: [], beats: BEATS_PER_BAR }];
  const out: StaffNote[] = [];
  const sorted = [...onsets].sort((a, b) => a.beat - b.beat);
  if (sorted[0].beat > 0) splitBeats(sorted[0].beat).forEach((b) => out.push({ midis: [], beats: b }));
  sorted.forEach((o, i) => {
    const next = sorted[i + 1]?.beat ?? BEATS_PER_BAR;
    const parts = splitBeats(Math.max(0.25, next - o.beat));
    parts.forEach((b, pi) => out.push({ midis: o.midis, beats: b, state: o.state, tie: pi < parts.length - 1 ? true : undefined }));
  });
  return out;
}

const WHOLE_REST: StaffNote[] = [{ midis: [], beats: BEATS_PER_BAR }];

/** Convert an exercise into Staff props. `states` maps note index → visual state. */
export function exerciseToBars(ex: Exercise, scale: ScaleId, states: StateMap, lhChords: boolean): ReadingBars {
  const toStaff = (indices: number[]): StaffNote[] =>
    indices.map((i) => {
      const n = ex.notes[i];
      return { midis: n.midi == null ? [] : [n.midi], beats: n.beats, tie: n.tie, state: states.get(i) };
    });
  const byBar: number[][] = Array.from({ length: ex.bars }, () => []);
  ex.notes.forEach((n, i) => { if (byBar[n.bar]) byBar[n.bar].push(i); });

  if (ex.hands === "RH" || ex.hands === "LH") {
    return { clef: ex.hands === "RH" ? "treble" : "bass", bars: byBar.map((ix) => (ix.length ? toStaff(ix) : WHOLE_REST)) };
  }
  if (ex.hands === "alternating") {
    const bars = byBar.map((ix, bar) => (bar % 2 === 0 && ix.length ? toStaff(ix) : WHOLE_REST));
    const bassBars = byBar.map((ix, bar) => (bar % 2 === 1 && ix.length ? toStaff(ix) : WHOLE_REST));
    return { clef: "treble", bars, bassBars };
  }
  // Hands together: RH melody on top, LH roots (or block chords) below.
  const bars = byBar.map((ix) => (ix.length ? toStaff(ix) : WHOLE_REST));
  const bassBars = byBar.map((ix) =>
    barFromOnsets(
      ix
        .filter((i) => ex.notes[i].midiLH != null)
        .map((i) => {
          const n = ex.notes[i];
          const root = n.midiLH as number;
          const st = states.get(i);
          return { beat: n.beat, midis: lhChords ? lhChord(root, scale) : [root], state: st === "current" ? st : undefined };
        }),
    ),
  );
  return { clef: "treble", bars, bassBars };
}

/** Index (into exercise.notes) of the note sounding at `beat`, or -1. */
export function noteIndexAtBeat(ex: Exercise, beat: number): number {
  const tl = noteTimeline(ex);
  let idx = -1;
  for (const n of tl) {
    if (n.beat <= beat) idx = n.index; else break;
  }
  return idx;
}

/**
 * Per-note feedback mirroring scoreReading's walk: a note is "correct" when playback kept moving within a beat
 * and the pitch matched; "wrong" otherwise.
 */
export function readingFeedback(ex: Exercise, played: NoteEvent[], startMs: number): Map<number, NoteState> {
  const beatMs = 60_000 / ex.tempo;
  const ons = played.filter((n) => n.kind === "on").map((n) => ({ midi: n.midi, t: n.time - startMs }));
  const out = new Map<number, NoteState>();
  let cursor = 0;
  for (const n of noteTimeline(ex)) {
    const expT = n.beat * beatMs;
    let found = -1;
    for (let i = cursor; i < ons.length; i++) {
      if (ons[i].t < expT - beatMs) continue;
      if (ons[i].t > expT + beatMs) break;
      found = i;
      break;
    }
    if (found >= 0) {
      cursor = found + 1;
      const ok = ons[found].midi === n.midi || ons[found].midi % 12 === n.midi % 12;
      out.set(n.index, ok ? "correct" : "wrong");
    } else {
      out.set(n.index, "wrong");
    }
  }
  return out;
}

/** All pitches in the exercise (for keyboard range / playback). */
export function exerciseMidis(ex: Exercise, scale: ScaleId, lhChords: boolean): number[] {
  const out: number[] = [];
  ex.notes.forEach((n) => {
    if (n.midi != null) out.push(n.midi);
    if (n.midiLH != null) out.push(...(lhChords ? lhChord(n.midiLH, scale) : [n.midiLH]));
  });
  return out;
}
