"use client";
import type { InputSource } from "./source";
import { Emitter, nowMs } from "./source";

export function midiSupported(): boolean {
  return typeof navigator !== "undefined" && typeof (navigator as Navigator & { requestMIDIAccess?: unknown }).requestMIDIAccess === "function";
}

/** Web MIDI input. Listens to all inputs; hot-plug aware. */
export class MidiInputSource implements InputSource {
  readonly mode = "midi" as const;
  connected = false;
  label = "MIDI keyboard";
  private access: MIDIAccess | null = null;
  private emitter = new Emitter();
  private inputs = new Map<string, MIDIInput>();

  async start() {
    if (!midiSupported()) throw new Error("Web MIDI not supported");
    this.access = await navigator.requestMIDIAccess({ sysex: false });
    this.attachAll();
    this.access.onstatechange = () => this.attachAll();
  }

  private attachAll() {
    if (!this.access) return;
    const seen = new Set<string>();
    this.access.inputs.forEach((input) => {
      seen.add(input.id);
      if (!this.inputs.has(input.id)) {
        input.onmidimessage = (ev) => this.handle(ev);
        this.inputs.set(input.id, input);
      }
    });
    for (const id of Array.from(this.inputs.keys())) if (!seen.has(id)) this.inputs.delete(id);
    this.connected = this.inputs.size > 0;
    const first = this.inputs.values().next().value as MIDIInput | undefined;
    this.label = first?.name ?? (this.connected ? "MIDI keyboard" : "No MIDI device");
  }

  private handle(ev: MIDIMessageEvent) {
    if (!ev.data) return;
    const [status, data1, data2] = ev.data;
    const cmd = status & 0xf0;
    const t = nowMs();
    if (cmd === 0x90 && data2 > 0) {
      this.emitter.emitNote({ midi: data1, velocity: data2 / 127, time: t, kind: "on", confidence: 1 });
      this.emitter.emitOnset({ time: t, source: "midi" });
    } else if (cmd === 0x80 || (cmd === 0x90 && data2 === 0)) {
      this.emitter.emitNote({ midi: data1, velocity: 0, time: t, kind: "off", confidence: 1 });
    }
  }

  stop() {
    for (const input of this.inputs.values()) input.onmidimessage = null;
    this.inputs.clear();
    if (this.access) this.access.onstatechange = null;
    this.access = null;
    this.connected = false;
    this.emitter.clear();
  }

  onNote = (fn: Parameters<Emitter["onNote"]>[0]) => this.emitter.onNote(fn);
  onOnset = (fn: Parameters<Emitter["onOnset"]>[0]) => this.emitter.onOnset(fn);
}

/** Quick probe: is at least one MIDI input present right now? */
export async function probeMidi(timeoutMs = 1500): Promise<boolean> {
  if (!midiSupported()) return false;
  try {
    const access = await Promise.race([
      navigator.requestMIDIAccess({ sysex: false }),
      new Promise<null>((r) => setTimeout(() => r(null), timeoutMs)),
    ]);
    if (!access) return false;
    return access.inputs.size > 0;
  } catch {
    return false;
  }
}
