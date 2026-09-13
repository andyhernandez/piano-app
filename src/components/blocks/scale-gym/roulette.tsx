"use client";
import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Dices } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { ROULETTE, type RouletteOption } from "./scale-view";

/**
 * Dynamic Roulette (§4A): spins through Legato / Staccato / Slow / Fast / Hands Together and lands on one.
 * The wheel decelerates over ~14–18 steps; the parent gets `onLand` once.
 */
export function DynamicRoulette({ value, onLand, disabled, className }: { value: RouletteOption | null; onLand: (o: RouletteOption) => void; disabled?: boolean; className?: string }) {
  const [spinning, setSpinning] = React.useState(false);
  const [index, setIndex] = React.useState<number | null>(() => (value ? ROULETTE.findIndex((o) => o.id === value.id) : null));
  const timeouts = React.useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  React.useEffect(() => {
    const set = timeouts.current;
    return () => { for (const id of set) clearTimeout(id); set.clear(); };
  }, []);

  const spin = () => {
    if (spinning || disabled) return;
    const start = index ?? 0;
    const target = Math.floor(Math.random() * ROULETTE.length);
    // Enough steps to feel like a spin, and end exactly on the target.
    let steps = 14 + Math.floor(Math.random() * 5);
    while ((start + steps) % ROULETTE.length !== target) steps++;
    setSpinning(true);
    let delay = 0;
    for (let s = 1; s <= steps; s++) {
      delay += 55 + Math.pow(s / steps, 2.2) * 260;
      const i = (start + s) % ROULETTE.length;
      const last = s === steps;
      const id = setTimeout(() => {
        timeouts.current.delete(id);
        setIndex(i);
        if (last) { setSpinning(false); onLand(ROULETTE[i]); }
      }, delay);
      timeouts.current.add(id);
    }
  };

  const current = index === null ? null : ROULETTE[index];

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div className="relative flex h-24 w-full items-center justify-center overflow-hidden rounded-2xl border-2 bg-muted/60" aria-live="polite">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={current?.id ?? "empty"}
            initial={{ y: 40, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: spinning ? 0.95 : 1.05 }}
            exit={{ y: -40, opacity: 0, scale: 0.9 }}
            transition={{ duration: spinning ? 0.08 : 0.25, ease: "easeOut" }}
            className="flex items-center gap-3"
          >
            {current ? (
              <>
                <span className="text-4xl" aria-hidden>{current.emoji}</span>
                <span className="font-display text-2xl font-bold">{current.label}</span>
              </>
            ) : (
              <span className="font-display text-xl font-bold text-muted-foreground">Spin me!</span>
            )}
          </motion.div>
        </AnimatePresence>
        {!spinning && current && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pointer-events-none absolute inset-0 rounded-2xl ring-4 ring-secondary/70" aria-hidden />
        )}
      </div>
      <Button size="lg" variant="secondary" onClick={spin} disabled={spinning || disabled} className="w-full">
        <motion.span animate={spinning ? { rotate: 360 } : { rotate: 0 }} transition={spinning ? { repeat: Infinity, duration: 0.6, ease: "linear" } : { duration: 0.2 }} className="inline-flex">
          <Dices className="h-6 w-6" />
        </motion.span>
        {spinning ? "Spinning…" : current ? "Spin again" : "Spin!"}
      </Button>
      {!spinning && current && <p className="text-center text-sm font-bold text-muted-foreground">{current.tip}</p>}
    </div>
  );
}
