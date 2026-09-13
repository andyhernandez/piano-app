"use client";
import * as React from "react";
import { useAudio } from "@/lib/hooks/use-audio";
import { useInput } from "@/lib/hooks/use-input";

/**
 * Handlers for an on-screen PianoKeyboard that (a) sound the note through the audio engine and (b) feed the
 * input hub via `tap.note`, so timer-mode kids play the same games. Held notes are released on unmount.
 */
export function useSoundingKeys() {
  const { audio } = useAudio();
  const { tap } = useInput();
  const held = React.useRef(new Set<number>());

  React.useEffect(() => {
    const set = held.current;
    return () => {
      for (const m of set) audio.noteOff(m);
      set.clear();
    };
  }, [audio]);

  const onNoteOn = React.useCallback((midi: number) => {
    held.current.add(midi);
    audio.noteOn(midi);
    tap.note(midi, "on");
  }, [audio, tap]);

  const onNoteOff = React.useCallback((midi: number) => {
    held.current.delete(midi);
    audio.noteOff(midi);
    tap.note(midi, "off");
  }, [audio, tap]);

  return { onNoteOn, onNoteOff };
}
