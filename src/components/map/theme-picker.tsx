"use client";
import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Lock, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { MAP_THEMES, regionsNeededForTheme, type MapTheme } from "./themes";

/** Corner control to switch map themes; locked ones show how many regions are needed. */
export function ThemePicker({ theme, unlocked, completedRegions, onChange }: { theme: MapTheme; unlocked: string[]; completedRegions: number; onChange: (id: string) => void }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="absolute right-3 top-3 z-10 flex flex-col items-end gap-2">
      <Button variant="outline" size="icon" className="rounded-full shadow" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label="Map theme">
        <Palette className="h-6 w-6" />
      </Button>
      <AnimatePresence>
        {open && (
          <motion.ul initial={{ opacity: 0, y: -6, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.95 }} className="flex flex-col gap-1 rounded-2xl border-2 bg-card p-2 shadow-lg">
            {MAP_THEMES.map((t, i) => {
              const isUnlocked = unlocked.includes(t.id) || i === 0;
              const need = regionsNeededForTheme(i);
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    disabled={!isUnlocked}
                    onClick={() => { onChange(t.id); setOpen(false); }}
                    className={cn("flex h-12 w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-bold transition-colors", t.id === theme.id ? "bg-primary/15" : "hover:bg-muted", !isUnlocked && "opacity-50")}
                    aria-pressed={t.id === theme.id}
                  >
                    <span className="h-6 w-6 rounded-full border-2" style={{ background: t.ground, borderColor: t.groundEdge }} aria-hidden />
                    <span>{t.emoji} {t.name}</span>
                    {!isUnlocked && <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground"><Lock className="h-3 w-3" /> {Math.max(0, need - completedRegions)} more</span>}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
