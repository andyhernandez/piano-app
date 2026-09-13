"use client";
import * as Tone from "tone";
import type { AudioEngine, GrooveId, MetronomeOptions } from "./engine";
import { midiToName } from "../music/notes";

/**
 * Tone.js implementation. Uses a sampled piano (Salamander, via the tonejs-instruments CDN mirror) when the
 * network allows, with an immediate synth fallback so practice never waits on a download.
 */
const SALAMANDER_BASE = "https://tonejs.github.io/audio/salamander/";
const SALAMANDER_MAP: Record<string, string> = {
  A0: "A0.mp3", C1: "C1.mp3", "D#1": "Ds1.mp3", "F#1": "Fs1.mp3", A1: "A1.mp3", C2: "C2.mp3", "D#2": "Ds2.mp3", "F#2": "Fs2.mp3",
  A2: "A2.mp3", C3: "C3.mp3", "D#3": "Ds3.mp3", "F#3": "Fs3.mp3", A3: "A3.mp3", C4: "C4.mp3", "D#4": "Ds4.mp3", "F#4": "Fs4.mp3",
  A4: "A4.mp3", C5: "C5.mp3", "D#5": "Ds5.mp3", "F#5": "Fs5.mp3", A5: "A5.mp3", C6: "C6.mp3", "D#6": "Ds6.mp3", "F#6": "Fs6.mp3",
  A6: "A6.mp3", C7: "C7.mp3", "D#7": "Ds7.mp3", "F#7": "Fs7.mp3", A7: "A7.mp3", C8: "C8.mp3",
};

export class ToneAudioEngine implements AudioEngine {
  ready = false;
  metronomeRunning = false;
  grooveRunning = false;

  private master!: Tone.Volume;
  private synth!: Tone.PolySynth;
  private sampler: Tone.Sampler | null = null;
  private samplerLoaded = false;
  private clickHi!: Tone.MembraneSynth;
  private clickLo!: Tone.MembraneSynth;
  private bellSynth!: Tone.MetalSynth;
  private fx!: Tone.PolySynth;
  private metroLoop: Tone.Loop | null = null;
  private metroOpts: MetronomeOptions | null = null;
  private metroBeat = 0;
  private groove: { parts: Tone.Part[]; kick: Tone.MembraneSynth; snare: Tone.NoiseSynth; hat: Tone.MetalSynth; bass: Tone.MonoSynth } | null = null;
  private held = new Set<number>();

