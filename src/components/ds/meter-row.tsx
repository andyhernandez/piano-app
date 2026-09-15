import * as React from "react";

export type MeterTone = "mint" | "amber" | "clay";

/** A proportion. 7px bar on the raised track, mono value, optional suffix. */
export function MeterRow({ label, value, max = 100, tone = "mint", suffix, labelWidth = 62, style }: { label: string; value: number; max?: number; tone?: MeterTone; suffix?: string; labelWidth?: number; style?: React.CSSProperties }) {
  const tones = { mint: "var(--kc-mint)", amber: "var(--kc-amber)", clay: "var(--kc-clay)" };
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11, fontSize: 14, ...style }}>
      <span style={{ width: labelWidth, flex: "none", color: "var(--kc-ink-muted)" }}>{label}</span>
      <div style={{ flex: 1, height: 7, background: "var(--kc-raised)", borderRadius: 4 }}>
        <div style={{ width: pct + "%", height: "100%", background: tones[tone], borderRadius: 4 }} />
      </div>
      <span style={{ fontFamily: "var(--kc-font-mono)", fontSize: 13, width: 28, textAlign: "right", color: tone === "mint" ? "var(--kc-ink)" : tones[tone] }}>{Math.round(value)}</span>
      {suffix && <span style={{ width: 110, fontSize: 13, color: "var(--kc-ink-dim)" }}>{suffix}</span>}
    </div>
  );
}
