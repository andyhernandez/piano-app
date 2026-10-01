import * as React from "react";

/** sun = a personal best on sunshine with its own shadow. amber/clay are old names kept for callers. */
export type StatTone = "default" | "mint" | "sun" | "indigo" | "amber" | "clay";

/** A headline figure on a card. Fredoka 34 with an optional unit and delta. */
export function StatTile({ label, value, unit, delta, tone = "default", style }: { label: string; value: React.ReactNode; unit?: string; delta?: string; tone?: StatTone; style?: React.CSSProperties }) {
  const sun = tone === "sun" || tone === "amber";
  const colors: Record<StatTone, string> = { default: "var(--kc-ink)", mint: "var(--kc-mint-ink)", sun: "var(--kc-ink)", indigo: "var(--kc-indigo)", amber: "var(--kc-ink)", clay: "var(--kc-indigo-shadow)" };
  return (
    <div style={{ background: sun ? "var(--kc-sun)" : "var(--kc-panel)", border: sun ? "none" : "2px solid var(--kc-border)", boxShadow: sun ? "var(--kc-shadow-press-sun)" : "var(--kc-shadow-press)", borderRadius: "var(--kc-radius-panel)", padding: "18px 20px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 6, minWidth: 0, ...style }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: sun ? "var(--kc-sun-ink)" : "var(--kc-ink-faint)", lineHeight: 1.2 }}>{label}</div>
      <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 34, fontWeight: 600, lineHeight: 1.05, color: colors[tone], whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {value}
        {unit && <span style={{ fontSize: 18, fontWeight: 500, color: sun ? "var(--kc-sun-ink)" : "var(--kc-ink-faint)" }}> {unit}</span>}
        {delta && <span style={{ fontSize: 16, fontFamily: "var(--kc-font-sans)", fontWeight: 800, color: sun ? "var(--kc-sun-ink)" : "var(--kc-mint-ink)" }}> {delta}</span>}
      </div>
    </div>
  );
}
