import { describe, expect, it } from "vitest";
import { detectPitchYIN, OnsetDetector, chordTonesPresent } from "../input/pitch";
import { midiToFreq, freqToNearest } from "../music/notes";

function sine(freq: number, sr: number, n: number, amp = 0.5, harmonics = 1): Float32Array {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let v = 0;
    for (let h = 1; h <= harmonics; h++) v += (amp / h) * Math.sin((2 * Math.PI * freq * h * i) / sr);
    out[i] = v;
  }
  return out;
}

describe("YIN pitch detection", () => {
  const sr = 44100;
  it.each([48, 55, 60, 64, 67, 72, 79])("detects midi %i", (midi) => {
    const f = midiToFreq(midi);
    const r = detectPitchYIN(sine(f, sr, 2048, 0.5, 3), sr);
    expect(r.confidence).toBeGreaterThan(0.8);
    expect(freqToNearest(r.frequency)[0]).toBe(midi);
  });
  it("returns no pitch for silence/noise", () => {
    const silence = new Float32Array(2048);
    expect(detectPitchYIN(silence, sr).confidence).toBe(0);
    const noise = new Float32Array(2048).map(() => Math.random() * 2 - 1);
    const r = detectPitchYIN(noise, sr);
    expect(r.confidence).toBeLessThan(0.8);
  });
});

describe("onset detector", () => {
  it("fires on a sudden energy increase and respects the min gap", () => {
    const d = new OnsetDetector(90, 1.5, 20);
    const quiet = new Float32Array(64).fill(0.01);
    const loud = new Float32Array(64).fill(0.5);
    let t = 0;
    for (let i = 0; i < 10; i++) { d.process(quiet, t); t += 10; }
    expect(d.process(loud, t)).toBe(true);
    t += 10;
    expect(d.process(loud, t)).toBe(false); // no increase
    for (let i = 0; i < 10; i++) { d.process(quiet, t); t += 10; }
    expect(d.process(loud, t)).toBe(true);
  });
});

describe("expected-chord verification", () => {
  it("counts chord tones present in a spectrum", () => {
    const sr = 44100, fft = 2048;
    const spectrum = new Float32Array(fft / 2).fill(-100);
    const binHz = sr / fft;
    for (const m of [60, 64]) {
      const f = midiToFreq(m);
      spectrum[Math.round(f / binHz)] = -30;
    }
    expect(chordTonesPresent(spectrum, sr, fft, [60, 64, 67], -100)).toBe(2);
    expect(chordTonesPresent(spectrum, sr, fft, [62, 66, 69], -100)).toBe(0);
  });
});
