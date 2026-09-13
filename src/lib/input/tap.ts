import type { InputSource } from "./source";
import { Emitter, nowMs } from "./source";

/** Timer mode: no automatic detection. The UI tap pad calls `tap()` to emit onsets; on-screen keyboard calls `note()`. */
export class TapInputSource implements InputSource {
  readonly mode = "timer" as const;
  connected = true;
  label = "Tap pad";
  private emitter = new Emitter();
  async start() {}
  stop() { this.emitter.clear(); }
  tap() { this.emitter.emitOnset({ time: nowMs(), source: "tap" }); }
  note(midi: number, kind: "on" | "off" = "on") {
    const t = nowMs();
    this.emitter.emitNote({ midi, velocity: kind === "on" ? 0.8 : 0, time: t, kind, confidence: 1 });
    if (kind === "on") this.emitter.emitOnset({ time: t, source: "tap" });
  }
  onNote = (fn: Parameters<Emitter["onNote"]>[0]) => this.emitter.onNote(fn);
  onOnset = (fn: Parameters<Emitter["onOnset"]>[0]) => this.emitter.onOnset(fn);
}
