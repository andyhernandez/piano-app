import * as React from "react";

/** Discrete progress. Done segments are mint, the current one indigo, the rest hairline. */
export function SegmentBar({ total, filled, current, height = 10, radius = 999, gap = 4, style }: { total: number; filled: number; current?: number; height?: number; radius?: number; gap?: number; style?: React.CSSProperties }) {
  return (
    <div style={{ display: "flex", gap, ...style }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ flex: 1, height, borderRadius: radius, boxSizing: "border-box", background: i < filled ? "var(--kc-mint)" : i === current ? "var(--kc-indigo)" : "var(--kc-hairline)" }} />
      ))}
    </div>
  );
}
