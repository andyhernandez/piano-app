import type { Exercise, ExNote } from "@/lib/generator/sightreading";
import type { RhythmPattern } from "@/lib/generator/rhythm";
import type { Scale, ScaleId } from "@/lib/types";
import type { StaffNote, StaffRest, StaffSystem, NoteValue, NoteState, Accidental } from "./staff";
import { prefersFlats } from "@/lib/music/scales";
import { midiToPc } from "@/lib/music/notes";

/*
 * Adapters from the engine's music to the design system's Staff.
 * Staff steps: 0 is the top line, each step is half a space, 8 is the bottom line.
 *   treble: 0=F5 … 4=B4 … 8=E4, 10=C4 (first ledger below)
 *   bass:   0=A3 … 4=D3 … 8=G2, -2=C4 (first ledger above)
 */
const LETTER_INDEX: Record<string, number> = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };

/** Diatonic position of a midi note: letter index within the octave and the spelled octave. */
function diatonic(midi: number, flats: boolean): { letter: string; octave: number; accidental: Accidental | null } {
  const pc = midiToPc(midi, flats);
  const letter = pc[0];
  const accidental: Accidental | null = pc.includes("#") ? "sharp" : pc.includes("b") ? "flat" : null;
  const octave = Math.floor(midi / 12) - 1;
  return { letter, octave, accidental };
}

/** Staff step for a midi note on a clef. */
export function midiToStep(midi: number, clef: "treble" | "bass", flats = false): number {
  const { letter, octave } = diatonic(midi, flats);
  const absolute = octave * 7 + LETTER_INDEX[letter]; // C4 = 4*7+0 = 28
  const topLine = clef === "treble" ? 5 * 7 + LETTER_INDEX.F : 3 * 7 + LETTER_INDEX.A; // F5 = 38, A3 = 26
  return topLine - absolute;
}

/** Key signature accidentals for a scale, as the Staff wants them (left offsets and steps for a clef). */
export function keySignatureFor(scale: Scale | ScaleId & { accidentals?: number }, clef: "treble" | "bass"): StaffSystem["keySignature"] {
  const n = "accidentals" in scale ? scale.accidentals ?? 0 : 0;
  if (!n) return [];
  const sharpsTreble = [0, 3, -1, 2, 5, 1, 4]; // F C G D A E B
  const flatsTreble = [4, 1, 5, 2, 6, 3, 7]; // B E A D G C F
  const sharpsBass = sharpsTreble.map((s) => s + 2);
  const flatsBass = flatsTreble.map((s) => s + 2);
  const steps = n > 0 ? (clef === "treble" ? sharpsTreble : sharpsBass) : (clef === "treble" ? flatsTreble : flatsBass);
  const count = Math.abs(n);
  const left0 = clef === "treble" ? 74 : 60;
  return Array.from({ length: count }, (_, i) => ({ accidental: (n > 0 ? "sharp" : "flat") as Accidental, left: left0 + i * 13, step: steps[i] }));
}

export function valueOf(beats: number): { value: NoteValue; dotted: boolean } {
  switch (beats) {
    case 4: return { value: "whole", dotted: false };
    case 3: return { value: "half", dotted: true };
    case 2: return { value: "half", dotted: false };
    case 1.5: return { value: "quarter", dotted: true };
    case 1: return { value: "quarter", dotted: false };
    case 0.75: return { value: "eighth", dotted: true };
    case 0.5: return { value: "eighth", dotted: false };
    case 0.25: return { value: "sixteenth", dotted: false };
    default: return { value: "quarter", dotted: false };
  }
}

/** Whether a note needs an explicit accidental beyond the key signature. */
function needsAccidental(midi: number, scale: Scale, flats: boolean): Accidental | undefined {
  const { accidental, letter } = diatonic(midi, flats);
  const inKey = scale.notes.some((n) => n[0] === letter && (n.includes("#") ? "sharp" : n.includes("b") ? "flat" : null) === accidental);
  if (inKey) return undefined;
  return accidental ?? "natural";
}

export interface StaffLine { systems: StaffSystem[]; notes: StaffNote[]; rests: StaffRest[]; bars: number; firstBar: number }

/**
 * Split an exercise into staff lines of `barsPerLine` bars. Each line is one Staff render.
 * `states` maps note index (into exercise.notes) to a display state.
 */
