import { describe, it, expect } from "vitest";
import { EAR_LEVELS, compareNote, contourWords, generatePhrase, guidance, noteName, ordinal, stepHint, stepName, firstStepHint } from "../generator/ear";
import { isInScale } from "../music/scales";
import type { ScaleId } from "../types";

const G: ScaleId = { key: "G", mode: "major" };

describe("ear phrases", () => {
  it("has five levels from three to five notes", () => {
    expect(EAR_LEVELS).toHaveLength(5);
    expect(EAR_LEVELS[0].notes).toBe(3);
    expect(EAR_LEVELS[4].notes).toBe(5);
  });
  it("is deterministic for a seed and stays in the key", () => {
    const a = generatePhrase(3, G, "x");
    const b = generatePhrase(3, G, "x");
    expect(a.midis).toEqual(b.midis);
    expect(a.midis).toHaveLength(4);
    for (const m of a.midis) expect(isInScale(m, G)).toBe(true);
  });
  it("starts on the tonic, third or fifth and respects the leap limit", () => {
    for (const { level, maxLeap, notes } of EAR_LEVELS) {
      for (let s = 0; s < 40; s++) {
        const p = generatePhrase(level, G, `l${level}-${s}`);
        expect(p.degrees).toHaveLength(notes);
        expect([1, 3, 5]).toContain(p.degrees[0]);
        for (let i = 1; i < p.degrees.length; i++) {
          const d = Math.abs(p.degrees[i] - p.degrees[i - 1]);
          expect(d).toBeGreaterThan(0);
          expect(d).toBeLessThanOrEqual(maxLeap);
        }
      }
    }
  });
  it("level 1 only moves by step; level 5 varies", () => {
    for (let s = 0; s < 30; s++) {
      const p = generatePhrase(1, G, `s${s}`);
      for (let i = 1; i < p.degrees.length; i++) expect(Math.abs(p.degrees[i] - p.degrees[i - 1])).toBe(1);
    }
    const shapes = new Set<string>();
    for (let s = 0; s < 40; s++) shapes.add(generatePhrase(5, G, `v${s}`).degrees.join(","));
    expect(shapes.size).toBeGreaterThan(10);
  });
  it("names notes in the key's spelling", () => {
    expect(noteName(66, G)).toBe("F♯");
    expect(noteName(70, { key: "Bb", mode: "major" })).toBe("B♭");
  });
  it("says higher or lower, never wrong", () => {
    expect(compareNote(69, 69)).toBe("right");
    expect(compareNote(69, 67)).toBe("higher");
    expect(compareNote(69, 71)).toBe("lower");
    expect(guidance(69, 71, G, 3, 4)).toBe("The last one is lower than B.");
    expect(guidance(69, 67, G, 0, 4)).toBe("The first one is higher than G.");
    expect(guidance(69, 69, G, 1, 4)).toBe("Note 2 is A.");
  });
  it("describes the contour in words", () => {
    expect(contourWords([67, 71, 69, 76])).toBe("up, a little down, then a jump up");
    expect(contourWords([67])).toBe("");
    expect(contourWords([67, 69])).toBe("up");
  });
  it("places a note relative to the one before on the staff", () => {
    // Treble: G4 = step 6 (second line), A4 = step 5 (second space), B4 = step 4 (middle line).
    expect(stepHint(67, 69, 6, 5, G)).toBe("A sits in the space just above G.");
    expect(stepHint(69, 67, 5, 6, G)).toBe("G sits on the line just below A.");
    expect(stepHint(67, 71, 6, 4, G)).toContain("skip the space in between");
    expect(firstStepHint(67, 6, G)).toBe("G sits on the second line from the bottom.");
    expect(firstStepHint(60, 10, { key: "C", mode: "major" })).toContain("middle C");
  });
  it("names a staff step in the key's spelling", () => {
    expect(stepName(6, { ...G, notes: ["G", "A", "B", "C", "D", "E", "F#"] })).toBe("G");
    expect(stepName(0, { ...G, notes: ["G", "A", "B", "C", "D", "E", "F#"] })).toBe("F♯");
    expect(stepName(4, G)).toBe("B");
    expect(stepName(10, G)).toBe("C");
  });
  it("writes ordinals", () => {
    expect([1, 2, 3, 4, 11, 22].map(ordinal)).toEqual(["1st", "2nd", "3rd", "4th", "11th", "22nd"]);
  });
});
