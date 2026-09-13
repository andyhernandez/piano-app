"use client";
import * as React from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type SelfReport = "tricky" | "okay" | "great";

const OPTIONS: { value: SelfReport; emoji: string; label: string }[] = [
  { value: "tricky", emoji: "😅", label: "Tricky" },
  { value: "okay", emoji: "🙂", label: "Okay" },
  { value: "great", emoji: "🤩", label: "Great!" },
];

/** Timer-mode self report shown at Done: three big emoji buttons. */
export function SelfReportDialog({ open, onPick }: { open: boolean; onPick: (v: SelfReport) => void }) {
  return (
    <Dialog open={open}>
      <DialogContent hideClose className="max-w-md" onEscapeKeyDown={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">How did it feel?</DialogTitle>
          <DialogDescription>Tap the face that fits. Every answer is a good answer.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-3 pt-2">
          {OPTIONS.map((o, i) => (
            <motion.button
              key={o.value}
              type="button"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.07 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => onPick(o.value)}
              className="flex h-28 flex-col items-center justify-center gap-1 rounded-3xl border-2 bg-card font-bold shadow-[0_4px_0_0_rgba(0,0,0,0.08)] hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="text-5xl" aria-hidden>{o.emoji}</span>
              <span>{o.label}</span>
            </motion.button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