  async unlock() {
    if (this.ready) return;
    await Tone.start();
    this.master = new Tone.Volume(-6).toDestination();
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.005, decay: 0.4, sustain: 0.2, release: 1.2 },
    }).connect(this.master);
    this.synth.maxPolyphony = 24;
    this.clickHi = new Tone.MembraneSynth({ pitchDecay: 0.008, octaves: 2, envelope: { attack: 0.001, decay: 0.08, sustain: 0 } }).connect(this.master);
    this.clickLo = new Tone.MembraneSynth({ pitchDecay: 0.008, octaves: 1.5, envelope: { attack: 0.001, decay: 0.06, sustain: 0 } }).connect(this.master);
    this.bellSynth = new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 1.2, release: 0.5 }, harmonicity: 5.1, modulationIndex: 20, resonance: 4000, octaves: 1.5 }).connect(this.master);
    this.bellSynth.volume.value = -14;
    this.fx = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "sine" }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.4 } }).connect(this.master);
    this.fx.volume.value = -10;
    this.ready = true;
    // Load the sampler lazily; fall back to synth until ready or on failure.
    try {
      this.sampler = new Tone.Sampler({
        urls: SALAMANDER_MAP,
        baseUrl: SALAMANDER_BASE,
        release: 1,
        onload: () => { this.samplerLoaded = true; },
        onerror: () => { this.samplerLoaded = false; },
      }).connect(this.master);
    } catch {
      this.sampler = null;
    }
  }

  private get piano(): Tone.Sampler | Tone.PolySynth {
    return this.samplerLoaded && this.sampler ? this.sampler : this.synth;
  }

  now() { return Tone.now(); }

  playNote(midi: number, duration = 0.6, velocity = 0.8, when?: number) {
    if (!this.ready) return;
    this.piano.triggerAttackRelease(midiToName(midi), duration, when ?? Tone.now(), velocity);
  }

  noteOn(midi: number, velocity = 0.8) {
    if (!this.ready || this.held.has(midi)) return;
    this.held.add(midi);
    this.piano.triggerAttack(midiToName(midi), Tone.now(), velocity);
  }

  noteOff(midi: number) {
    if (!this.ready || !this.held.has(midi)) return;
    this.held.delete(midi);
    this.piano.triggerRelease(midiToName(midi), Tone.now());
  }

  playChord(midis: number[], duration = 1.2, velocity = 0.7, when?: number) {
    if (!this.ready) return;
    this.piano.triggerAttackRelease(midis.map((m) => midiToName(m)), duration, when ?? Tone.now(), velocity);
  }

  playSequence(midis: number[], gap: number, duration = 0.5, velocity = 0.8): number {
    if (!this.ready) return 0;
    const t0 = Tone.now() + 0.05;
    midis.forEach((m, i) => this.playNote(m, duration, velocity, t0 + i * gap));
    return midis.length * gap;
  }

  click(accent = false, when?: number) {
    if (!this.ready) return;
    const t = when ?? Tone.now();
    if (accent) this.clickHi.triggerAttackRelease("G5", 0.05, t, 0.9);
    else this.clickLo.triggerAttackRelease("C5", 0.05, t, 0.6);
  }

  bell() {
    if (!this.ready) return;
    this.bellSynth.triggerAttackRelease("C6", 0.8);
  }

  stinger(kind: "success" | "fail" | "pop" | "levelup") {
    if (!this.ready) return;
    const t = Tone.now();
    const seq: Record<typeof kind, [string, number][]> = {
      success: [["C5", 0], ["E5", 0.08], ["G5", 0.16]],
      fail: [["E4", 0], ["Eb4", 0.12]],
      pop: [["A5", 0]],
      levelup: [["C5", 0], ["E5", 0.1], ["G5", 0.2], ["C6", 0.3], ["E6", 0.45]],
    };
    for (const [n, dt] of seq[kind]) this.fx.triggerAttackRelease(n, 0.18, t + dt, 0.6);
  }

  startMetronome(opts: MetronomeOptions) {
    if (!this.ready) return;
    this.stopMetronome();
    this.metroOpts = opts;
    this.metroBeat = 0;
    Tone.getTransport().bpm.value = opts.bpm;
    this.metroLoop = new Tone.Loop((time) => {
      const beat = this.metroBeat;
      const accent = opts.beatsPerBar > 0 && beat % opts.beatsPerBar === 0;
      this.click(accent, time);
      Tone.getDraw().schedule(() => opts.onBeat?.(beat % Math.max(1, opts.beatsPerBar), time), time);
      this.metroBeat++;
    }, "4n").start(0);
    Tone.getTransport().start();
    this.metronomeRunning = true;
  }

  stopMetronome() {
    if (this.metroLoop) {
      this.metroLoop.stop();
      this.metroLoop.dispose();
      this.metroLoop = null;
    }
    this.metronomeRunning = false;
    if (!this.grooveRunning) Tone.getTransport().stop();
  }

  setMetronomeBpm(bpm: number) {
    if (this.metroOpts) this.metroOpts.bpm = bpm;
    Tone.getTransport().bpm.rampTo(bpm, 0.1);
  }

  startGroove(groove: GrooveId, rootMidi: number, bpm: number, minor = false) {
    if (!this.ready) return;
    this.stopGroove();
    const kick = new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 6, envelope: { attack: 0.001, decay: 0.3, sustain: 0 } }).connect(this.master);
    const snare = new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.001, decay: 0.15, sustain: 0 } }).connect(this.master);
    snare.volume.value = -8;
    const hat = new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 0.05, release: 0.01 }, harmonicity: 5.1, modulationIndex: 32, resonance: 6000, octaves: 1 }).connect(this.master);
    hat.volume.value = -22;
    const bass = new Tone.MonoSynth({ oscillator: { type: groove === "lofi" ? "sine" : "sawtooth" }, filter: { Q: 2, type: "lowpass" }, envelope: { attack: 0.01, decay: 0.3, sustain: 0.4, release: 0.3 }, filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.3, baseFrequency: 120, octaves: 2.5 } }).connect(this.master);
    bass.volume.value = -6;

    const bassRoot = rootMidi - 24; // two octaves down
    const third = bassRoot + (minor ? 3 : 4);
    const fifth = bassRoot + 7;
    const sixth = bassRoot + (minor ? 8 : 9);
    const patterns = groovePattern(groove, { root: bassRoot, third, fifth, sixth, octave: bassRoot + 12 });
    const loopEnd = groove === "waltz" ? "1m" : "2m";
    Tone.getTransport().timeSignature = groove === "waltz" ? 3 : 4;
    Tone.getTransport().bpm.value = bpm;

    const parts: Tone.Part[] = [];
    parts.push(new Tone.Part((time) => kick.triggerAttackRelease("C1", 0.1, time, 0.9), patterns.kick.map((t) => [t, 0] as [string, number])).start(0));
    parts.push(new Tone.Part((time) => snare.triggerAttackRelease(0.1, time, 0.7), patterns.snare.map((t) => [t, 0] as [string, number])).start(0));
    parts.push(new Tone.Part((time) => hat.triggerAttackRelease("C6", 0.03, time, 0.4), patterns.hat.map((t) => [t, 0] as [string, number])).start(0));
    parts.push(new Tone.Part((time, ev: { note: number; dur: string }) => bass.triggerAttackRelease(midiToName(ev.note), ev.dur, time, 0.8), patterns.bass.map((b) => [b.time, { note: b.note, dur: b.dur }] as [string, { note: number; dur: string }])).start(0));
    for (const p of parts) { p.loop = true; p.loopEnd = loopEnd; }
    this.groove = { parts, kick, snare, hat, bass };
    Tone.getTransport().start();
    this.grooveRunning = true;
  }

  stopGroove() {
    if (this.groove) {
      for (const p of this.groove.parts) { p.stop(); p.dispose(); }
      this.groove.kick.dispose(); this.groove.snare.dispose(); this.groove.hat.dispose(); this.groove.bass.dispose();
      this.groove = null;
    }
    this.grooveRunning = false;
    Tone.getTransport().timeSignature = 4;
    if (!this.metronomeRunning) Tone.getTransport().stop();
  }

  setGrooveBpm(bpm: number) { Tone.getTransport().bpm.rampTo(bpm, 0.2); }

  setVolume(v: number) { if (this.master) this.master.volume.value = Tone.gainToDb(Math.max(0.0001, v)); }

  dispose() {
    this.stopMetronome();
    this.stopGroove();
    this.synth?.dispose();
    this.sampler?.dispose();
    this.ready = false;
  }
}

