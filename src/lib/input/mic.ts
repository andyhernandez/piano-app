"use client";
import type { InputSource } from "./source";
import { Emitter, nowMs } from "./source";
import { OnsetDetector, chordTonesPresent, dbToLinear, detectPitchYIN } from "./pitch";
import { freqToNearest } from "../music/notes";

export interface MicCalibration {
  noiseFloor: number; // RMS
  confidenceThreshold: number; // 0-1
}

export const DEFAULT_CALIBRATION: MicCalibration = { noiseFloor: 0.01, confidenceThreshold: 0.8 };

/**
 * Microphone input (§10). Monophonic pitch via YIN, onsets via spectral flux, and expected-chord verification
 * via FFT peak checks. Low-confidence frames are *unscored*, never emitted as notes.
 */
export class MicInputSource implements InputSource {
  readonly mode = "mic" as const;
  connected = false;
  label = "Microphone";
  private emitter = new Emitter();
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private timeBuf = new Float32Array(2048);
  private freqBuf = new Float32Array(1024);
  private linBuf = new Float32Array(1024);
  private raf = 0;
  private onset = new OnsetDetector();
  private currentMidi: number | null = null;
  private stableCount = 0;
  private silentCount = 0;
  constructor(public calibration: MicCalibration = DEFAULT_CALIBRATION) {}

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    this.ctx = new AudioContext();
    const src = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0;
    src.connect(this.analyser);
    this.freqBuf = new Float32Array(this.analyser.frequencyBinCount);
    this.linBuf = new Float32Array(this.analyser.frequencyBinCount);
    this.connected = true;
    const track = this.stream.getAudioTracks()[0];
    this.label = track?.label || "Microphone";
    this.loop();
  }

  private loop = () => {
    if (!this.analyser || !this.ctx) return;
    this.analyser.getFloatTimeDomainData(this.timeBuf);
    this.analyser.getFloatFrequencyData(this.freqBuf);
    const t = nowMs();
    // Onsets
    dbToLinear(this.freqBuf, this.linBuf);
    if (this.onset.process(this.linBuf, t)) this.emitter.emitOnset({ time: t, source: "mic" });
    // Pitch
    const p = detectPitchYIN(this.timeBuf, this.ctx.sampleRate);
    const loud = p.rms > this.calibration.noiseFloor * 2.5;
    if (loud && p.frequency > 0 && p.confidence >= this.calibration.confidenceThreshold) {
      const [midi] = freqToNearest(p.frequency);
      if (midi === this.currentMidi) this.stableCount++;
      else {
        // New candidate. Require 2 consecutive frames to avoid octave flicker.
        if (this.stableCount >= 1 && this.currentMidi !== null && this.currentMidi !== midi) {
          this.emitter.emitNote({ midi: this.currentMidi, velocity: 0, time: t, kind: "off", confidence: p.confidence });
        }
        this.currentMidi = midi;
        this.stableCount = 0;
      }
      if (this.stableCount === 1) {
        this.emitter.emitNote({ midi, velocity: Math.min(1, p.rms * 8), time: t, kind: "on", confidence: p.confidence });
      }
      this.silentCount = 0;
    } else {
      this.silentCount++;
      if (this.silentCount > 6 && this.currentMidi !== null) {
        this.emitter.emitNote({ midi: this.currentMidi, velocity: 0, time: t, kind: "off", confidence: 0 });
        this.currentMidi = null;
        this.stableCount = 0;
      }
    }
    this.raf = requestAnimationFrame(this.loop);
  };

  /** Measure the room for ~1.5s and return an RMS noise floor. */
  async measureNoiseFloor(ms = 1500): Promise<number> {
    if (!this.analyser) return DEFAULT_CALIBRATION.noiseFloor;
    const samples: number[] = [];
    const end = nowMs() + ms;
    await new Promise<void>((resolve) => {
      const tick = () => {
        this.analyser!.getFloatTimeDomainData(this.timeBuf);
        let s = 0;
        for (let i = 0; i < this.timeBuf.length; i++) s += this.timeBuf[i] * this.timeBuf[i];
        samples.push(Math.sqrt(s / this.timeBuf.length));
        if (nowMs() < end) requestAnimationFrame(tick); else resolve();
      };
      tick();
    });
    samples.sort((a, b) => a - b);
    return Math.max(0.002, samples[Math.floor(samples.length * 0.9)] ?? 0.01);
  }

  async verifyChord(midis: number[], windowMs = 500): Promise<"heard" | "unscored"> {
    if (!this.analyser || !this.ctx) return "unscored";
    const end = nowMs() + windowMs;
    const noiseDb = 20 * Math.log10(Math.max(1e-6, this.calibration.noiseFloor)) - 20;
    let best = 0;
    await new Promise<void>((resolve) => {
      const tick = () => {
        this.analyser!.getFloatFrequencyData(this.freqBuf);
        best = Math.max(best, chordTonesPresent(this.freqBuf, this.ctx!.sampleRate, this.analyser!.fftSize, midis, noiseDb));
        if (nowMs() < end && best < midis.length) requestAnimationFrame(tick); else resolve();
      };
      tick();
    });
    return best >= Math.min(2, midis.length) ? "heard" : "unscored";
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.ctx?.close().catch(() => {});
    this.stream = null; this.ctx = null; this.analyser = null;
    this.connected = false;
    this.emitter.clear();
  }

  onNote = (fn: Parameters<Emitter["onNote"]>[0]) => this.emitter.onNote(fn);
  onOnset = (fn: Parameters<Emitter["onOnset"]>[0]) => this.emitter.onOnset(fn);
}

export async function micPermissionState(): Promise<"granted" | "denied" | "prompt" | "unknown"> {
  try {
    const p = await navigator.permissions.query({ name: "microphone" as PermissionName });
    return p.state;
  } catch {
    return "unknown";
  }
}
