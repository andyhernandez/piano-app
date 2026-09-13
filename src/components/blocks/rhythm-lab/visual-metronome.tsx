"use client";
import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils/cn";

export interface VisualMetronomeProps {
  /** Increments on every beat; drives the bounce. */
  pulse: number;
  /** Beat index within the bar (0-3) or null when silent. */
  beatInBar: number | null;
  bpm: number;
  onBpmChange?: (bpm: number) => void;
  bpmDisabled?: boolean;
  /** Optional big label drawn inside the circle (count-in numbers, "Listen", "Tap!"). */
  label?: string;
  className?: string;
}

const BEATS = [0, 1, 2, 3];

/** Bouncing ball + pulsing circle (§4B). Purely visual; the parent drives it from metronome onBeat callbacks. */
export function VisualMetronome({ pulse, beatInBar, bpm, onBpmChange, bpmDisabled, label, className }: VisualMetronomeProps) {
  const beatSec = 60 / bpm;
  const active = beatInBar !== null;
  return (
    <div className={cn("flex flex-col items-center gap-3 rounded-3xl border-2 bg-card p-4", className)}>
      <div className="relative flex h-40 w-full items-end justify-center">
        {/* Bouncing ball */}
        <motion.div
          key={pulse}
          initial={{ y: active ? -70 : 0, scale: active ? 0.9 : 1 }}
          animate={{ y: 0, scale: 1 }}
          transition={{ duration: Math.min(0.45, beatSec * 0.6), ease: "easeIn" }}
          className={cn("absolute bottom-16 h-8 w-8 rounded-full bg-accent shadow-[0_6px_0_0_rgba(0,0,0,0.12)]", !active && "opacity-40")}
          aria-hidden
        />
        {/* Pulsing circle */}
        <div className="relative flex h-24 w-24 items-center justify-center">
          <AnimatePresence>
            {active && (
              <motion.span
                key={pulse}
                initial={{ scale: 0.9, opacity: 0.8 }}
                animate={{ scale: 1.6, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: Math.min(0.6, beatSec * 0.8), ease: "easeOut" }}
                className="pointer-events-none absolute inset-0 rounded-full border-4 border-primary"
              />
            )}
          </AnimatePresence>
          <motion.div
            key={`c${pulse}`}
            initial={{ scale: active ? 1.12 : 1 }}
            animate={{ scale: 1 }}
            transition={{ duration: Math.min(0.35, beatSec * 0.5) }}
            className={cn("flex h-24 w-24 items-center justify-center rounded-full border-4 font-display text-2xl font-bold", beatInBar === 0 ? "border-accent bg-accent/20 text-accent-foreground" : "border-primary bg-primary/10 text-primary")}
          >
            {label ?? (beatInBar !== null ? beatInBar + 1 : "♩")}
          </motion.div>
        </div>
      </div>
      <div className="flex items-center gap-2" aria-hidden>
        {BEATS.map((b) => (
          <span key={b} className={cn("h-3 w-3 rounded-full bg-muted transition-all", beatInBar === b && (b === 0 ? "scale-150 bg-accent" : "scale-125 bg-primary"))} />
        ))}
      </div>
      <div className="flex w-full items-center gap-3">
        <span className="w-20 shrink-0 font-mono text-sm font-bold tabular-nums text-muted-foreground">{bpm} BPM</span>
        <Slider min={50} max={140} step={1} value={[bpm]} disabled={bpmDisabled} onValueChange={(v) => onBpmChange?.(v[0] ?? bpm)} aria-label="Tempo" />
      </div>
    </div>
  );
}
