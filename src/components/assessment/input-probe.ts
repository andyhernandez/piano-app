"use client";
import { midiSupported, probeMidi } from "@/lib/input/midi";

/**
 * Like `probeMidi()` but also returns the first device's name so onboarding can say "Found: Casio CT-S1".
 * Never throws; resolves { found: false } on unsupported browsers, denied permission or timeout.
 */
export async function probeMidiName(timeoutMs = 1500): Promise<{ found: boolean; name: string | null }> {
  if (!midiSupported()) return { found: false, name: null };
  try {
    const access = await Promise.race([
      navigator.requestMIDIAccess({ sysex: false }),
      new Promise<null>((r) => setTimeout(() => r(null), timeoutMs)),
    ]);
    if (!access) return { found: false, name: null };
    const first = access.inputs.values().next().value as MIDIInput | undefined;
    if (!first) return { found: false, name: null };
    return { found: true, name: first.name ?? "MIDI keyboard" };
  } catch {
    // Fall back to the shared probe in case the race above misbehaved.
    const found = await probeMidi(timeoutMs).catch(() => false);
    return { found, name: found ? "MIDI keyboard" : null };
  }
}
