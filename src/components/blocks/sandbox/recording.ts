import type { NoteEvent, Recording } from "@/lib/types";
import type { GrooveId } from "@/lib/audio/engine";
import type { CapturedAudio } from "./audio-capture";

export const MIDI_MIME = "application/x-keycadence-midi";

/** An unsaved improv take. Event times are relative to the start of the take (ms). */
export interface Take {
  events: NoteEvent[];
  groove: GrooveId;
  bpm: number;
  durationMs: number;
  audio: CapturedAudio | null;
}

export interface ReplayNote {
  atMs: number;
  midi: number;
  durSec: number;
  velocity: number;
}

/** Pair note-ons with their note-offs into playable notes. Times are relative ms. */
export function replayNotes(events: NoteEvent[]): { notes: ReplayNote[]; totalMs: number } {
  const sorted = [...events].sort((a, b) => a.time - b.time);
  const open = new Map<number, ReplayNote>();
  const notes: ReplayNote[] = [];
  let totalMs = 0;
  for (const e of sorted) {
    if (e.kind === "on") {
      const prev = open.get(e.midi);
      if (prev) prev.durSec = Math.max(0.05, (e.time - prev.atMs) / 1000);
      const n: ReplayNote = { atMs: e.time, midi: e.midi, durSec: 0.6, velocity: e.velocity || 0.8 };
      open.set(e.midi, n);
      notes.push(n);
    } else {
      const n = open.get(e.midi);
      if (n) { n.durSec = Math.min(6, Math.max(0.08, (e.time - n.atMs) / 1000)); open.delete(e.midi); }
    }
    totalMs = Math.max(totalMs, e.time);
  }
  for (const n of notes) totalMs = Math.max(totalMs, n.atMs + n.durSec * 1000);
  return { notes, totalMs };
}

export function isMidiRecording(r: Recording): boolean {
  return Array.isArray(r.midiEvents) && r.midiEvents.length > 0;
}

export function defaultJamTitle(scaleName: string, n: number): string {
  return `Jam in ${scaleName} #${n}`;
}

export function formatTakeLength(ms: number): string {
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
}
