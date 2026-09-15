import * as React from "react";

/** A recording drawn as its own amplitude. Never a generic sound-wave icon. */
export function Waveform({ bars, height = 26, tone = "resting", style }: { bars: number[]; height?: number; tone?: "resting" | "mint"; style?: React.CSSProperties }) {
  const fill = tone === "mint" ? "var(--kc-mint)" : "var(--kc-border-active)";
  return (
    <span style={{ flex: 1, display: "flex", alignItems: "center", gap: 2, height, minWidth: 0, ...style }}>
      {bars.map((b, i) => (
        <span key={i} style={{ flex: 1, height: Math.max(4, Math.min(100, b)) + "%", minWidth: 2, borderRadius: 1, background: fill }} />
      ))}
    </span>
  );
}
