"use client";
import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface SegmentedOption<T extends string | number> {
  value: T;
  label: React.ReactNode;
  ariaLabel?: string;
}

/** Big-touch segmented control (radio group) for hand / octave / inversion toggles. */
export function Segmented<T extends string | number>({ value, onChange, options, label, className, size = "md" }: {
  value: T;
  onChange: (v: T) => void;
  options: SegmentedOption<T>[];
  label: string;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex rounded-2xl bg-muted p-1", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={o.ariaLabel}
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-xl font-bold transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              size === "sm" ? "h-9 min-w-10 px-3 text-sm" : "h-11 min-w-12 px-4 text-base",
              active ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
