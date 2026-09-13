"use client";
import type { AudioEngine } from "./engine";

let engine: AudioEngine | null = null;

/** Lazily construct the Tone engine on the client. Call `await getAudio().unlock()` from a tap handler. */
export function getAudio(): AudioEngine {
  if (!engine) {
    if (typeof window === "undefined") return silentEngine;
    // Dynamic require keeps Tone out of server bundles.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ToneAudioEngine } = require("./tone-engine") as typeof import("./tone-engine");
    engine = new ToneAudioEngine();
  }
  return engine;
}

/** No-op engine for SSR and tests. */
export const silentEngine: AudioEngine = {
  ready: false,
  metronomeRunning: false,
  grooveRunning: false,
  async unlock() {},
  now: () => (typeof performance !== "undefined" ? performance.now() / 1000 : 0),
  playNote() {}, noteOn() {}, noteOff() {}, playChord() {}, playSequence: () => 0,
  click() {}, bell() {}, stinger() {},
  startMetronome() {}, stopMetronome() {}, setMetronomeBpm() {},
  startGroove() {}, stopGroove() {}, setGrooveBpm() {},
  setVolume() {}, dispose() {},
};

export type { AudioEngine, GrooveId, MetronomeOptions } from "./engine";
