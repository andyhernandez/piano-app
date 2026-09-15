"use client";
import * as React from "react";
import { isBlackKey } from "@/lib/music/notes";

export type KeyTone = "mint" | "clay" | "dim";

/**
 * The keyboard, drawn as the design draws it: cream white keys on a raised tray, base-coloured black keys,
 * mint for a played or expected note. Pointer events support touch and glissando.
 */
export function Keyboard({ from = 60, to = 72, tones = {}, height = 132, onNoteOn, onNoteOff, disabled, style }: { from?: number; to?: number; tones?: Partial<Record<number, KeyTone>>; height?: number; onNoteOn?: (midi: number) => void; onNoteOff?: (midi: number) => void; disabled?: boolean; style?: React.CSSProperties }) {
  const whites: number[] = [];
  for (let m = from; m <= to; m++) if (!isBlackKey(m)) whites.push(m);
  const blackH = Math.round((height - 10) * 0.6);
  const pressed = React.useRef(new Map<number, number>());
  const [down, setDown] = React.useState<Set<number>>(new Set());
  const press = (id: number, midi: number) => {
    const prev = pressed.current.get(id);
    if (prev === midi) return;
    if (prev !== undefined) onNoteOff?.(prev);
    pressed.current.set(id, midi);
    onNoteOn?.(midi);
    setDown((s) => { const n = new Set(s); if (prev !== undefined) n.delete(prev); n.add(midi); return n; });
  };
  const release = (id: number) => {
    const prev = pressed.current.get(id);
    if (prev === undefined) return;
    pressed.current.delete(id);
    onNoteOff?.(prev);
    setDown((s) => { const n = new Set(s); n.delete(prev); return n; });
  };
  const handlers = (midi: number) => disabled ? {} : {
    onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); (e.target as Element).releasePointerCapture?.(e.pointerId); press(e.pointerId, midi); },
    onPointerEnter: (e: React.PointerEvent) => { if (e.buttons > 0 || e.pointerType === "touch") press(e.pointerId, midi); },
    onPointerUp: (e: React.PointerEvent) => release(e.pointerId),
    onPointerCancel: (e: React.PointerEvent) => release(e.pointerId),
  };
  const fill = (midi: number, black: boolean) => {
    const t = tones[midi];
    if (down.has(midi) || t === "mint") return "var(--kc-mint)";
    if (t === "clay") return "var(--kc-clay)";
    if (t === "dim") return black ? "#1c2140" : "#d8d7d3";
    return black ? "var(--kc-base)" : "#f0efec";
  };
  const whiteW = 100 / whites.length;
  return (
    <div style={{ width: "100%", height, background: "var(--kc-raised)", border: "1px solid var(--kc-border)", borderRadius: "var(--kc-radius-control)", display: "flex", gap: 3, padding: 5, boxSizing: "border-box", position: "relative", touchAction: "none", userSelect: "none", ...style }} onPointerLeave={() => { for (const id of Array.from(pressed.current.keys())) release(id); }} role="group" aria-label="Keyboard">
      {whites.map((m) => <div key={m} {...handlers(m)} style={{ flex: 1, background: fill(m, false), borderRadius: "0 0 4px 4px", cursor: disabled ? "default" : "pointer" }} />)}
      <div style={{ position: "absolute", left: 5, right: 5, top: 5, height: blackH, pointerEvents: "none" }}>
        {whites.map((m, i) => {
          const b = m + 1;
          if (b > to || !isBlackKey(b)) return null;
          return <div key={b} {...handlers(b)} style={{ position: "absolute", left: `calc(${(i + 1) * whiteW}% - 2.2%)`, width: "4.4%", height: "100%", background: fill(b, true), borderRadius: "0 0 4px 4px", pointerEvents: disabled ? "none" : "auto", cursor: "pointer" }} />;
        })}
      </div>
    </div>
  );
}
