"use client";
import * as React from "react";
import { isBlackKey, midiToPc, prettyPc } from "@/lib/music/notes";
import { cn } from "@/lib/utils/cn";

export type KeyState = "scale" | "active" | "correct" | "wrong" | "hint";

export interface PianoKeyboardProps {
  /** First and last MIDI note (inclusive). Defaults to two octaves from C4. */
  from?: number;
  to?: number;
  /** Highlighted keys by state. */
  highlights?: Partial<Record<number, KeyState>>;
  /** Labels shown on keys (e.g. fingering numbers or note names). */
  labels?: Partial<Record<number, string>>;
  /** Keys with a thumb-under marker. */
  markers?: number[];
  showNoteNames?: boolean;
  preferFlats?: boolean;
  onNoteOn?: (midi: number) => void;
  onNoteOff?: (midi: number) => void;
  className?: string;
  /** Height in px of white keys. */
  height?: number;
  disabled?: boolean;
}

const WHITE_W = 40;
const BLACK_W = 24;

/** Compute x position of each key in white-key units. */
function layout(from: number, to: number) {
  const whites: { midi: number; x: number }[] = [];
  const blacks: { midi: number; x: number }[] = [];
  let x = 0;
  for (let m = from; m <= to; m++) {
    if (isBlackKey(m)) blacks.push({ midi: m, x: x - BLACK_W / 2 });
    else { whites.push({ midi: m, x }); x += WHITE_W; }
  }
  return { whites, blacks, width: x };
}

const FILL: Record<KeyState, string> = {
  scale: "var(--key-scale)",
  active: "var(--key-active)",
  correct: "var(--key-correct)",
  wrong: "var(--key-wrong)",
  hint: "#fde68a",
};

/**
 * Responsive SVG keyboard (§4A). Two octaves by default; pass from/to for 88 keys on desktop.
 * Pointer events support multi-touch and glissando. Keys emit onNoteOn/onNoteOff.
 */
export function PianoKeyboard({ from = 60, to = 84, highlights = {}, labels = {}, markers = [], showNoteNames = false, preferFlats = false, onNoteOn, onNoteOff, className, height = 160, disabled }: PianoKeyboardProps) {
  const { whites, blacks, width } = layout(from, to);
  const blackH = height * 0.62;
  const pressed = React.useRef(new Map<number, number>()); // pointerId -> midi
  const [down, setDown] = React.useState<Set<number>>(new Set());

  const press = (pointerId: number, midi: number) => {
    const prev = pressed.current.get(pointerId);
    if (prev === midi) return;
    if (prev !== undefined) { onNoteOff?.(prev); }
    pressed.current.set(pointerId, midi);
    onNoteOn?.(midi);
    setDown((s) => { const n = new Set(s); if (prev !== undefined) n.delete(prev); n.add(midi); return n; });
  };
  const release = (pointerId: number) => {
    const prev = pressed.current.get(pointerId);
    if (prev === undefined) return;
    pressed.current.delete(pointerId);
    onNoteOff?.(prev);
    setDown((s) => { const n = new Set(s); n.delete(prev); return n; });
  };

  const keyProps = (midi: number) => disabled ? {} : {
    onPointerDown: (e: React.PointerEvent) => { (e.target as Element).releasePointerCapture?.(e.pointerId); press(e.pointerId, midi); },
    onPointerEnter: (e: React.PointerEvent) => { if (e.buttons > 0 || e.pointerType === "touch") press(e.pointerId, midi); },
    onPointerUp: (e: React.PointerEvent) => release(e.pointerId),
    onPointerCancel: (e: React.PointerEvent) => release(e.pointerId),
    onPointerLeave: (e: React.PointerEvent) => { if (e.pointerType !== "touch") release(e.pointerId); },
  };

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={cn("w-full select-none touch-none", className)} style={{ maxHeight: height }} role="group" aria-label="Piano keyboard"
      onPointerLeave={() => { for (const id of Array.from(pressed.current.keys())) release(id); }}>
      {whites.map((k) => {
        const state = highlights[k.midi];
        const fill = down.has(k.midi) ? FILL.active : state ? FILL[state] : "var(--key-white)";
        const pc = midiToPc(k.midi, preferFlats);
        return (
          <g key={k.midi} {...keyProps(k.midi)} style={{ cursor: disabled ? "default" : "pointer" }}>
            <rect x={k.x + 1} y={0} width={WHITE_W - 2} height={height} rx={6} fill={fill} stroke="#2b2d42" strokeWidth={1.5} />
            {(showNoteNames || pc === "C") && <text x={k.x + WHITE_W / 2} y={height - 10} textAnchor="middle" fontSize={11} fontWeight={700} fill="#2b2d42" opacity={0.8}>{prettyPc(pc)}{pc === "C" ? Math.floor(k.midi / 12) - 1 : ""}</text>}
            {labels[k.midi] && <text x={k.x + WHITE_W / 2} y={height - 30} textAnchor="middle" fontSize={16} fontWeight={800} fill="#1f2140">{labels[k.midi]}</text>}
            {markers.includes(k.midi) && <circle cx={k.x + WHITE_W / 2} cy={height - 50} r={5} fill="#4f46e5" />}
          </g>
        );
      })}
      {blacks.map((k) => {
        const state = highlights[k.midi];
        const fill = down.has(k.midi) ? FILL.active : state ? FILL[state] : "var(--key-black)";
        return (
          <g key={k.midi} {...keyProps(k.midi)} style={{ cursor: disabled ? "default" : "pointer" }}>
            <rect x={k.x} y={0} width={BLACK_W} height={blackH} rx={4} fill={fill} stroke="#1f2140" strokeWidth={1.5} />
            {labels[k.midi] && <text x={k.x + BLACK_W / 2} y={blackH - 12} textAnchor="middle" fontSize={14} fontWeight={800} fill={state || down.has(k.midi) ? "#1f2140" : "#fff"}>{labels[k.midi]}</text>}
            {markers.includes(k.midi) && <circle cx={k.x + BLACK_W / 2} cy={blackH - 30} r={4} fill="#ffd166" />}
            {showNoteNames && <text x={k.x + BLACK_W / 2} y={blackH - 28} textAnchor="middle" fontSize={9} fontWeight={700} fill={state ? "#1f2140" : "#fff"} opacity={0.85}>{prettyPc(midiToPc(k.midi, preferFlats))}</text>}
          </g>
        );
      })}
    </svg>
  );
}

/** Choose a sensible two-octave window that contains all given notes. */
export function keyboardRangeFor(midis: number[], minSpan = 24): [number, number] {
  if (!midis.length) return [60, 84];
  let lo = Math.min(...midis);
  let hi = Math.max(...midis);
  // Snap to C below.
  lo = lo - (lo % 12);
  if (hi - lo < minSpan) hi = lo + minSpan;
  // Snap hi to a C or E to end on a white key cleanly.
  while (isBlackKey(hi)) hi++;
  return [lo, hi];
}
