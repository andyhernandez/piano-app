"use client";
import * as React from "react";
import { useAudio } from "@/lib/hooks/use-audio";
import { barStrokes, type ResolvedBar, type Level } from "./sheet-data";

export interface PlayerState { playing: boolean; bar: number | null; countIn: number; timesThrough: number }

/**
 * Plays a chord chart against the engine's metronome. The click is the clock: every beat the hook looks up
 * the strokes for the current bar and plays them through `playChord`. A loop wraps back and counts a time
 * through; a count-in of two bars precedes the first when the player has it switched on.
 */
export function useChartPlayer(bars: ResolvedBar[], opts: { bpm: number; level: Level; loop: { from: number; to: number }; countIn: boolean; beatsPerBar?: number }) {
  const { audio, unlock } = useAudio();
  const [state, setState] = React.useState<PlayerState>({ playing: false, bar: null, countIn: 0, timesThrough: 0 });
  const pos = React.useRef({ bar: -1, countIn: 0, times: 0 });
  const live = React.useRef({ bars, opts });
  React.useEffect(() => { live.current = { bars, opts }; }, [bars, opts]);
  const beatsPerBar = opts.beatsPerBar ?? 4;

  const stop = React.useCallback(() => {
    audio.stopMetronome();
    setState((s) => ({ ...s, playing: false, bar: null, countIn: 0 }));
  }, [audio]);

  const start = React.useCallback(async () => {
    await unlock();
    const { opts: o } = live.current;
    pos.current = { bar: -1, countIn: o.countIn ? 2 : 0, times: 0 };
    setState({ playing: true, bar: null, countIn: pos.current.countIn, timesThrough: 0 });
    audio.startMetronome({
      bpm: o.bpm,
      beatsPerBar,
      onBeat: (beat) => {
        const { bars: b, opts: cur } = live.current;
        const p = pos.current;
        if (beat === 0) {
          if (p.countIn > 0) {
            p.countIn--;
            setState((s) => ({ ...s, countIn: p.countIn + 1 }));
            return;
          }
          if (p.bar < 0) p.bar = cur.loop.from;
          else if (p.bar >= cur.loop.to) { p.bar = cur.loop.from; p.times++; }
          else p.bar++;
          setState((s) => ({ ...s, bar: p.bar, countIn: 0, timesThrough: p.times }));
        }
        if (p.countIn > 0 || p.bar < 0) return;
        const bar = b[p.bar];
        if (!bar) return;
        const secPerBeat = 60 / cur.bpm;
        for (const s of barStrokes(bar, cur.level, beatsPerBar)) {
          if (s.beat !== beat) continue;
          audio.playChord(s.midis, Math.max(0.3, s.beats * secPerBeat * 0.95), s.midis.length > 1 ? 0.6 : 0.75);
        }
      },
    });
  }, [audio, unlock, beatsPerBar]);

  // Tempo changes apply to a running click straight away.
  React.useEffect(() => { if (state.playing) audio.setMetronomeBpm(opts.bpm); }, [audio, opts.bpm, state.playing]);
  // Leaving the page stops the click.
  React.useEffect(() => () => { audio.stopMetronome(); }, [audio]);

  return { ...state, start, stop };
}
