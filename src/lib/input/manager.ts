"use client";
import type { InputMode, NoteEvent, OnsetEvent } from "../types";
import type { InputSource } from "./source";
import { Emitter } from "./source";
import { MidiInputSource, probeMidi } from "./midi";
import { MicInputSource, type MicCalibration, micPermissionState } from "./mic";
import { TapInputSource } from "./tap";

type Listener = () => void;

/**
 * Single input hub for the whole app. Blocks subscribe here. The on-screen keyboard and tap pad always feed
 * the hub too, so a kid without hardware still plays the same games.
 */
class InputManager {
  mode: InputMode = "timer";
  label = "Tap pad";
  private source: InputSource | null = null;
  readonly tap = new TapInputSource();
  private emitter = new Emitter();
  private unsubs: (() => void)[] = [];
  private changeListeners = new Set<Listener>();
  private started = false;

  constructor() {
    this.tap.onNote((e) => this.emitter.emitNote(e));
    this.tap.onOnset((e) => this.emitter.emitOnset(e));
  }

  /** Detect the best available mode (§10). Preference: midi > mic (if already granted) > timer. */
  async autoDetect(preference: InputMode | "auto", calibration: MicCalibration | null): Promise<InputMode> {
    if (preference !== "auto") {
      await this.use(preference, calibration);
      return this.mode;
    }
    if (await probeMidi()) {
      await this.use("midi", calibration);
      return this.mode;
    }
    if ((await micPermissionState()) === "granted" && calibration) {
      await this.use("mic", calibration);
      return this.mode;
    }
    await this.use("timer", calibration);
    return this.mode;
  }

  async use(mode: InputMode, calibration: MicCalibration | null): Promise<void> {
    this.teardownSource();
    try {
      if (mode === "midi") {
        const s = new MidiInputSource();
        await s.start();
        if (!s.connected) { s.stop(); throw new Error("no device"); }
        this.attach(s);
      } else if (mode === "mic") {
        const s = new MicInputSource(calibration ?? undefined);
        await s.start();
        this.attach(s);
      } else {
        this.mode = "timer";
        this.label = "Tap pad";
      }
    } catch {
      this.mode = "timer";
      this.label = "Tap pad";
    }
    this.started = true;
    this.notify();
  }

  private attach(s: InputSource) {
    this.source = s;
    this.mode = s.mode;
    this.label = s.label;
    this.unsubs.push(s.onNote((e) => this.emitter.emitNote(e)));
    this.unsubs.push(s.onOnset((e) => this.emitter.emitOnset(e)));
  }

  private teardownSource() {
    for (const u of this.unsubs) u();
    this.unsubs = [];
    this.source?.stop();
    this.source = null;
  }

  get micSource(): MicInputSource | null {
    return this.source instanceof MicInputSource ? this.source : null;
  }

  get isStarted() { return this.started; }

  onNote(fn: (e: NoteEvent) => void) { return this.emitter.onNote(fn); }
  onOnset(fn: (e: OnsetEvent) => void) { return this.emitter.onOnset(fn); }
  onChange(fn: Listener) { this.changeListeners.add(fn); return () => { this.changeListeners.delete(fn); }; }
  private notify() { for (const fn of this.changeListeners) fn(); }

  async verifyChord(midis: number[], windowMs = 500): Promise<"heard" | "unscored"> {
    if (this.source?.verifyChord) return this.source.verifyChord(midis, windowMs);
    return "unscored";
  }

  stop() { this.teardownSource(); this.mode = "timer"; this.notify(); }
}

let manager: InputManager | null = null;
export function getInput(): InputManager {
  if (!manager) manager = new InputManager();
  return manager;
}
export type { InputManager };
