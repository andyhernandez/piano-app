"use client";
import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import type { InputSource } from "./source";
import { Emitter, nowMs } from "./source";
import { probeMidi } from "./midi";

/**
 * MIDI through the native wrapper. iOS WebKit has no Web MIDI, so on an iPad the Capacitor app forwards CoreMIDI
 * events from `ios/App/App/MidiPlugin.swift`. In a plain browser this module is inert: `nativeMidiAvailable()` is
 * false and the Web MIDI source in ./midi.ts is used instead.
 */
interface NativeNote { midi: number; velocity: number; kind: "on" | "off"; ageMs: number }
interface MidiPlugin {
  start(): Promise<{ devices: string[] }>;
  stop(): Promise<void>;
  devices(): Promise<{ devices: string[]; connected: number }>;
  pairBluetooth(): Promise<void>;
  addListener(event: "notes", fn: (data: { events: NativeNote[] }) => void): Promise<PluginListenerHandle>;
  addListener(event: "devices", fn: (data: { devices: string[] }) => void): Promise<PluginListenerHandle>;
}

const Midi = registerPlugin<MidiPlugin>("Midi");

export function nativeMidiAvailable(): boolean {
  try {
    return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("Midi");
  } catch {
    return false;
  }
}

/** Is a keyboard present right now, through whichever MIDI path this platform has? */
export async function probeAnyMidi(timeoutMs = 1500): Promise<boolean> {
  if (!nativeMidiAvailable()) return probeMidi(timeoutMs);
  try {
    const r = await Midi.devices();
    return r.devices.length > 0;
  } catch {
    return false;
  }
}

/** Opens Apple's Bluetooth MIDI pairing sheet. No-op outside the native app. */
export async function pairBluetoothKeyboard(): Promise<void> {
  if (!nativeMidiAvailable()) return;
  await Midi.pairBluetooth();
}

export class NativeMidiInputSource implements InputSource {
  readonly mode = "midi" as const;
  connected = false;
  label = "MIDI keyboard";
  private emitter = new Emitter();
  private handles: PluginListenerHandle[] = [];

  async start() {
    if (!nativeMidiAvailable()) throw new Error("Native MIDI not available");
    this.handles.push(await Midi.addListener("notes", ({ events }) => {
      for (const e of events) {
        const t = nowMs() - Math.max(0, Math.min(500, e.ageMs));
        if (e.kind === "on") {
          this.emitter.emitNote({ midi: e.midi, velocity: e.velocity, time: t, kind: "on", confidence: 1 });
          this.emitter.emitOnset({ time: t, source: "midi" });
        } else {
          this.emitter.emitNote({ midi: e.midi, velocity: 0, time: t, kind: "off", confidence: 1 });
        }
      }
    }));
    this.handles.push(await Midi.addListener("devices", ({ devices }) => this.setDevices(devices)));
    const r = await Midi.start();
    this.setDevices(r.devices);
  }

  private setDevices(devices: string[]) {
    this.connected = devices.length > 0;
    this.label = devices[0] ?? "No MIDI device";
  }

  stop() {
    for (const h of this.handles) void h.remove();
    this.handles = [];
    void Midi.stop().catch(() => undefined);
    this.connected = false;
    this.emitter.clear();
  }

  onNote = (fn: Parameters<Emitter["onNote"]>[0]) => this.emitter.onNote(fn);
  onOnset = (fn: Parameters<Emitter["onOnset"]>[0]) => this.emitter.onOnset(fn);
}
