"use client";
import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Lightbulb, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const IDEA_PROMPTS = [
  "Play only scale notes — the safe zone is your playground.",
  "Start on the 5th and land back on home.",
  "Copy the bass, then answer it with your own line.",
  "Play as slow as a sleepy cat.",
  "Three notes only. Make them dance.",
  "Play a tune that climbs a staircase, then jumps off.",
  "Whisper on the high keys, stomp on the low keys.",
  "Repeat one little idea four times, then change one note.",
  "Hold one note for a whole bar. Then sprinkle.",
  "Play a question, then play the answer.",
];

/** Small idea carousel for the sandbox. */
export function IdeaPrompts() {
  const [index, setIndex] = React.useState(() => Math.floor(Math.random() * IDEA_PROMPTS.length));
  const next = () => setIndex((i) => (i + 1 + Math.floor(Math.random() * (IDEA_PROMPTS.length - 1))) % IDEA_PROMPTS.length);
  return (
    <div className="flex items-center gap-3 rounded-2xl border-2 border-secondary/60 bg-secondary/15 px-4 py-3">
      <Lightbulb className="h-6 w-6 shrink-0 text-secondary-foreground" />
      <div className="relative min-h-6 flex-1">
        <AnimatePresence mode="wait">
          <motion.p key={index} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }} className="font-display text-base font-semibold sm:text-lg">
            {IDEA_PROMPTS[index]}
          </motion.p>
        </AnimatePresence>
      </div>
      <Button variant="outline" size="sm" onClick={next}><Sparkles className="h-4 w-4" /> New idea</Button>
    </div>
  );
}
