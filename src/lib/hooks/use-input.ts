"use client";
import * as React from "react";
import type { InputMode, NoteEvent, OnsetEvent } from "../types";
import { getInput } from "../input/manager";

/** Subscribe to the input hub. Handlers are kept in refs so re-renders never drop events. */
export function useInput(handlers: { onNote?: (e: NoteEvent) => void; onOnset?: (e: OnsetEvent) => void } = {}) {
  const input = React.useMemo(() => getInput(), []);
  const [mode, setMode] = React.useState<InputMode>(() => input.mode);
  const [label, setLabel] = React.useState(() => input.label);
  const noteRef = React.useRef(handlers.onNote);
  const onsetRef = React.useRef(handlers.onOnset);
  React.useEffect(() => {
    noteRef.current = handlers.onNote;
    onsetRef.current = handlers.onOnset;
  });
  React.useEffect(() => {
    const u1 = input.onNote((e) => noteRef.current?.(e));
    const u2 = input.onOnset((e) => onsetRef.current?.(e));
    const u3 = input.onChange(() => { setMode(input.mode); setLabel(input.label); });
    return () => { u1(); u2(); u3(); };
  }, [input]);
  return { input, mode, label, tap: input.tap };
}

/** Collect note events into a buffer while `active`; returns the buffer and a reset. */
export function useNoteRecorder(active: boolean) {
  const buffer = React.useRef<NoteEvent[]>([]);
  const [count, setCount] = React.useState(0);
  useInput({
    onNote: (e) => {
      if (!active) return;
      buffer.current.push(e);
      if (e.kind === "on") setCount((c) => c + 1);
    },
  });
  const reset = React.useCallback(() => { buffer.current = []; setCount(0); }, []);
  return { events: buffer, count, reset };
}
