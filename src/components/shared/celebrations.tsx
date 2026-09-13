"use client";
import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAppStore } from "@/lib/store/app-store";

/** Bottom-right toast stack for XP, badges, streaks. Auto-dismisses. */
export function CelebrationToaster() {
  const celebrations = useAppStore((s) => s.celebrations);
  const dismiss = useAppStore((s) => s.dismissCelebration);
  React.useEffect(() => {
    if (!celebrations.length) return;
    const t = setTimeout(() => dismiss(celebrations[0].id), 2600);
    return () => clearTimeout(t);
  }, [celebrations, dismiss]);
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
      <AnimatePresence>
        {celebrations.slice(0, 3).map((c) => (
          <motion.div key={c.id} initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 40 }}
            className="pointer-events-auto flex items-center gap-3 rounded-2xl border-2 bg-card px-4 py-3 shadow-lg" onClick={() => dismiss(c.id)}>
            <span className="text-3xl">{c.emoji ?? "⭐"}</span>
            <div>
              <div className="font-display text-lg font-semibold leading-tight">{c.title}</div>
              {c.detail && <div className="text-sm text-muted-foreground">{c.detail}</div>}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