export function exerciseToLines(ex: Exercise, scale: Scale, opts: { barsPerLine?: number; states?: Map<number, NoteState>; lhChord?: boolean } = {}): StaffLine[] {
  const barsPerLine = opts.barsPerLine ?? 4;
  const flats = prefersFlats(scale);
  const grand = ex.hands === "together" || ex.hands === "alternating";
  const lines: StaffLine[] = [];
  const beamCounter = { n: 0 };
  for (let first = 0; first < ex.bars; first += barsPerLine) {
    const bars = Math.min(barsPerLine, ex.bars - first);
    const trebleSys: StaffSystem = { clef: ex.hands === "LH" ? "bass" : "treble", top: 44, keySignature: keySignatureFor(scale, ex.hands === "LH" ? "bass" : "treble"), timeSignature: first === 0 ? [ex.timeSig[0], ex.timeSig[1]] : undefined, timeLeft: 132 };
    const systems: StaffSystem[] = grand ? [trebleSys, { clef: "bass", top: 180, keySignature: keySignatureFor(scale, "bass"), timeSignature: first === 0 ? [ex.timeSig[0], ex.timeSig[1]] : undefined, timeLeft: 132 }] : [trebleSys];
    const notes: StaffNote[] = [];
    const rests: StaffRest[] = [];
    // Beam eighths that fall within the same beat pair.
    let beamId: string | null = null;
    let beamBeatGroup = -1;
    ex.notes.forEach((n: ExNote, idx) => {
      if (n.bar < first || n.bar >= first + bars) return;
      const bar = n.bar - first;
      const { value, dotted } = valueOf(n.beats);
      const state = opts.states?.get(idx);
      const system = grand && n.hand === "LH" ? 1 : 0;
      const clef: "treble" | "bass" = system === 1 || ex.hands === "LH" ? "bass" : "treble";
      if (n.midi == null) {
        rests.push({ bar, beat: n.beat, value, system, state });
        beamId = null;
        return;
      }
      let beam: string | undefined;
      if (value === "eighth" && !dotted) {
        const group = n.bar * 8 + Math.floor(n.beat / 2);
        if (beamBeatGroup !== group || beamId === null) { beamId = "b" + beamCounter.n++; beamBeatGroup = group; }
        beam = beamId;
      } else { beamId = null; }
      notes.push({ bar, beat: n.beat, step: midiToStep(n.midi, clef, flats), value, dotted, beam, state, accidental: needsAccidental(n.midi, scale, flats), system });
      if (grand && n.midiLH != null && ex.hands === "together") {
        const lh = n.midiLH;
        const lhValue: NoteValue = opts.lhChord ? "half" : "whole";
        notes.push({ bar, beat: n.beat, step: midiToStep(lh, "bass", flats), value: lhValue, state, system: 1 });
        if (opts.lhChord) {
          notes.push({ bar, beat: n.beat, step: midiToStep(lh + 4, "bass", flats), value: lhValue, state, system: 1 });
          notes.push({ bar, beat: n.beat, step: midiToStep(lh + 7, "bass", flats), value: lhValue, state, system: 1 });
        }
      }
    });
    // Alternating hands: bars for the other hand get a whole rest.
    if (ex.hands === "alternating") {
      for (let b = 0; b < bars; b++) {
        const hasRH = notes.some((x) => x.bar === b && x.system === 0) || rests.some((x) => x.bar === b && x.system === 0);
        const hasLH = notes.some((x) => x.bar === b && x.system === 1) || rests.some((x) => x.bar === b && x.system === 1);
        if (!hasRH) rests.push({ bar: b, beat: 1.5, value: "whole", system: 0 });
        if (!hasLH) rests.push({ bar: b, beat: 1.5, value: "whole", system: 1 });
      }
    }
    lines.push({ systems, notes, rests, bars, firstBar: first });
  }
  return lines;
}

/** A rhythm pattern on one pitch (B4, step 4), rests included. `states` by note index. */
export function rhythmToStaff(p: RhythmPattern, states?: Map<number, NoteState>): { notes: StaffNote[]; rests: StaffRest[]; bars: number } {
  const notes: StaffNote[] = [];
  const rests: StaffRest[] = [];
  let beamId: string | null = null;
  let group = -1;
  let counter = 0;
  p.notes.forEach((n, i) => {
    const bar = Math.floor(n.onset / p.beatsPerBar);
    const beat = n.onset - bar * p.beatsPerBar;
    const { value, dotted } = valueOf(n.beats);
    if (n.rest) { rests.push({ bar, beat, value }); beamId = null; return; }
    let beam: string | undefined;
    if ((value === "eighth" || value === "sixteenth") && !dotted) {
      const g = bar * 16 + Math.floor(beat);
      if (g !== group || beamId === null) { beamId = "r" + counter++; group = g; }
      beam = beamId;
    } else beamId = null;
    notes.push({ bar, beat, step: 4, value, dotted, beam, state: states?.get(i), stem: "up" });
  });
  return { notes, rests, bars: p.bars };
}

/** Steps for a chord (root position triad) on a clef. */
export function chordSteps(midis: number[], clef: "treble" | "bass", flats = false): number[] {
  return midis.map((m) => midiToStep(m, clef, flats));
}
