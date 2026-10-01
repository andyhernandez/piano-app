import * as React from "react";

export interface PianoStripLit {
  /** Fill colour for a white key by index. */
  whites?: Record<number, string>;
  /** Fill colour for a black key by the index of the white key it follows. */
  blacks?: Record<number, string>;
  /** A label at the foot of a white key. */
  labels?: Record<number, string>;
}

/** A decorative keyboard of N white keys with lit keys and labels. Used in ear, scales, chords and "your own". */
export function PianoStrip({ keys = 15, height = 120, lit = {}, startsOnC = true, style }: { keys?: number; height?: number; lit?: PianoStripLit; startsOnC?: boolean; style?: React.CSSProperties }) {
  // Black keys follow white keys C D (F G A) in each octave: C#, D#, F#, G#, A#.
  const pattern = startsOnC ? [1, 1, 0, 1, 1, 1, 0] : [1, 0, 1, 1, 0, 1, 1];
  const blacks: React.ReactNode[] = [];
  for (let i = 0; i < keys - 1; i++) {
    if (pattern[i % 7]) {
      blacks.push(<span key={i} style={{ position: "absolute", top: 0, width: `${((100 / keys) * 0.6).toFixed(2)}%`, height: "58%", borderRadius: "0 0 6px 6px", background: lit.blacks?.[i] ?? "var(--kc-ink)", left: `${(((i + 1) / keys) * 100 - (100 / keys) * 0.3).toFixed(2)}%` }} />);
    }
  }
  return (
    <div style={{ position: "relative", height, border: "2px solid var(--kc-border)", borderRadius: 16, overflow: "hidden", display: "flex", background: "var(--kc-panel)", boxShadow: "var(--kc-shadow-press)", ...style }}>
      {Array.from({ length: keys }, (_, i) => (
        <span key={i} style={{ flex: 1, borderRight: i === keys - 1 ? "none" : "2px solid var(--kc-border)", background: lit.whites?.[i] ?? "var(--kc-panel)", boxSizing: "border-box", display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 8, fontFamily: "var(--kc-font-display)", fontSize: 13, fontWeight: 600, color: "var(--kc-ink)" }}>{lit.labels?.[i] ?? ""}</span>
      ))}
      {blacks}
    </div>
  );
}
