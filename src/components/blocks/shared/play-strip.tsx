"use client";
import * as React from "react";
import { isBlackKey } from "@/lib/music/notes";

/** mint = play this / played; wash = in the key; dim = outside the key; lilac = worth a look. */
export type StripTone = "mint" | "wash" | "dim" | "lilac";

/**
 * A playable keyboard in the design's PianoStrip look: white keys with 2px borders on a white card, ink black
 * keys, a label at the foot of a key. Pointer events support touch and glissando. Used wherever a stop needs
 * on-screen keys (the timer, or a tap-to-answer).
 */
export function PlayStrip({ from = 60, to = 72, tones = {}, labels = {}, height = 130, onNoteOn, onNoteOff, disabled, style }: { from?: number; to?: number; tones?: Partial<Record<number, StripTone>>; labels?: Partial<Record<number, string>>; height?: number; onNoteOn?: (midi: number) => void; onNoteOff?: (midi: number) => void; disabled?: boolean; style?: React.CSSProperties }) {
  const whites: number[] = [];
  for (let m = from; m <= to; m++) if (!isBlackKey(m)) whites.push(m);
  const n = whites.length;
  const pressed = React.useRef(new Map<number, number>());
  const [down, setDown] = React.useState<Set<number>>(new Set());
  const press = (id: number, midi: number) => {
    const prev = pressed.current.get(id);
    if (prev === midi) return;
    if (prev !== undefined) onNoteOff?.(prev);
    pressed.current.set(id, midi);
    onNoteOn?.(midi);
    setDown((s) => { const next = new Set(s); if (prev !== undefined) next.delete(prev); next.add(midi); return next; });
  };
  const release = (id: number) => {
    const prev = pressed.current.get(id);
    if (prev === undefined) return;
    pressed.current.delete(id);
    onNoteOff?.(prev);
    setDown((s) => { const next = new Set(s); next.delete(prev); return next; });
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
    if (t === "lilac") return "var(--kc-lilac)";
    if (t === "wash") return black ? "var(--kc-mint-ink)" : "var(--kc-mint-wash)";
    if (t === "dim") return black ? "var(--kc-ink-faint)" : "var(--kc-cream)";
    return black ? "var(--kc-ink)" : "var(--kc-panel)";
  };
  return (
    <div role="group" aria-label="Keyboard" onPointerLeave={() => { for (const id of Array.from(pressed.current.keys())) release(id); }} style={{ position: "relative", height, border: "2px solid var(--kc-border)", borderRadius: 16, overflow: "hidden", display: "flex", background: "var(--kc-panel)", boxShadow: "var(--kc-shadow-press)", touchAction: "none", userSelect: "none", flex: "none", ...style }}>
      {whites.map((m, i) => (
        <span key={m} {...handlers(m)} style={{ flex: 1, borderRight: i === n - 1 ? "none" : "2px solid var(--kc-border)", background: fill(m, false), boxSizing: "border-box", display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 8, fontFamily: "var(--kc-font-display)", fontSize: 13, fontWeight: 600, color: "var(--kc-ink)", cursor: disabled ? "default" : "pointer" }}>{labels[m] ?? ""}</span>
      ))}
      {whites.map((m, i) => {
        const b = m + 1;
        if (b > to || !isBlackKey(b)) return null;
        return <span key={b} {...handlers(b)} style={{ position: "absolute", top: 0, width: `${((100 / n) * 0.6).toFixed(2)}%`, height: "58%", borderRadius: "0 0 6px 6px", background: fill(b, true), left: `${(((i + 1) / n) * 100 - (100 / n) * 0.3).toFixed(2)}%`, cursor: disabled ? "default" : "pointer", display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 6, fontFamily: "var(--kc-font-display)", fontSize: 11, fontWeight: 600, color: "#ffffff" }}>{labels[b] ?? ""}</span>;
      })}
    </div>
  );
}
