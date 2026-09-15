import type { Scale, Song } from "@/lib/types";
import type { LeadSheetBar, LeadMelodyNote, ChordBar, NoteValue } from "@/components/ds";
import { midiToStep } from "@/components/ds";
import { romanToTriad, chordSymbol } from "@/lib/music/chords";
import { prefersFlats } from "@/lib/music/scales";

export type Level = 1 | 2 | 3 | 4;
export type View = "lead-sheet" | "chord-chart";

export interface ResolvedChord { symbol: string; midi: [number, number, number] }
export interface ResolvedBar { chords: ResolvedChord[] }

/** Roman numerals per bar against the piece's scale. Unknown numerals show as written and play nothing. */
export function resolveChart(song: Song, scale: Scale): ResolvedBar[] {
  return song.chart.map((bar) => ({
    chords: bar.map((roman) => {
      const t = romanToTriad(roman, scale);
      return t ? { symbol: chordSymbol(t), midi: t.midi } : { symbol: roman, midi: [0, 0, 0] as [number, number, number] };
    }),
  }));
}

export function chartBars(bars: ResolvedBar[], current: number | null): ChordBar[] {
  return bars.map((b, i) => ({ chord: b.chords.map((c) => c.symbol).join("  "), current: i === current, played: current != null && i < current ? true : undefined }));
}

export function leadBars(bars: ResolvedBar[], upTo: number): LeadSheetBar[] {
  return bars.map((b, i) => ({ chord: b.chords.map((c) => c.symbol).join("  "), dim: i >= upTo && upTo >= 0 }));
}

function valueFor(beats: number): NoteValue {
  return beats >= 4 ? "whole" : beats >= 2 ? "half" : beats >= 1 ? "quarter" : "eighth";
}

export interface Stroke { beat: number; midis: number[]; beats: number }

/**
 * What the left hand does with one chord segment at each lead-sheet level (LEAD_SHEET_LEVELS):
 * L1 the root, L2 the block triad, L3 root–third–fifth–third, L4 root on the strong beats with stabs between.
 */
export function strokesFor(chord: ResolvedChord, level: Level, startBeat: number, beats: number): Stroke[] {
  const [r, t, f] = chord.midi;
  if (!r) return [];
  if (level === 1) return [{ beat: startBeat, midis: [r - 12], beats }];
  if (level === 2) return [{ beat: startBeat, midis: [r, t, f], beats }];
  if (level === 3) {
    const seq = [r, t, f, t];
    return Array.from({ length: beats }, (_, i) => ({ beat: startBeat + i, midis: [seq[i % 4]], beats: 1 }));
  }
  const out: Stroke[] = [];
  for (let i = 0; i < beats; i++) out.push(i % 2 === 0 ? { beat: startBeat + i, midis: [r - 12], beats: 1 } : { beat: startBeat + i, midis: [r, t, f], beats: 1 });
  return out;
}

export function barStrokes(bar: ResolvedBar, level: Level, beatsPerBar = 4): Stroke[] {
  const per = beatsPerBar / Math.max(1, bar.chords.length);
  return bar.chords.flatMap((c, i) => strokesFor(c, level, i * per, per));
}

/** The chart as melody notes on the lead sheet's single staff, with played / current / upcoming states from the playhead. */
export function melodyFor(bars: ResolvedBar[], level: Level, scale: Scale, firstBar: number, count: number, playhead: number | null): LeadMelodyNote[] {
  const flats = prefersFlats(scale);
  const out: LeadMelodyNote[] = [];
  bars.slice(firstBar, firstBar + count).forEach((bar, i) => {
    const abs = firstBar + i;
    const state = playhead == null ? undefined : abs < playhead ? "played" : abs === playhead ? "current" : "upcoming";
    for (const s of barStrokes(bar, level)) {
      // Keep each chord inside the staff: shift by octaves until its root sits between the second space and the first ledger.
      const root = Math.min(...s.midis);
      let shift = 0;
      while (midiToStep(root + shift, "treble", flats) > 9) shift += 12;
      while (midiToStep(root + shift, "treble", flats) < 3) shift -= 12;
      for (const m of s.midis) out.push({ bar: i, beat: s.beat, step: midiToStep(m + shift, "treble", flats), value: valueFor(s.beats), state });
    }
  });
  return out;
}

/** Loop choices: the whole chart, then each four-bar phrase. */
export function loopOptions(barCount: number): { id: string; label: string; from: number; to: number }[] {
  const opts = [{ id: "all", label: "All bars", from: 0, to: barCount - 1 }];
  for (let s = 0; s < barCount; s += 4) {
    const e = Math.min(barCount - 1, s + 3);
    if (e > s || barCount > 4) opts.push({ id: `${s}-${e}`, label: `${s + 1}–${e + 1}`, from: s, to: e });
  }
  return opts;
}

export const TEMPOS = ["60", "72", "84", "96", "108"] as const;
export type TempoText = (typeof TEMPOS)[number];
