"use client";
import * as React from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { MidiScore } from "@/lib/types";
import { BADGE_META } from "@/lib/engine/progression";
import { cn } from "@/lib/utils/cn";

function Stat({ label, value, suffix = "%" }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-muted px-3 py-2">
      <div className="font-display text-2xl font-bold tabular-nums">{value}{suffix}</div>
      <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function encouragement(score: number): string {
  if (score >= 90) return "Sparkling! That was a clean run.";
  if (score >= 70) return "Lovely — steady and mostly spot on.";
  if (score >= 45) return "Good work. Try it once more, a little slower.";
  return "Nice try! Slow the click down and listen for even notes.";
}

/** Score card after a scale check. Shows the Clean Scale celebration when the badge is earned. */
export function CheckResult({ result, className }: { result: MidiScore; className?: string }) {
  const badge = result.badge ? BADGE_META[result.badge] : null;
  return (
    <motion.div initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className={cn("flex flex-col gap-3 rounded-3xl border-2 bg-card p-4", badge && "border-secondary", className)} role="status">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <span className="font-display text-3xl font-bold tabular-nums">{result.score}</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="font-display text-xl font-bold">{encouragement(result.score)}</div>
          {result.inputMode === "timer" && <div className="text-sm text-muted-foreground">Checked on the screen keyboard — plug in a piano to earn the Clean Scale badge.</div>}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Right notes" value={result.components.accuracy ?? 0} />
        <Stat label="Evenness" value={result.components.evenness ?? 0} />
        <Stat label="Tempo" value={result.components.tempo ?? 0} />
      </div>
      {badge && (
        <motion.div initial={{ scale: 0.6, rotate: -6, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 14 }} className="flex items-center gap-3 rounded-2xl bg-secondary px-4 py-3 text-secondary-foreground">
          <span className="text-4xl" aria-hidden>{badge.emoji}</span>
          <div className="flex flex-col">
            <div className="flex items-center gap-1 font-display text-lg font-bold"><Sparkles className="h-5 w-5" /> {badge.title} badge!</div>
            <div className="text-sm">{badge.description}</div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
