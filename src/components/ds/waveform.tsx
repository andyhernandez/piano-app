import * as React from "react";

/** A recording drawn as its own amplitude: rounded indigo bars, lilac past the playhead. Never a generic icon. */
export function Waveform({ bars, height = 36, tone = "resting", split, style }: { bars: number[]; height?: number; tone?: "resting" | "mint" | "indigo"; split?: number; style?: React.CSSProperties }) {
  const fill = tone === "mint" ? "var(--kc-mint)" : "var(--kc-indigo)";
  const dim = tone === "mint" ? "var(--kc-mint-wash)" : "var(--kc-lilac)";
  const cut = split === undefined ? bars.length : Math.round(bars.length * split);
  return (
    <span style={{ flex: 1, display: "flex", alignItems: "center", gap: 3, height, minWidth: 0, ...style }}>
      {bars.map((b, i) => (
        <span key={i} style={{ flex: 1, height: Math.max(14, Math.min(100, b)) + "%", minWidth: 3, borderRadius: 999, background: i < cut ? fill : dim }} />
      ))}
    </span>
  );
}
