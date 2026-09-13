export interface IntervalDef {
  semitones: number;
  short: string;
  name: string;
}

export const INTERVALS: IntervalDef[] = [
  { semitones: 1, short: "m2", name: "minor 2nd" },
  { semitones: 2, short: "M2", name: "major 2nd" },
  { semitones: 3, short: "m3", name: "minor 3rd" },
  { semitones: 4, short: "M3", name: "major 3rd" },
  { semitones: 5, short: "P4", name: "perfect 4th" },
  { semitones: 6, short: "TT", name: "tritone" },
  { semitones: 7, short: "P5", name: "perfect 5th" },
  { semitones: 8, short: "m6", name: "minor 6th" },
  { semitones: 9, short: "M6", name: "major 6th" },
  { semitones: 10, short: "m7", name: "minor 7th" },
  { semitones: 11, short: "M7", name: "major 7th" },
  { semitones: 12, short: "P8", name: "octave" },
];

/** Interval pools by theory level (1-5). */
export function intervalPool(level: number): IntervalDef[] {
  if (level <= 1) return INTERVALS.filter((i) => [2, 4, 7, 12].includes(i.semitones));
  if (level === 2) return INTERVALS.filter((i) => [2, 3, 4, 5, 7, 12].includes(i.semitones));
  if (level === 3) return INTERVALS.filter((i) => [1, 2, 3, 4, 5, 7, 9, 12].includes(i.semitones));
  if (level === 4) return INTERVALS.filter((i) => i.semitones !== 6);
  return INTERVALS;
}

export function intervalBySemitones(n: number): IntervalDef | undefined {
  return INTERVALS.find((i) => i.semitones === n);
}
