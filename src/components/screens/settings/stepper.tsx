"use client";
import * as React from "react";
import { Stepper as DsStepper } from "@/components/ds";

/** A Fredoka figure between two square buttons. Levels, volume, weights. Wraps the design system's stepper. */
export function Stepper({ value, min, max, step = 1, onChange, format, label }: { value: number; min: number; max: number; step?: number; onChange: (v: number) => void; format?: (v: number) => string; label: string; width?: number }) {
  return (
    <span aria-label={label} style={{ display: "inline-flex" }}>
      <DsStepper value={value} min={min} max={max} step={step} onChange={onChange} format={format} />
    </span>
  );
}
