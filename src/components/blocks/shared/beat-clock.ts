import type { AudioEngine } from "@/lib/audio/engine";

/**
 * A metronome-driven beat clock. Uses the audio engine's metronome when it is unlocked (audible, sample-accurate);
 * otherwise a silent setInterval so an exercise never hangs. Returns a stop function.
 */
export function startBeatClock(audio: AudioEngine, bpm: number, onBeat: (beatInBar: number, audioTime: number) => void): () => void {
  let stopped = false;
  audio.startMetronome({ bpm, beatsPerBar: 4, onBeat: (beat, time) => { if (!stopped) onBeat(beat, time); } });
  if (audio.metronomeRunning) {
    return () => { stopped = true; audio.stopMetronome(); };
  }
  let i = 1;
  const id = setInterval(() => { if (!stopped) onBeat(i % 4, audio.now()); i++; }, 60_000 / bpm);
  onBeat(0, audio.now());
  return () => { stopped = true; clearInterval(id); };
}

/** Convert an audio-clock time (seconds) into the performance.now() domain (ms) used by input events. */
export function audioTimeToPerfMs(audio: AudioEngine, audioTime: number): number {
  return performance.now() + (audioTime - audio.now()) * 1000;
}

/** Mean and population standard deviation. */
export function meanSd(values: number[]): { mean: number; sd: number } {
  if (!values.length) return { mean: 0, sd: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sd = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
  return { mean, sd };
}
