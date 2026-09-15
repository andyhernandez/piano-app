import * as React from "react";

export type StatTone = "default" | "mint" | "amber" | "clay";

/** A headline figure. Mono 32px with an optional unit and delta. */
export function StatTile({ label, value, unit, delta, tone = "default", style }: { label: string; value: React.ReactNode; unit?: string; delta?: string; tone?: StatTone; style?: React.CSSProperties }) {
  const colors = { default: "var(--kc-ink)", mint: "var(--kc-mint)", amber: "var(--kc-amber)", clay: "var(--kc-clay)" };
  return (
    <div style={{ background: "var(--kc-panel)", border: "1px solid var(--kc-border)", borderRadius: "var(--kc-radius-panel)", padding: "16px 18px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 4, minWidth: 0, ...style }}>
      <div style={{ fontFamily: "var(--kc-font-mono)", fontSize: 11, letterSpacing: "0.12em", color: "var(--kc-ink-faint)", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontFamily: "var(--kc-font-mono)", fontSize: 32, lineHeight: 1.1, color: colors[tone], whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {value}
        {unit && <span style={{ fontSize: 15, color: "var(--kc-ink-faint)" }}> {unit}</span>}
        {delta && <span style={{ fontSize: 15, color: "var(--kc-mint)" }}> {delta}</span>}
      </div>
    </div>
  );
}
