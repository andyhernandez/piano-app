"use client";
import * as React from "react";
import type { ScaleId } from "@/lib/types";
import { weekKey } from "@/lib/utils/date";

export interface TempoPoint { date: string; bpm: number; scale: ScaleId }

export interface TempoBar { label: string; bpm: number; tone: "indigo" | "lilac" | "sun" }

/**
 * The staircase: one bar per week, the best clean tempo that week. A week that did not beat the one before is
 * lilac (a plateau, worth a look, never a loss); the latest bar is sunshine when it is a new best.
 * Weeks without a clean run are left out so the stairs read as runs, not gaps.
 */
export function tempoStaircase(points: TempoPoint[]): TempoBar[] {
  const byWeek = new Map<string, number>();
  for (const p of points) {
    const wk = weekKey(p.date);
    byWeek.set(wk, Math.max(byWeek.get(wk) ?? 0, p.bpm));
  }
  const weeks = Array.from(byWeek.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const bars: TempoBar[] = [];
  let best = 0;
  weeks.forEach(([, bpm], i) => {
    const plateau = i > 0 && bpm <= weeks[i - 1][1];
    const last = i === weeks.length - 1;
    const tone: TempoBar["tone"] = last && bpm > best && weeks.length > 1 ? "sun" : plateau ? "lilac" : "indigo";
    best = Math.max(best, bpm);
    bars.push({ label: `w${i + 1}`, bpm, tone });
  });
  return bars;
}

export function TempoChart({ points, style }: { points: TempoPoint[]; style?: React.CSSProperties }) {
  const bars = React.useMemo(() => tempoStaircase(points), [points]);
  const lo = Math.min(...bars.map((b) => b.bpm));
  const hi = Math.max(...bars.map((b) => b.bpm));
  // Heights read from a floor a little below the slowest week so the slowest bar still has a body.
  const floor = Math.max(0, lo - Math.max(12, (hi - lo) * 0.6));
  const span = Math.max(1, hi - floor);
  const shown = bars.slice(-12);
  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "flex-end", gap: 8, ...style }}>
      {shown.map((b, i) => {
        const pct = Math.max(10, Math.round(((b.bpm - floor) / span) * 94));
        const fill = b.tone === "sun" ? { background: "var(--kc-sun)", boxShadow: "var(--kc-shadow-press-sun)" } : b.tone === "lilac" ? { background: "var(--kc-lilac)", border: "2px solid var(--kc-indigo)" } : { background: "var(--kc-indigo)" };
        return (
          <div key={i} style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 6, minWidth: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 900, color: "var(--kc-ink-muted)" }}>{b.bpm}</span>
            <span style={{ display: "block", width: "100%", borderRadius: "12px 12px 6px 6px", height: `${pct}%`, boxSizing: "border-box", ...fill }} />
            <span style={{ fontSize: 12, fontWeight: 800, color: "var(--kc-ink-faint)" }}>{b.label}</span>
          </div>
        );
      })}
    </div>
  );
}
