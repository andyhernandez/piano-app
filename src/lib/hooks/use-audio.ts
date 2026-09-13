"use client";
import * as React from "react";
import { getAudio, type AudioEngine } from "../audio";

/** Access the audio engine; `unlock` must be called from a user gesture. */
export function useAudio(): { audio: AudioEngine; ready: boolean; unlock: () => Promise<void> } {
  const audio = React.useMemo(() => getAudio(), []);
  const [ready, setReady] = React.useState(() => audio.ready);
  const unlock = React.useCallback(async () => { await audio.unlock(); setReady(true); }, [audio]);
  return { audio, ready, unlock };
}
