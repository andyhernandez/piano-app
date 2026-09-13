"use client";
import * as React from "react";

/**
 * Countdown timer driven by wall-clock deltas (robust to tab throttling). Fires onDone once at zero.
 * Mount a fresh instance (change the component key) to restart with a new total.
 */
export function useCountdown(totalSec: number, opts: { running: boolean; onDone?: () => void }) {
  const [remaining, setRemaining] = React.useState(totalSec);
  const endAt = React.useRef<number | null>(null);
  const doneRef = React.useRef(false);
  const onDoneRef = React.useRef(opts.onDone);
  React.useEffect(() => { onDoneRef.current = opts.onDone; });

  React.useEffect(() => {
    if (!opts.running) { endAt.current = null; return; }
    const id = setInterval(() => {
      if (endAt.current === null) return;
      const left = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0 && !doneRef.current) { doneRef.current = true; onDoneRef.current?.(); }
    }, 250);
    // Anchor the end time from the latest remaining value.
    setRemaining((r) => { endAt.current = Date.now() + r * 1000; return r; });
    return () => clearInterval(id);
  }, [opts.running]);

  const addSeconds = React.useCallback((s: number) => {
    if (endAt.current !== null) endAt.current += s * 1000;
    doneRef.current = false;
    setRemaining((r) => Math.max(0, r + s));
  }, []);

  return { remaining, elapsed: totalSec - remaining, progress: totalSec ? 1 - remaining / totalSec : 1, addSeconds };
}

/** Stopwatch in seconds. */
export function useStopwatch(running: boolean) {
  const [sec, setSec] = React.useState(0);
  const start = React.useRef<number | null>(null);
  const acc = React.useRef(0);
  React.useEffect(() => {
    if (!running) { if (start.current !== null) { acc.current += (Date.now() - start.current) / 1000; start.current = null; } return; }
    start.current = Date.now();
    const id = setInterval(() => setSec(acc.current + (Date.now() - (start.current ?? Date.now())) / 1000), 250);
    return () => clearInterval(id);
  }, [running]);
  const reset = React.useCallback(() => { acc.current = 0; start.current = running ? Date.now() : null; setSec(0); }, [running]);
  return { seconds: Math.floor(sec), reset };
}
