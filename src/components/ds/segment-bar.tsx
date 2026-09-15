import * as React from "react";

/** Discrete progress. The current segment is outlined, never filled. */
export function SegmentBar({ total, filled, current, height = 6, radius = 2, gap = 4, style }: { total: number; filled: number; current?: number; height?: number; radius?: number; gap?: number; style?: React.CSSProperties }) {
  return (
    <div style={{ display: "flex", gap, ...style }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ flex: 1, height, borderRadius: radius, boxSizing: "border-box", background: i < filled ? "var(--kc-mint)" : "var(--kc-raised)", border: i === current ? "1.5px solid var(--kc-mint)" : "none" }} />
      ))}
    </div>
  );
}
