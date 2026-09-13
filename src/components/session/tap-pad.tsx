"use client";
import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

/** Big on-screen tap target. Fires on pointerdown for lowest latency. */
export function TapPad({ onTap, label = "TAP", className, disabled }: { onTap: () => void; label?: string; className?: string; disabled?: boolean }) {
  const [flash, setFlash] = React.useState(0);
  return (
    <motion.button
      type="button"
      disabled={disabled}
      whileTap={{ scale: 0.94 }}
      onPointerDown={(e) => { e.preventDefault(); if (disabled) return; onTap(); setFlash((f) => f + 1); }}
      className={cn("relative flex h-40 w-full select-none items-center justify-center rounded-3xl border-4 border-primary bg-primary/10 font-display text-4xl font-bold text-primary touch-none disabled:opacity-40", className)}
      aria-label={label}
    >
      {label}
      <span key={flash} className={cn("pointer-events-none absolute inset-0 rounded-3xl border-4 border-primary", flash > 0 && "animate-pulse-ring")} />
    </motion.button>
  );
}
