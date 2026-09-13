"use client";
import * as React from "react";
import { motion } from "framer-motion";
import { Check, Clock, Plus } from "lucide-react";
import type { BlockType } from "@/lib/types";
import { BLOCK_DEFS } from "./block-props";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatDuration } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

export interface BlockShellProps {
  type: BlockType;
  remainingSec: number;
  plannedSec: number;
  onDone: () => void;
  onAddMinute?: () => void;
  /** Optional right-side header widget (metronome, input badge…). */
  headerRight?: React.ReactNode;
  /** Override rules banner. */
  rules?: string[];
  doneLabel?: string;
  doneDisabled?: boolean;
  children: React.ReactNode;
  className?: string;
}

/** Shared chrome for all six blocks: title, rules, countdown, progress bar, Done button. */
export function BlockShell({ type, remainingSec, plannedSec, onDone, onAddMinute, headerRight, rules, doneLabel = "Done", doneDisabled, children, className }: BlockShellProps) {
  const def = BLOCK_DEFS[type];
  const progress = plannedSec ? Math.min(100, Math.round(((plannedSec - remainingSec) / plannedSec) * 100)) : 100;
  const urgent = remainingSec <= 10 && remainingSec > 0;
  return (
    <div className={cn("flex flex-1 flex-col gap-3", className)}>
      <header className="flex flex-wrap items-center gap-3">
        <span className="text-3xl" aria-hidden>{def.emoji}</span>
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">{def.title}</h1>
        <div className="ml-auto flex items-center gap-2">
          {headerRight}
          <div className={cn("flex items-center gap-1 rounded-full border-2 bg-card px-3 py-1 font-mono text-lg font-bold tabular-nums", urgent && "border-destructive text-destructive animate-pulse")}>
            <Clock className="h-4 w-4" /> {formatDuration(remainingSec)}
          </div>
          {onAddMinute && (
            <Button variant="outline" size="sm" onClick={onAddMinute} aria-label="Add one minute"><Plus className="h-4 w-4" /> 1 min</Button>
          )}
        </div>
      </header>
      <Progress value={progress} className="h-3" />
      <ul className="flex flex-wrap gap-2 text-sm font-bold">
        {(rules ?? def.rules).map((r) => (
          <li key={r} className="rounded-full bg-muted px-3 py-1 text-muted-foreground">{r}</li>
        ))}
      </ul>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-1 flex-col gap-4">
        {children}
      </motion.div>
      <footer className="sticky bottom-0 flex justify-end bg-gradient-to-t from-background via-background to-transparent pt-4 pb-2">
        <Button size="lg" variant="accent" onClick={onDone} disabled={doneDisabled}>
          <Check className="h-6 w-6" /> {doneLabel}
        </Button>
      </footer>
    </div>
  );
}
