"use client";
import * as React from "react";
import { motion } from "framer-motion";
import { BookOpen, Music2, Pause, Play } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { formatDuration } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

export type SplitSide = "piece" | "lead";

export interface SplitTimerProps {
  plannedSec: number;
  /** Percent of the block given to the piece (0-100). */
  split: number;
  onSplitChange: (pct: number) => void;
  started: boolean;
  active: SplitSide;
  running: boolean;
  times: Record<SplitSide, number>;
  onSelect: (side: SplitSide) => void;
}

export function budgetFor(plannedSec: number, split: number): Record<SplitSide, number> {
  const piece = Math.round((plannedSec * split) / 100);
  return { piece, lead: Math.max(0, plannedSec - piece) };
}

/** Two sub-timers with a big toggle. Before starting, a slider sets the split. */
export function SplitTimer({ plannedSec, split, onSplitChange, started, active, running, times, onSelect }: SplitTimerProps) {
  const budget = budgetFor(plannedSec, split);
  const side = (key: SplitSide, label: string, Icon: typeof Music2) => {
    const isActive = active === key;
    const left = Math.max(0, budget[key] - times[key]);
    const over = times[key] > budget[key];
    const pct = budget[key] ? Math.min(100, (times[key] / budget[key]) * 100) : 100;
    return (
      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={() => onSelect(key)}
        aria-pressed={isActive}
        className={cn(
          "relative flex min-h-24 flex-1 flex-col items-start justify-between gap-1 overflow-hidden rounded-3xl border-2 p-4 text-left transition-colors",
          isActive ? "border-primary bg-primary/10" : "border-border bg-card",
        )}
      >
        <div className="flex w-full items-center gap-2">
          <Icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} />
          <span className="font-display text-lg font-semibold">{label}</span>
          <span className="ml-auto flex items-center gap-1 text-xs font-bold text-muted-foreground">
            {isActive && started ? (running ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />) : null}
            {isActive && started ? (running ? "running" : "paused") : "tap to switch"}
          </span>
        </div>
        <div className={cn("font-mono text-3xl font-bold tabular-nums", over ? "text-secondary-foreground" : "")}>
          {over ? `+${formatDuration(Math.round(times[key] - budget[key]))}` : formatDuration(Math.round(left))}
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <motion.div className={cn("h-full", over ? "bg-secondary" : "bg-primary")} animate={{ width: `${pct}%` }} transition={{ ease: "linear", duration: 0.25 }} />
        </div>
      </motion.button>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        {side("piece", "Piece", Music2)}
        {side("lead", "Lead sheet", BookOpen)}
      </div>
      {!started && (
        <div className="rounded-2xl border-2 bg-card px-4 py-2">
          <div className="flex items-center justify-between text-sm font-bold text-muted-foreground">
            <span>Piece {formatDuration(budget.piece)}</span>
            <span>Drag to split your time</span>
            <span>Lead sheet {formatDuration(budget.lead)}</span>
          </div>
          <Slider value={[split]} min={10} max={90} step={5} onValueChange={(v) => onSplitChange(v[0])} aria-label="Split between piece and lead sheet" />
          <p className="text-center text-xs text-muted-foreground">Tap a side above to start its timer.</p>
        </div>
      )}
    </div>
  );
}
