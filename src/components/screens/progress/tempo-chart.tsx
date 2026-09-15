"use client";
import * as React from "react";
import type { ScaleId } from "@/lib/types";

export interface TempoPoint { date: string; bpm: number; scale: ScaleId }

/*
 * The kit's chart, drawn the same way: a 700×240 viewBox stretched to the panel (preserveAspectRatio none),
 * four raised gridlines, one mint polyline with a non-scaling 2.5px stroke, and HTML dots at percentage
 * positions so they stay round. The plateau markers sit on the first run in a new key; the last run is
 * the 12px marker. Two mono labels give the top and bottom of the scale.
 */
const W = 700;
const H = 240;
const X0 = 20;
const X1 = 680;
const Y_TOP = 60;
const Y_BOTTOM = 212;
const GRID = [20, 80, 140, 200];

export function tempoLayout(points: TempoPoint[]) {
  const bpms = points.map((p) => p.bpm);
  const lo = Math.min(...bpms);
  const hi = Math.max(...bpms);
  const span = Math.max(1, hi - lo);
  const n = points.length;
  const xs = points.map((_, i) => (n === 1 ? (X0 + X1) / 2 : X0 + ((X1 - X0) * i) / (n - 1)));
  const ys = points.map((p) => (hi === lo ? (Y_TOP + Y_BOTTOM) / 2 : Y_BOTTOM - ((p.bpm - lo) / span) * (Y_BOTTOM - Y_TOP)));
  const markers = points.flatMap((p, i) => {
    const last = i === n - 1;
    const newKey = i > 0 && (p.scale.key !== points[i - 1].scale.key || p.scale.mode !== points[i - 1].scale.mode);
    if (!last && !newKey) return [];
    return [{ left: `${((xs[i] / W) * 100).toFixed(1)}%`, top: `${((ys[i] / H) * 100).toFixed(1)}%`, r: last ? 12 : 9 }];
  });
  return { lo, hi, pts: points.map((_, i) => `${xs[i].toFixed(0)},${ys[i].toFixed(0)}`).join(" "), markers };
}

export function TempoChart({ points, style }: { points: TempoPoint[]; style?: React.CSSProperties }) {
  const { lo, hi, pts, markers } = React.useMemo(() => tempoLayout(points), [points]);
  return (
    <div style={{ flex: 1, minHeight: 0, position: "relative", ...style }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        {GRID.map((y) => (
          <line key={y} x1="0" y1={y} x2={W} y2={y} stroke="var(--kc-raised)" strokeWidth="1" />
        ))}
        {points.length > 1 && <polyline points={pts} fill="none" stroke="var(--kc-mint)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />}
      </svg>
      {markers.map((m, i) => (
        <span key={i} style={{ position: "absolute", left: m.left, top: m.top, width: m.r, height: m.r, borderRadius: "50%", background: "var(--kc-mint)", transform: "translate(-50%, -50%)" }} />
      ))}
      <span style={{ position: "absolute", left: 0, top: 0, fontFamily: "var(--kc-font-mono)", fontSize: 11, color: "var(--kc-ink-dim)" }}>{hi}</span>
      <span style={{ position: "absolute", left: 0, bottom: 0, fontFamily: "var(--kc-font-mono)", fontSize: 11, color: "var(--kc-ink-dim)" }}>{lo}</span>
    </div>
  );
}
