import { describe, expect, it } from "vitest";
import { buildScale, degreeOf, degreeToMidi, invertTriad, isInScale, primaryTriads, scaleRunMidi, scaleSlug, parseScaleSlug, spellInScale } from "../music/scales";
import { DEFAULT_ROADMAP } from "../music/roadmap";
import { midiToName, nameToMidi, midiToFreq, freqToNearest } from "../music/notes";

describe("notes", () => {
  it("round-trips names", () => {
    expect(midiToName(60)).toBe("C4");
    expect(nameToMidi("C4")).toBe(60);
    expect(nameToMidi("Bb3")).toBe(58);
    expect(midiToName(58, true)).toBe("Bb3");
  });
  it("frequencies", () => {
    expect(midiToFreq(69)).toBeCloseTo(440);
    expect(freqToNearest(442)[0]).toBe(69);
    expect(Math.abs(freqToNearest(442)[1])).toBeLessThan(10);
  });
});

describe("scales", () => {
  it("builds C major", () => {
    const s = buildScale({ key: "C", mode: "major" });
    expect(s.notes).toEqual(["C", "D", "E", "F", "G", "A", "B"]);
    expect(s.midiOneOctave).toEqual([60, 62, 64, 65, 67, 69, 71, 72]);
    expect(s.accidentals).toBe(0);
    expect(s.triads[0].quality).toBe("major");
    expect(s.triads[5].quality).toBe("minor");
    expect(s.triads[6].quality).toBe("diminished");
    expect(s.triads[4].midi).toEqual([67, 71, 74]);
  });
  it("spells flat keys with flats", () => {
    const s = buildScale({ key: "Bb", mode: "major" });
    expect(s.notes).toEqual(["Bb", "C", "D", "Eb", "F", "G", "A"]);
    expect(s.accidentals).toBe(-2);
    expect(s.vexKey).toBe("Bb");
    expect(spellInScale(63, s)).toBe("Eb");
  });
  it("builds harmonic minor with a major V", () => {
    const s = buildScale({ key: "A", mode: "harmonic-minor" });
    expect(s.notes).toEqual(["A", "B", "C", "D", "E", "F", "G#"]);
    expect(s.triads[4].quality).toBe("major");
    expect(s.vexKey).toBe("Am");
  });
  it("has 15-note two-octave fingerings for every roadmap scale", () => {
    for (const id of DEFAULT_ROADMAP) {
      const s = buildScale(id);
      expect(s.fingeringRH).toHaveLength(15);
      expect(s.fingeringLH).toHaveLength(15);
      for (const f of [...s.fingeringRH, ...s.fingeringLH]) expect(f).toBeGreaterThanOrEqual(1);
      for (const f of [...s.fingeringRH, ...s.fingeringLH]) expect(f).toBeLessThanOrEqual(5);
      // Adjacent notes never reuse a finger.
      for (let i = 1; i < 15; i++) expect(s.fingeringRH[i], `${s.name} RH ${i}`).not.toBe(s.fingeringRH[i - 1]);
      for (let i = 1; i < 15; i++) expect(s.fingeringLH[i], `${s.name} LH ${i}`).not.toBe(s.fingeringLH[i - 1]);
      // Second octave repeats the first octave's fingers (positions 1..7 vs 8..14).
      for (let i = 1; i <= 6; i++) expect(s.fingeringRH[i + 7], `${s.name} RH octave repeat ${i}`).toBe(s.fingeringRH[i]);
    }
  });
  it("marks thumb crossings", () => {
    const c = buildScale({ key: "C", mode: "major" });
    expect(c.thumbUnderRH).toEqual([3, 7, 10]);
    expect(c.fingeringRH[14]).toBe(5);
    expect(c.fingeringLH[14]).toBe(1);
  });
  it("scale run goes up two octaves and back", () => {
    const run = scaleRunMidi(buildScale({ key: "C", mode: "major" }), 4, 2);
    expect(run).toHaveLength(29);
    expect(run[0]).toBe(60);
    expect(run[14]).toBe(84);
    expect(run[28]).toBe(60);
  });
  it("degree helpers", () => {
    const g = { key: "G" as const, mode: "major" as const };
    expect(isInScale(66, g)).toBe(true); // F#
    expect(isInScale(65, g)).toBe(false);
    expect(degreeOf(67, g)).toBe(1);
    expect(degreeOf(66, g)).toBe(7);
    expect(degreeToMidi(1, g, 4)).toBe(67);
    expect(degreeToMidi(8, g, 4)).toBe(79);
  });
  it("primary triads and inversions", () => {
    const s = buildScale({ key: "C", mode: "major" });
    expect(primaryTriads(s).map((t) => t.roman)).toEqual(["I", "IV", "V", "vi"]);
    expect(invertTriad([60, 64, 67], 1)).toEqual([64, 67, 72]);
    expect(invertTriad([60, 64, 67], 2)).toEqual([67, 72, 76]);
  });
  it("slugs", () => {
    expect(scaleSlug({ key: "Bb", mode: "major" })).toBe("Bb-major");
    expect(parseScaleSlug("A-natural-minor")).toEqual({ key: "A", mode: "natural-minor" });
  });
});
