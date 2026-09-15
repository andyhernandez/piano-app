import type { Recording } from "@/lib/types";

export const WAVE_BINS = 20;

/** Twenty bars from a MIDI recording: the loudest velocity in each slice of its length. */
export function midiBars(events: NonNullable<Recording["midiEvents"]>): { bars: number[]; seconds: number } {
  const ons = events.filter((e) => e.kind === "on");
  if (!ons.length) return { bars: Array(WAVE_BINS).fill(8), seconds: 0 };
  const t0 = Math.min(...events.map((e) => e.time));
  const t1 = Math.max(...events.map((e) => e.time));
  const span = Math.max(1, t1 - t0);
  const bars = Array(WAVE_BINS).fill(0) as number[];
  for (const e of ons) {
    const i = Math.min(WAVE_BINS - 1, Math.floor(((e.time - t0) / span) * WAVE_BINS));
    bars[i] = Math.max(bars[i], Math.round(20 + e.velocity * 80));
  }
  // Let each note ring into the next empty slice so a sparse take still reads as one shape.
  for (let i = 1; i < WAVE_BINS; i++) if (!bars[i]) bars[i] = Math.round(bars[i - 1] * 0.55);
  return { bars: bars.map((b) => Math.max(8, b)), seconds: span / 1000 };
}

/** Twenty RMS bars from an audio blob, scaled so the loudest is 100. Falls back to a flat line if decoding fails. */
export async function audioBars(blob: Blob): Promise<{ bars: number[]; seconds: number }> {
  try {
    const buf = await blob.arrayBuffer();
    const ctx = new OfflineAudioContext(1, 8000, 8000);
    const decoded = await ctx.decodeAudioData(buf);
    const data = decoded.getChannelData(0);
    const per = Math.max(1, Math.floor(data.length / WAVE_BINS));
    const rms: number[] = [];
    for (let i = 0; i < WAVE_BINS; i++) {
      let sum = 0;
      const start = i * per;
      for (let j = start; j < start + per && j < data.length; j++) sum += data[j] * data[j];
      rms.push(Math.sqrt(sum / per));
    }
    const peak = Math.max(...rms) || 1;
    return { bars: rms.map((r) => Math.max(8, Math.round((r / peak) * 100))), seconds: decoded.duration };
  } catch {
    return { bars: Array(WAVE_BINS).fill(24), seconds: 0 };
  }
}

export function fmtSeconds(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
