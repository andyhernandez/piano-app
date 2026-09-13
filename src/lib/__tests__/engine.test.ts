import { describe, expect, it } from "vitest";
import { deriveWeights, blockDurations, normalize, BASE_WEIGHTS } from "../engine/weights";
import { emptyStreak, recordPractice, reconcile, grantFreeze, MAX_FREEZES } from "../engine/streak";
import { companionLevel, xpToNextLevel } from "../engine/xp";
import { scoreTiming, scoreScaleRun, scoreReading, lcsLength, scoreRhythm } from "../engine/scoring";
import { generateExercise } from "../generator/sightreading";
import { BLOCK_ORDER, type NoteEvent } from "../types";
import { addDays } from "../utils/date";

const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);

describe("weights", () => {
  it("base weights sum to 1", () => expect(sum(BASE_WEIGHTS)).toBeCloseTo(1));
  it("weak eye gets more reading time", () => {
    const w = deriveWeights({ ear: 85, eye: 30, pulse: 50, assessedAt: "" });
    expect(sum(w)).toBeCloseTo(1);
    expect(w.reading).toBeGreaterThan(w.theory);
    expect(w.reading).toBeGreaterThan(w.rhythm);
    expect(w.rhythm).toBeGreaterThan(w.theory);
  });
  it("normalizes and floors", () => {
    const w = normalize({ scales: 1, rhythm: 0, reading: 0, theory: 0, repertoire: 0, improv: 0 });
    expect(sum(w)).toBeCloseTo(1);
    for (const b of BLOCK_ORDER) expect(w[b]).toBeGreaterThan(0.05);
  });
  it("durations add up exactly", () => {
    const d = blockDurations(deriveWeights(null), 20);
    expect(sum(d)).toBe(1200);
    const d2 = blockDurations(deriveWeights({ ear: 10, eye: 90, pulse: 40, assessedAt: "" }), 17);
    expect(sum(d2)).toBe(1020);
  });
});

describe("streak", () => {
  const d0 = "2026-03-02"; // Monday
  it("counts consecutive days and earns a freeze every 5", () => {
    let s = emptyStreak();
    let earned = 0;
    for (let i = 0; i < 5; i++) {
      const r = recordPractice(s, addDays(d0, i));
      s = r.streak;
      if (r.earnedFreeze) earned++;
    }
    expect(s.current).toBe(5);
    expect(s.best).toBe(5);
    expect(s.freezes).toBe(1);
    expect(earned).toBe(1);
  });
  it("is idempotent for the same day", () => {
    const a = recordPractice(emptyStreak(), d0).streak;
    const b = recordPractice(a, d0).streak;
    expect(b.current).toBe(1);
  });
  it("auto-uses a freeze on a missed day", () => {
    let s = emptyStreak();
    for (let i = 0; i < 5; i++) s = recordPractice(s, addDays(d0, i)).streak;
    // Skip day 5, practise day 6.
    const r = recordPractice(s, addDays(d0, 6)).streak;
    expect(r.freezes).toBe(0);
    expect(r.freezeDates).toEqual([addDays(d0, 5)]);
    expect(r.current).toBe(6);
  });
  it("resets when no freeze is available", () => {
    let s = emptyStreak();
    for (let i = 0; i < 3; i++) s = recordPractice(s, addDays(d0, i)).streak;
    const r = reconcile(s, addDays(d0, 5));
    expect(r.current).toBe(0);
    const again = recordPractice(r, addDays(d0, 5)).streak;
    expect(again.current).toBe(1);
    expect(again.best).toBe(3);
  });
  it("today is never a gap", () => {
    const s = recordPractice(emptyStreak(), d0).streak;
    expect(reconcile(s, addDays(d0, 1)).current).toBe(1);
  });
  it("caps freezes", () => {
    let s = { ...emptyStreak(), freezes: MAX_FREEZES };
    s = grantFreeze(s);
    expect(s.freezes).toBe(MAX_FREEZES);
  });
});

