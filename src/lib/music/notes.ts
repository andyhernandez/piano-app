import type { PitchClass, Clef } from "../types";

export const SHARP_NAMES: PitchClass[] = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export const FLAT_NAMES: PitchClass[] = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

const PC_INDEX: Record<string, number> = {
  C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11,
};

export function pcIndex(pc: PitchClass): number {
  return PC_INDEX[pc];
}

export function midiToPc(midi: number, preferFlats = false): PitchClass {
  const names = preferFlats ? FLAT_NAMES : SHARP_NAMES;
  return names[((midi % 12) + 12) % 12];
}

export function midiToOctave(midi: number): number {
  return Math.floor(midi / 12) - 1;
}

/** Scientific pitch name like "C4", "Bb3". */
export function midiToName(midi: number, preferFlats = false): string {
  return `${midiToPc(midi, preferFlats)}${midiToOctave(midi)}`;
}

export function nameToMidi(name: string): number {
  const m = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(name.trim());
  if (!m) throw new Error(`Bad note name: ${name}`);
  const pc = (m[1].toUpperCase() + m[2]) as PitchClass;
  return (Number(m[3]) + 1) * 12 + pcIndex(pc);
}

export function pcToMidi(pc: PitchClass, octave: number): number {
  return (octave + 1) * 12 + pcIndex(pc);
}

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function freqToMidi(freq: number): number {
  return 69 + 12 * Math.log2(freq / 440);
}

/** Cents deviation of freq from nearest MIDI note; returns [nearestMidi, cents]. */
export function freqToNearest(freq: number): [number, number] {
  const m = freqToMidi(freq);
  const nearest = Math.round(m);
  return [nearest, (m - nearest) * 100];
}

export function isBlackKey(midi: number): boolean {
  return [1, 3, 6, 8, 10].includes(((midi % 12) + 12) % 12);
}

/** Pretty display with unicode accidentals. */
export function prettyPc(pc: PitchClass): string {
  return pc.replace("#", "♯").replace("b", "♭");
}

/** VexFlow key string like "c/4", "bb/3". */
export function midiToVexKey(midi: number, preferFlats = false): string {
  const pc = midiToPc(midi, preferFlats);
  return `${pc.toLowerCase()}/${midiToOctave(midi)}`;
}

/** Suggest a clef for a MIDI number. */
export function clefFor(midi: number): Clef {
  return midi >= 60 ? "treble" : "bass";
}

export const MIDDLE_C = 60;
