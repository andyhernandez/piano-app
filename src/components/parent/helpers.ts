import type { PitchClass, ScaleId, ScaleMode } from "@/lib/types";
import { ROADMAP_KEYS_MAJOR } from "@/lib/music/scales";

/**
 * Cheap salted hash for the 4-digit parent PIN (types.ts: "hashed with a cheap salt").
 * This is a deterrent against curious kids, not cryptography.
 */
const PIN_SALT = "keycadence:pin:v1";

export function hashPin(pin: string): string {
  const s = `${PIN_SALT}:${pin}`;
  // FNV-1a 32-bit, twice with different seeds, hex-joined.
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x811c9dc5) >>> 0;
  }
  return `h1:${h1.toString(16).padStart(8, "0")}${h2.toString(16).padStart(8, "0")}`;
}

/** Accepts either a hashed PIN (preferred) or a legacy plain 4-digit PIN. */
export function pinMatches(stored: string, entered: string): boolean {
  if (!stored) return false;
  return stored === hashPin(entered) || stored === entered;
}

/** 6 uppercase alphanumerics, no 0/O/1/I so codes survive handwriting. */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function makeInviteCode(): string {
  const bytes = new Uint8Array(6);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < 6; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

/** All scales a teacher may place on the roadmap: the ten roadmap majors plus A/E natural and harmonic minor. */
export const TEACHER_SCALE_OPTIONS: ScaleId[] = [
  ...ROADMAP_KEYS_MAJOR.map((key) => ({ key, mode: "major" as ScaleMode })),
  { key: "A", mode: "natural-minor" },
  { key: "A", mode: "harmonic-minor" },
  { key: "E", mode: "natural-minor" },
  { key: "E", mode: "harmonic-minor" },
];

export function isPitchClass(s: string): s is PitchClass {
  return ["C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb", "G", "G#", "Ab", "A", "A#", "Bb", "B"].includes(s);
}

export const MIDI_RECORDING_MIME = "application/x-keycadence-midi";

/** Friendly label for a details key: "scaleBpm" -> "Scale bpm". */
export function friendlyKey(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

/** Compact, human value for a details entry. */
export function friendlyValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "yes" : "no";
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : v.toFixed(2);
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.length > 12 ? `${v.length} items` : v.map(friendlyValue).join(", ");
  if (typeof v === "object") {
    const entries = Object.entries(v as Record<string, unknown>);
    if (entries.length > 6) return `${entries.length} fields`;
    return entries.map(([k, val]) => `${friendlyKey(k)}: ${friendlyValue(val)}`).join("; ");
  }
  return String(v);
}

export function formatDateLong(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export const APP_VERSION = "0.1.0";