interface BassNote { time: string; note: number; dur: string }
function groovePattern(groove: GrooveId, n: { root: number; third: number; fifth: number; sixth: number; octave: number }): { kick: string[]; snare: string[]; hat: string[]; bass: BassNote[] } {
  switch (groove) {
    case "pop":
      return {
        kick: ["0:0:0", "0:2:0", "1:0:0", "1:2:0", "1:2:2"],
        snare: ["0:1:0", "0:3:0", "1:1:0", "1:3:0"],
        hat: ["0:0:2", "0:1:2", "0:2:2", "0:3:2", "1:0:2", "1:1:2", "1:2:2", "1:3:2"],
        bass: [
          { time: "0:0:0", note: n.root, dur: "8n" }, { time: "0:1:2", note: n.root, dur: "8n" }, { time: "0:2:0", note: n.fifth, dur: "8n" }, { time: "0:3:0", note: n.root, dur: "8n" },
          { time: "1:0:0", note: n.root, dur: "8n" }, { time: "1:1:2", note: n.root, dur: "8n" }, { time: "1:2:0", note: n.octave, dur: "8n" }, { time: "1:3:0", note: n.fifth, dur: "8n" },
        ],
      };
    case "waltz":
      return {
        kick: ["0:0:0"],
        snare: [],
        hat: ["0:1:0", "0:2:0"],
        bass: [{ time: "0:0:0", note: n.root, dur: "4n" }, { time: "0:1:0", note: n.fifth, dur: "8n" }, { time: "0:2:0", note: n.fifth, dur: "8n" }],
      };
    case "blues":
      return {
        kick: ["0:0:0", "0:2:0", "1:0:0", "1:2:0"],
        snare: ["0:1:0", "0:3:0", "1:1:0", "1:3:0"],
        hat: ["0:0:0", "0:0:2", "0:1:0", "0:1:2", "0:2:0", "0:2:2", "0:3:0", "0:3:2", "1:0:0", "1:0:2", "1:1:0", "1:1:2", "1:2:0", "1:2:2", "1:3:0", "1:3:2"],
        bass: [
          { time: "0:0:0", note: n.root, dur: "4n" }, { time: "0:1:0", note: n.third, dur: "4n" }, { time: "0:2:0", note: n.fifth, dur: "4n" }, { time: "0:3:0", note: n.sixth, dur: "4n" },
          { time: "1:0:0", note: n.octave, dur: "4n" }, { time: "1:1:0", note: n.sixth, dur: "4n" }, { time: "1:2:0", note: n.fifth, dur: "4n" }, { time: "1:3:0", note: n.third, dur: "4n" },
        ],
      };
    case "lofi":
      return {
        kick: ["0:0:0", "0:2:2", "1:0:0", "1:2:2"],
        snare: ["0:1:0", "0:3:0", "1:1:0", "1:3:0"],
        hat: ["0:0:2", "0:1:2", "0:2:2", "0:3:2", "1:0:2", "1:1:2", "1:2:2", "1:3:2"],
        bass: [{ time: "0:0:0", note: n.root, dur: "2n" }, { time: "0:2:0", note: n.fifth, dur: "2n" }, { time: "1:0:0", note: n.sixth, dur: "2n" }, { time: "1:2:0", note: n.fifth, dur: "2n" }],
      };
  }
}
