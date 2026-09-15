"use client";
import * as React from "react";
import { IconButton } from "@/components/ds";

/** A mono figure between two square buttons. Levels, volume, weights. */
export function Stepper({ value, min, max, step = 1, onChange, format, label, width = 44 }: { value: number; min: number; max: number; step?: number; onChange: (v: number) => void; format?: (v: number) => string; label: string; width?: number }) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, flex: "none" }}>
      <IconButton icon="remove" shape="square" size={34} label={`${label}: less`} disabled={value <= min} onClick={() => onChange(clamp(value - step))} style={{ opacity: value <= min ? 0.4 : 1 }} />
      <span style={{ fontFamily: "var(--kc-font-mono)", fontSize: 20, width, textAlign: "center", color: "var(--kc-ink)", fontVariantNumeric: "tabular-nums" }}>{format ? format(value) : value}</span>
      <IconButton icon="add" shape="square" size={34} label={`${label}: more`} disabled={value >= max} onClick={() => onChange(clamp(value + step))} style={{ opacity: value >= max ? 0.4 : 1 }} />
    </div>
  );
}
