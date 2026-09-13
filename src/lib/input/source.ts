import type { InputMode, NoteEvent, OnsetEvent } from "../types";

export type NoteListener = (e: NoteEvent) => void;
export type OnsetListener = (e: OnsetEvent) => void;

/**
 * Input source interface (§10). Every block subscribes to note and onset events and never cares whether they
 * came from MIDI, a microphone, or the on-screen tap pad.
 */
export interface InputSource {
  readonly mode: InputMode;
  readonly connected: boolean;
  /** Human-readable device label. */
  readonly label: string;
  start(): Promise<void>;
  stop(): void;
  onNote(fn: NoteListener): () => void;
  onOnset(fn: OnsetListener): () => void;
  /** Mic-only: verify that a specific chord is sounding within `windowMs`. Resolves "heard" | "unscored". */
  verifyChord?(midis: number[], windowMs?: number): Promise<"heard" | "unscored">;
}

export class Emitter {
  private notes = new Set<NoteListener>();
  private onsets = new Set<OnsetListener>();
  onNote(fn: NoteListener) { this.notes.add(fn); return () => { this.notes.delete(fn); }; }
  onOnset(fn: OnsetListener) { this.onsets.add(fn); return () => { this.onsets.delete(fn); }; }
  emitNote(e: NoteEvent) { for (const fn of this.notes) fn(e); }
  emitOnset(e: OnsetEvent) { for (const fn of this.onsets) fn(e); }
  clear() { this.notes.clear(); this.onsets.clear(); }
}

export function nowMs(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}
