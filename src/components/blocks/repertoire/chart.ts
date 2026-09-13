import type { Scale, Song, Triad } from "@/lib/types";
import { chordSymbol, romanToTriad } from "@/lib/music/chords";
import { SONGS, songById } from "@/lib/music/songs";

export interface ChartChord {
  roman: string;
  triad: Triad;
  symbol: string;
}

export interface ChartBar {
  index: number;
  chords: ChartChord[];
}

/** Songs offered on day one when nothing is unlocked yet (all C-major starters). */
export const STARTER_SONG_IDS = ["twinkle", "mary-lamb", "hot-cross"];

export function starterSongs(): Song[] {
  return STARTER_SONG_IDS.map((id) => songById(id)).filter((s): s is Song => Boolean(s));
}

/** Resolve the child's unlocked song ids (most recent last). Unknown ids are dropped. */
export function unlockedSongs(ids: string[]): Song[] {
  return ids.map((id) => songById(id)).filter((s): s is Song => Boolean(s));
}

export function allLibrarySongs(custom: Song[] = []): Song[] {
  return [...SONGS, ...custom];
}

/** Transpose a roman-numeral chart into the scale of the week. Unknown romans are skipped. */
export function transposeChart(song: Song, scale: Scale): ChartBar[] {
  return song.chart.map((bar, index) => ({
    index,
    chords: bar
      .map((roman) => {
        const triad = romanToTriad(roman, scale);
        return triad ? { roman, triad, symbol: chordSymbol(triad) } : null;
      })
      .filter((c): c is ChartChord => c !== null),
  }));
}

/** Every MIDI note a chart can touch (triad tones + bass roots an octave down). */
export function chartMidis(bars: ChartBar[]): number[] {
  const out = new Set<number>();
  for (const bar of bars) for (const c of bar.chords) {
    for (const m of c.triad.midi) out.add(m);
    out.add(c.triad.midi[0] - 12);
  }
  return Array.from(out);
}

export type PlaybackEvent =
  | { atMs: number; kind: "chord"; midis: number[]; durSec: number; bar: number }
  | { atMs: number; kind: "note"; midis: number[]; durSec: number; bar: number }
  | { atMs: number; kind: "seq"; midis: number[]; gapSec: number; durSec: number; bar: number };

export function beatMs(bpm: number): number {
  return 60000 / Math.max(20, bpm);
}

/** Full chart playback: one bar = 4 beats; bars with two chords split the bar in half. */
export function chartPlaybackEvents(bars: ChartBar[], bpm: number): { events: PlaybackEvent[]; totalMs: number } {
  const beat = beatMs(bpm);
  const barMs = beat * 4;
  const events: PlaybackEvent[] = [];
  bars.forEach((bar, i) => {
    const n = bar.chords.length || 1;
    bar.chords.forEach((c, j) => {
      events.push({ atMs: i * barMs + (j * barMs) / n, kind: "chord", midis: [...c.triad.midi], durSec: (barMs / n / 1000) * 0.95, bar: i });
    });
  });
  return { events, totalMs: bars.length * barMs };
}

export type LeadLevel = 1 | 2 | 3 | 4;

/**
 * Demo pattern for a lead-sheet level over the first `barCount` bars (spec §4E).
 *  L1 bass roots (whole notes), L2 block triads, L3 broken root-3rd-5th-3rd quarters, L4 pop groove.
 */
export function levelDemoEvents(level: LeadLevel, bars: ChartBar[], bpm: number, barCount = 2): { events: PlaybackEvent[]; totalMs: number } {
  const beat = beatMs(bpm);
  const barMs = beat * 4;
  const beatSec = beat / 1000;
  const events: PlaybackEvent[] = [];
  const slice = bars.slice(0, barCount).filter((b) => b.chords.length > 0);
  slice.forEach((bar, i) => {
    const chord = bar.chords[0];
    const [root, third, fifth] = chord.triad.midi;
    const bass = root - 12;
    const t0 = i * barMs;
    switch (level) {
      case 1:
        events.push({ atMs: t0, kind: "note", midis: [bass], durSec: beatSec * 3.8, bar: bar.index });
        break;
      case 2:
        events.push({ atMs: t0, kind: "chord", midis: [root, third, fifth], durSec: beatSec * 3.8, bar: bar.index });
        break;
      case 3:
        events.push({ atMs: t0, kind: "seq", midis: [root, third, fifth, third], gapSec: beatSec, durSec: beatSec * 0.9, bar: bar.index });
        break;
      case 4:
        events.push({ atMs: t0, kind: "note", midis: [bass], durSec: beatSec * 0.9, bar: bar.index });
        events.push({ atMs: t0 + beat, kind: "chord", midis: [root, third, fifth], durSec: beatSec * 0.45, bar: bar.index });
        events.push({ atMs: t0 + beat * 2, kind: "note", midis: [bass], durSec: beatSec * 0.9, bar: bar.index });
        events.push({ atMs: t0 + beat * 3, kind: "chord", midis: [root, third, fifth], durSec: beatSec * 0.45, bar: bar.index });
        break;
    }
  });
  return { events, totalMs: slice.length * barMs };
}

/** Pitch-class set check: are all triad tones currently held (any octave, any inversion)? */
export function triadHeld(triad: Triad, held: Iterable<number>): boolean {
  const pcs = new Set<number>();
  for (const m of held) pcs.add(((m % 12) + 12) % 12);
  return triad.midi.every((m) => pcs.has(((m % 12) + 12) % 12));
}
