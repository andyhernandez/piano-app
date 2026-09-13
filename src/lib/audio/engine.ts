/**
 * Audio engine interface (§2: design audio behind an interface so the native wrapper can swap it).
 * All times are in seconds on the engine's clock unless noted.
 */
export type GrooveId = "pop" | "waltz" | "blues" | "lofi";

export interface MetronomeOptions {
  bpm: number;
  /** Beats per bar for the accent (0 = no accent). */
  beatsPerBar: number;
  /** Called on each click with the beat index within the bar and the scheduled audio time. */
  onBeat?: (beat: number, time: number) => void;
}

export interface AudioEngine {
  /** Must be called from a user gesture (tap) before any sound. Idempotent. */
  unlock(): Promise<void>;
  readonly ready: boolean;
  /** Current time on the audio clock (seconds). */
  now(): number;
  /** Play a note. duration in seconds. velocity 0-1. */
  playNote(midi: number, duration?: number, velocity?: number, when?: number): void;
  noteOn(midi: number, velocity?: number): void;
  noteOff(midi: number): void;
  /** Play notes simultaneously. */
  playChord(midis: number[], duration?: number, velocity?: number, when?: number): void;
  /** Play notes in sequence with a gap (seconds) between onsets. Returns total length in seconds. */
  playSequence(midis: number[], gap: number, duration?: number, velocity?: number): number;
  /** Click sounds. */
  click(accent?: boolean, when?: number): void;
  bell(): void;
  /** Success/failure stingers for UI feedback. */
  stinger(kind: "success" | "fail" | "pop" | "levelup"): void;
  startMetronome(opts: MetronomeOptions): void;
  stopMetronome(): void;
  setMetronomeBpm(bpm: number): void;
  readonly metronomeRunning: boolean;
  /** Backing loop for the Creative Sandbox. rootMidi sets the bass key. */
  startGroove(groove: GrooveId, rootMidi: number, bpm: number, minor?: boolean): void;
  stopGroove(): void;
  setGrooveBpm(bpm: number): void;
  readonly grooveRunning: boolean;
  /** Master volume 0-1. */
  setVolume(v: number): void;
  dispose(): void;
}
