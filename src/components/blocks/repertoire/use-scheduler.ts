"use client";
import * as React from "react";

/**
 * Tiny setTimeout scheduler with a single cancel-all. Used to line up keyboard highlights with audio playback.
 * All timers are cleared automatically on unmount.
 */
export function useScheduler() {
  const timers = React.useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const schedule = React.useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, Math.max(0, ms));
    timers.current.add(id);
    return id;
  }, []);

  const clear = React.useCallback(() => {
    for (const id of timers.current) clearTimeout(id);
    timers.current.clear();
  }, []);

  React.useEffect(() => clear, [clear]);

  return { schedule, clear };
}
