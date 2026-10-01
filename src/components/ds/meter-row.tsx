import * as React from "react";

export type MeterTone = "indigo" | "mint" | "sun" | "lilac" | "amber" | "clay";

/** A proportion. 12px pill bar on the hairline track, Nunito label and value. Indigo unless the row means something else. */
export function MeterRow({ label, value, max = 100, tone = "indigo", suffix, labelWidth = 96, style }: { label: string; value: number; max?: number; tone?: MeterTone; suffix?: string; labelWidth?: number; style?: React.CSSProperties }) {
  const tones: Record<MeterTone, string> = { indigo: "var(--kc-indigo)", mint: "var(--kc-mint)", sun: "var(--kc-sun)", lilac: "var(--kc-lilac)", amber: "var(--kc-sun)", clay: "var(--kc-lilac)" };
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, ...style }}>
      <span style={{ width: labelWidth, flex: "none", fontSize: 15, fontWeight: 800, color: "var(--kc-ink)" }}>{label}</span>
      <span style={{ flex: 1, height: 12, borderRadius: 999, background: "var(--kc-hairline)", overflow: "hidden" }}>
        <span style={{ display: "block", height: "100%", width: pct + "%", borderRadius: 999, background: tones[tone] }} />
      </span>
      <span style={{ flex: "none", minWidth: 70, textAlign: "right", fontSize: 14, fontWeight: 800, color: "var(--kc-ink-muted)" }}>{suffix ?? Math.round(value)}</span>
    </div>
  );
}
