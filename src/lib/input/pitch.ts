/**
 * Monophonic pitch detection using YIN (de Cheveigné & Kawahara 2002) with parabolic interpolation.
 * Pure function over a Float32Array frame; ~2048 samples at 44.1/48 kHz gives ~20 ms latency (§10).
 */
export interface PitchResult {
  /** Hz, or 0 when no pitch. */
  frequency: number;
  /** 0-1; 1 = perfectly periodic. */
  confidence: number;
  /** RMS level of the frame. */
  rms: number;
}

export function rms(frame: Float32Array): number {
  let s = 0;
  for (let i = 0; i < frame.length; i++) s += frame[i] * frame[i];
  return Math.sqrt(s / frame.length);
}

export function detectPitchYIN(frame: Float32Array, sampleRate: number, threshold = 0.15, minHz = 40, maxHz = 2200): PitchResult {
  const n = frame.length;
  const level = rms(frame);
  const half = Math.floor(n / 2);
  const yin = new Float32Array(half);

  // Difference function
  for (let tau = 1; tau < half; tau++) {
    let sum = 0;
    for (let i = 0; i < half; i++) {
      const d = frame[i] - frame[i + tau];
      sum += d * d;
    }
    yin[tau] = sum;
  }
  // Cumulative mean normalized difference
  yin[0] = 1;
  let running = 0;
  for (let tau = 1; tau < half; tau++) {
    running += yin[tau];
    yin[tau] = running === 0 ? 1 : (yin[tau] * tau) / running;
  }
  const minTau = Math.max(2, Math.floor(sampleRate / maxHz));
  const maxTau = Math.min(half - 1, Math.floor(sampleRate / minHz));

  // Absolute threshold
  let tau = -1;
  for (let t = minTau; t < maxTau; t++) {
    if (yin[t] < threshold) {
      while (t + 1 < maxTau && yin[t + 1] < yin[t]) t++;
      tau = t;
      break;
    }
  }
  if (tau === -1) {
    // Fallback: global minimum
    let best = minTau;
    for (let t = minTau; t < maxTau; t++) if (yin[t] < yin[best]) best = t;
    tau = best;
    if (yin[tau] > 0.5) return { frequency: 0, confidence: 0, rms: level };
  }
  // Parabolic interpolation
  let betterTau = tau;
  if (tau > 0 && tau < half - 1) {
    const s0 = yin[tau - 1], s1 = yin[tau], s2 = yin[tau + 1];
    const denom = 2 * (2 * s1 - s2 - s0);
    if (denom !== 0) betterTau = tau + (s2 - s0) / denom;
  }
  const frequency = sampleRate / betterTau;
  const confidence = Math.max(0, Math.min(1, 1 - yin[tau]));
  return { frequency, confidence, rms: level };
}

/**
 * Spectral-flux onset detector. Feed consecutive magnitude spectra; returns true when an onset is detected.
 * Robust to pitch; used for rhythm tasks (§10).
 */
export class OnsetDetector {
  private prev: Float32Array | null = null;
  private history: number[] = [];
  private lastOnset = -Infinity;
  constructor(private minGapMs = 90, private sensitivity = 1.5, private historyLen = 20) {}

  /** @param spectrum linear magnitudes; @param timeMs event time. */
  process(spectrum: Float32Array, timeMs: number): boolean {
    let flux = 0;
    if (this.prev) {
      for (let i = 0; i < spectrum.length; i++) {
        const d = spectrum[i] - this.prev[i];
        if (d > 0) flux += d;
      }
    }
    this.prev = Float32Array.from(spectrum);
    this.history.push(flux);
    if (this.history.length > this.historyLen) this.history.shift();
    if (this.history.length < 4) return false;
    const mean = this.history.reduce((a, b) => a + b, 0) / this.history.length;
    const thresh = mean * this.sensitivity + 1e-4;
    if (flux > thresh && timeMs - this.lastOnset > this.minGapMs) {
      this.lastOnset = timeMs;
      return true;
    }
    return false;
  }

  reset() { this.prev = null; this.history = []; this.lastOnset = -Infinity; }
}

/** Convert dB spectrum (from AnalyserNode.getFloatFrequencyData) into linear magnitudes. */
export function dbToLinear(db: Float32Array, out?: Float32Array): Float32Array {
  const o = out ?? new Float32Array(db.length);
  for (let i = 0; i < db.length; i++) o[i] = db[i] <= -160 ? 0 : Math.pow(10, db[i] / 20);
  return o;
}

/**
 * Expected-chord verification (§10): check energy at each fundamental + 2nd and 3rd harmonics.
 * Returns the number of chord tones whose energy exceeds `thresholdDb` above the noise floor.
 */
export function chordTonesPresent(spectrumDb: Float32Array, sampleRate: number, fftSize: number, midis: number[], noiseFloorDb: number, thresholdDb = 12): number {
  const binHz = sampleRate / fftSize;
  let present = 0;
  for (const m of midis) {
    const f0 = 440 * Math.pow(2, (m - 69) / 12);
    let energy = -Infinity;
    for (const h of [1, 2, 3]) {
      const bin = Math.round((f0 * h) / binHz);
      for (let b = bin - 1; b <= bin + 1; b++) {
        if (b >= 0 && b < spectrumDb.length) energy = Math.max(energy, spectrumDb[b] - (h === 1 ? 0 : 6));
      }
    }
    if (energy > noiseFloorDb + thresholdDb) present++;
  }
  return present;
}
