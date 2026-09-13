import { describe, expect, it } from "vitest";
import { generateExercise, LEVELS, levelSpec, noteTimeline } from "../generator/sightreading";
import { generateRhythm, generateEcho, expectedOnsetsMs, RHYTHM_LEVELS } from "../generator/rhythm";
import { isInScale, degreeOf } from "../music/scales";
import { DEFAULT_ROADMAP } from "../music/roadmap";
import type { ScaleId } from "../types";

const C: ScaleId = { key: "C", mode: "major" };

describe("sight-reading generator", () => {
  it("has 10 levels", () => {
    expect(LEVELS).toHaveLength(10);
    expect(levelSpec(0).level).toBe(1);
    expect(levelSpec(99).level).toBe(10);
  });
  it("is deterministic per seed", () => {
    const a = generateExercise({ level: 3, scale: C, seed: "abc" });
    const b = generateExercise({ level: 3, scale: C, seed: "abc" });
    expect(a.notes).toEqual(b.notes);
    const c = generateExercise({ level: 3, scale: C, seed: "xyz" });
    expect(c.notes).not.toEqual(a.notes);
  });
  it("every bar sums to 4 beats at every level and key", () => {
    for (const scale of DEFAULT_ROADMAP) {
      for (let level = 1; level <= 10; level++) {
        for (let s = 0; s < 5; s++) {
          const ex = generateExercise({ level, scale, seed: `${level}-${s}` });
          expect(ex.bars).toBe(levelSpec(level).bars);
          const perBar = new Array(ex.bars).fill(0);
          for (const n of ex.notes) perBar[n.bar] += n.beats;
          for (const total of perBar) expect(total).toBe(4);
        }
      }
    }
  });
  it("level 1 is stepwise, RH, scale tones only, starts and ends on tonic/dominant", () => {
    for (let s = 0; s < 20; s++) {
      const ex = generateExercise({ level: 1, scale: C, seed: `l1-${s}` });
      const tl = noteTimeline(ex);
      expect(ex.hands).toBe("RH");
      expect(ex.clefs).toEqual(["treble"]);
      for (const n of tl) expect(isInScale(n.midi, C)).toBe(true);
      for (let i = 1; i < tl.length; i++) expect(Math.abs(tl[i].midi - tl[i - 1].midi)).toBeLessThanOrEqual(2);
      expect([1, 5]).toContain(degreeOf(tl[0].midi, C));
      expect([1, 5]).toContain(degreeOf(tl[tl.length - 1].midi, C));
      for (const n of tl) expect(n.midi).toBeGreaterThanOrEqual(60);
      for (const n of tl) expect(n.midi).toBeLessThanOrEqual(67);
    }
  });
  it("no leap larger than a 6th below level 7", () => {
    for (let level = 1; level <= 6; level++) {
      for (let s = 0; s < 10; s++) {
        const ex = generateExercise({ level, scale: { key: "G", mode: "major" }, seed: `leap-${level}-${s}` });
        const tl = noteTimeline(ex);
        for (let i = 1; i < tl.length; i++) {
          if (tl[i].hand !== tl[i - 1].hand) continue; // alternating hands sit in different octaves
          expect(Math.abs(tl[i].midi - tl[i - 1].midi), `${ex.seed} idx ${i}`).toBeLessThanOrEqual(9);
        }
      }
    }
  });
  it("no accidentals before level 6", () => {
    for (let level = 1; level <= 5; level++) {
      for (let s = 0; s < 10; s++) {
        const scale: ScaleId = { key: "Eb", mode: "major" };
        const ex = generateExercise({ level, scale, seed: `acc-${level}-${s}` });
        for (const n of noteTimeline(ex)) expect(isInScale(n.midi, scale)).toBe(true);
      }
    }
  });
  it("hands together from level 8 has LH notes", () => {
    const ex = generateExercise({ level: 8, scale: C, seed: "ht" });
    expect(ex.hands).toBe("together");
    expect(ex.clefs).toEqual(["treble", "bass"]);
    expect(ex.notes.some((n) => n.midiLH != null)).toBe(true);
  });
  it("timeline is monotonic", () => {
    const ex = generateExercise({ level: 9, scale: C, seed: "mono" });
    const tl = noteTimeline(ex);
    for (let i = 1; i < tl.length; i++) expect(tl[i].beat).toBeGreaterThan(tl[i - 1].beat);
  });
});

describe("rhythm generator", () => {
  it("has 10 levels and bars sum to 4", () => {
    expect(RHYTHM_LEVELS).toHaveLength(10);
    for (let level = 1; level <= 10; level++) {
      for (let s = 0; s < 10; s++) {
        const p = generateRhythm(level, `r-${level}-${s}`);
        const perBar = new Array(p.bars).fill(0);
        for (const n of p.notes) perBar[Math.floor(n.onset / 4)] += n.beats;
        for (const total of perBar) expect(total).toBeCloseTo(4);
        expect(p.notes[0].rest).toBe(false);
        expect(p.notes[p.notes.length - 1].rest).toBe(false);
      }
    }
  });
  it("level 1 is all quarter notes", () => {
    const p = generateRhythm(1, "q");
    expect(p.notes.every((n) => n.beats === 1 && !n.rest)).toBe(true);
    expect(expectedOnsetsMs(p)).toEqual([0, 1, 2, 3, 4, 5, 6, 7].map((b) => (b * 60_000) / p.bpm));
  });
  it("echo is one bar", () => {
    const e = generateEcho(5, "echo");
    expect(e.bars).toBe(1);
    expect(e.notes.every((n) => n.onset < 4)).toBe(true);
  });
});
