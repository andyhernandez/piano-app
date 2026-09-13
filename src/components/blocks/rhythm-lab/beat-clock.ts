import type { AudioEngine } from "@/lib/audio/engine";

/**
 * Start a metronome-driven beat clock. Uses the audio engine's metronome (accurate, audible); if the engine is
 * not unlocked yet it falls back to a silent setInterval so the game never hangs. Returns a stop function.
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