describe("xp", () => {
  it("levels up gently", () => {
    expect(companionLevel(0)).toBe(1);
    expect(companionLevel(299)).toBe(1);
    expect(companionLevel(300)).toBe(2);
    expect(companionLevel(300 + 375)).toBe(3);
    expect(xpToNextLevel(350)).toEqual({ level: 2, into: 50, need: 375 });
  });
});

describe("scoring", () => {
  it("lcs", () => {
    expect(lcsLength([1, 2, 3, 4], [1, 3, 4])).toBe(3);
    expect(lcsLength([1, 2, 3], [4, 5])).toBe(0);
  });
  it("timing: perfect taps score ~100, misses lower", () => {
    const exp = [0, 500, 1000, 1500];
    expect(scoreTiming(exp, exp).score).toBe(100);
    const late = scoreTiming(exp, exp.map((t) => t + 60));
    expect(late.score).toBeGreaterThan(80);
    expect(late.hits).toBe(4);
    const missing = scoreTiming(exp, [0, 500]);
    expect(missing.misses).toBe(2);
    expect(missing.score).toBeLessThan(60);
    expect(scoreTiming(exp, [...exp, 250, 750, 1250]).extras).toBe(3);
  });
  it("rhythm badge only on a clean run", () => {
    const exp = [0, 500, 1000, 1500, 2000];
    expect(scoreRhythm(exp, exp, "midi").badge).toBe("steady-pulse");
    expect(scoreRhythm(exp, [0, 500, 1000, 1500], "midi").badge).toBeNull();
  });
  it("scale run: clean even playing earns Clean Scale", () => {
    const expected = [60, 62, 64, 65, 67, 69, 71, 72, 71, 69, 67, 65, 64, 62, 60];
    const bpm = 60;
    const events: NoteEvent[] = expected.map((m, i) => ({ midi: m, velocity: 0.8, time: i * 1000, kind: "on", confidence: 1 }));
    const s = scoreScaleRun(expected, events, bpm, "midi");
    expect(s.score).toBeGreaterThan(90);
    expect(s.badge).toBe("clean-scale");
    const sloppy = expected.map((m, i) => ({ midi: i === 3 ? 66 : m, velocity: 0.8, time: i * (900 + (i % 3) * 200), kind: "on" as const, confidence: 1 }));
    const s2 = scoreScaleRun(expected, sloppy, bpm, "midi");
    expect(s2.score).toBeLessThan(s.score);
    expect(s2.components.wrongNotes).toBe(1);
  });
  it("reading: continuity dominates", () => {
    const ex = generateExercise({ level: 1, scale: { key: "C", mode: "major" }, seed: "test-seed" });
    const beatMs = 60_000 / ex.tempo;
    const start = 1000;
    const notes = ex.notes.filter((n) => n.midi != null);
    // Play every note on time but all wrong pitches → high continuity, low pitch.
    const wrongPitch: NoteEvent[] = notes.map((n) => ({ midi: 97, velocity: 1, time: start + (n.bar * 4 + n.beat) * beatMs, kind: "on", confidence: 1 }));
    const a = scoreReading(ex, wrongPitch, start, "midi");
    expect(a.components.continuity).toBeGreaterThanOrEqual(90);
    expect(a.components.pitch).toBe(0);
    expect(a.badge).toBe("no-stop-reading");
    // Play right pitches, then stop halfway.
    const half: NoteEvent[] = notes.slice(0, Math.floor(notes.length / 2)).map((n) => ({ midi: n.midi!, velocity: 1, time: start + (n.bar * 4 + n.beat) * beatMs, kind: "on", confidence: 1 }));
    const b = scoreReading(ex, half, start, "midi");
    expect(b.components.continuity).toBeLessThan(60);
    expect(b.badge).toBeNull();
    expect(a.score).toBeGreaterThan(b.score);
    expect(scoreReading(ex, [], start, "midi").score).toBe(0);
  });
});
