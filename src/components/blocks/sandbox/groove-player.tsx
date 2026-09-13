"use client";
import * as React from "react";
import { motion } from "framer-motion";
import { Lock, Play, Square } from "lucide-react";
import type { GrooveId } from "@/lib/audio/engine";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils/cn";

export const GROOVES: { id: GrooveId; label: string; emoji: string; beatsPerBar: number }[] = [
  { id: "pop", label: "Pop", emoji: "🎸", beatsPerBar: 4 },
  { id: "waltz", label: "Waltz", emoji: "💃", beatsPerBar: 3 },
  { id: "blues", label: "Blues", emoji: "🎷", beatsPerBar: 4 },
  { id: "lofi", label: "Lo-fi", emoji: "☕", beatsPerBar: 4 },
];

export function beatsPerBarFor(groove: GrooveId): number {
  return GROOVES.find((g) => g.id === groove)?.beatsPerBar ?? 4;
}

export interface GroovePlayerProps {
  groove: GrooveId;
  onGroove: (g: GrooveId) => void;
  unlocked: Set<string>;
  bpm: number;
  onBpm: (bpm: number) => void;
  playing: boolean;
  onToggle: () => void;
  /** Current beat index within the bar (null when stopped). */
  beat: number | null;
  keyLabel: string;
}

export function GroovePlayer({ groove, onGroove, unlocked, bpm, onBpm, playing, onToggle, beat, keyLabel }: GroovePlayerProps) {
  const [lockedTip, setLockedTip] = React.useState<GrooveId | null>(null);
  const tipTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => () => { if (tipTimer.current) clearTimeout(tipTimer.current); }, []);
  const beats = beatsPerBarFor(groove);

  const pick = (id: GrooveId) => {
    if (unlocked.has(id)) { onGroove(id); return; }
    setLockedTip(id);
    if (tipTimer.current) clearTimeout(tipTimer.current);
    tipTimer.current = setTimeout(() => setLockedTip(null), 2000);
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border-2 bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-display text-lg font-semibold">Backing loop</h3>
        <span className="text-sm font-bold text-muted-foreground">in {keyLabel}</span>
        <div className="ml-auto flex h-8 items-end gap-1" aria-hidden>
          {Array.from({ length: beats }, (_, i) => (
            <motion.span
              key={`${groove}-${i}`}
              className={cn("block w-3 rounded-t-md", i === 0 ? "bg-secondary" : "bg-primary")}
              animate={playing && beat === i ? { height: 32, opacity: 1 } : { height: 10, opacity: playing ? 0.5 : 0.3 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {GROOVES.map((g) => {
          const isUnlocked = unlocked.has(g.id);
          const isSel = groove === g.id;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => pick(g.id)}
              aria-pressed={isSel}
              aria-disabled={!isUnlocked}
              title={isUnlocked ? g.label : "Unlock by finishing a region"}
              className={cn(
                "relative flex min-h-16 flex-col items-center justify-center rounded-2xl border-2 px-1 py-2 font-bold transition-colors",
                isSel ? "border-primary bg-primary/10" : "border-border bg-card",
                !isUnlocked && "opacity-50 grayscale",
              )}
            >
              <span className="text-2xl" aria-hidden>{g.emoji}</span>
              <span className="text-sm">{g.label}</span>
              {!isUnlocked && <Lock className="absolute right-2 top-2 h-3.5 w-3.5 text-muted-foreground" aria-label="Locked" />}
            </button>
          );
        })}
      </div>
      {lockedTip && (
        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-1 text-sm font-bold text-muted-foreground">
          <Lock className="h-4 w-4" /> Unlock by finishing a region on the map.
        </motion.p>
      )}

      <div className="flex items-center gap-3">
        <Button size="lg" variant={playing ? "outline" : "default"} onClick={onToggle} aria-label={playing ? "Stop backing loop" : "Play backing loop"}>
          {playing ? <><Square className="h-5 w-5" /> Stop</> : <><Play className="h-5 w-5" /> Play</>}
        </Button>
        <div className="flex-1">
          <div className="flex justify-between text-sm font-bold text-muted-foreground">
            <span>Tempo</span>
            <span className="font-mono text-foreground">{bpm} BPM</span>
          </div>
          <Slider value={[bpm]} min={60} max={140} step={2} onValueChange={(v) => onBpm(v[0])} aria-label="Tempo" />
        </div>
      </div>
    </div>
  );
}
