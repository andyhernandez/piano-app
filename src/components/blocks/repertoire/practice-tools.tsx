"use client";
import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Play, RotateCcw, Square } from "lucide-react";
import type { AudioEngine } from "@/lib/audio/engine";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils/cn";

const REP_TARGET = 5;

/** "Tricky bar reps": tap to count to five, with a little celebration at five. */
export function RepCounter({ audio, onRep }: { audio: AudioEngine; onRep: () => void }) {
  const [count, setCount] = React.useState(0);
  const [rounds, setRounds] = React.useState(0);
  const [burst, setBurst] = React.useState(0);
  const resetTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => () => { if (resetTimer.current) clearTimeout(resetTimer.current); }, []);

  const tap = () => {
    if (count >= REP_TARGET) return;
    const next = count + 1;
    setCount(next);
    onRep();
    if (next >= REP_TARGET) {
      audio.stinger("success");
      setBurst((b) => b + 1);
      resetTimer.current = setTimeout(() => { setCount(0); setRounds((r) => r + 1); }, 1400);
    } else {
      audio.stinger("pop");
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-2xl border-2 bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold">Tricky bar reps</h3>
        {rounds > 0 && <span className="text-xs font-bold text-muted-foreground">{rounds} × five done</span>}
      </div>
      <motion.button type="button" whileTap={{ scale: 0.96 }} onClick={tap} className="relative flex min-h-20 items-center justify-center gap-3 rounded-2xl bg-primary/10 px-4 py-3 touch-none" aria-label="Count one repetition">
        {Array.from({ length: REP_TARGET }, (_, i) => (
          <motion.span
            key={i}
            initial={false}
            animate={i < count ? { scale: [1, 1.4, 1], backgroundColor: "var(--primary)" } : { scale: 1, backgroundColor: "var(--muted)" }}
            transition={{ duration: 0.3 }}
            className="block h-9 w-9 rounded-full border-2 border-primary/40"
          />
        ))}
        <AnimatePresence>
          {count >= REP_TARGET && (
            <motion.span key={burst} initial={{ opacity: 0, y: 10, scale: 0.8 }} animate={{ opacity: 1, y: -34, scale: 1.1 }} exit={{ opacity: 0 }} className="pointer-events-none absolute font-display text-xl font-bold text-primary">
              Five reps! 🎉
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Tap after each clean try. {count}/{REP_TARGET}</span>
        <Button variant="ghost" size="sm" onClick={() => setCount(0)} aria-label="Reset counter"><RotateCcw className="h-4 w-4" /> Reset</Button>
      </div>
    </div>
  );
}

const LADDER = [
  { id: 0, label: "Slow", emoji: "🐢", mult: 0.6 },
  { id: 1, label: "Medium", emoji: "🚶", mult: 0.8 },
  { id: 2, label: "Full speed", emoji: "🚀", mult: 1 },
] as const;

/** Metronome with a BPM slider and a slow → medium → full tempo ladder. */
export function MetronomeLadder({ audio, running }: { audio: AudioEngine; running: boolean }) {
  const [targetBpm, setTargetBpm] = React.useState(84);
  const [step, setStep] = React.useState(0);
  const [on, setOn] = React.useState(false);
  const [beat, setBeat] = React.useState<number | null>(null);
  const effective = Math.max(30, Math.round(targetBpm * LADDER[step].mult));

  const effRef = React.useRef(effective);
  const clicking = on && running;

  // Follow tempo changes while running without restarting the loop.
  React.useEffect(() => {
    effRef.current = effective;
    if (clicking) audio.setMetronomeBpm(effective);
  }, [effective, clicking, audio]);

  // `on` is the kid's intent; `running` (time's up) gates it. Cleanup stops the click on unmount too.
  React.useEffect(() => {
    if (!clicking) return;
    audio.startMetronome({ bpm: effRef.current, beatsPerBar: 4, onBeat: (b) => setBeat(b) });
    return () => { audio.stopMetronome(); };
  }, [clicking, audio]);

  const toggle = () => {
    if (on) setBeat(null);
    setOn(!on);
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border-2 bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-lg font-semibold">Metronome</h3>
        <div className="flex items-center gap-1" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={cn("h-3 w-3 rounded-full bg-muted transition-colors", clicking && beat === i && (i === 0 ? "bg-secondary" : "bg-primary"))} />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button variant={on ? "outline" : "default"} size="icon" onClick={toggle} aria-label={on ? "Stop metronome" : "Start metronome"}>
          {on ? <Square className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </Button>
        <div className="flex-1">
          <div className="flex justify-between text-sm font-bold text-muted-foreground">
            <span>Full speed</span>
            <span className="font-mono text-foreground">{targetBpm} BPM</span>
          </div>
          <Slider value={[targetBpm]} min={40} max={180} step={2} onValueChange={(v) => setTargetBpm(v[0])} aria-label="Target tempo" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {LADDER.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => setStep(l.id)}
            className={cn("flex min-h-14 flex-col items-center justify-center rounded-2xl border-2 px-2 py-1 font-bold transition-colors", step === l.id ? "border-primary bg-primary/10" : "border-border bg-card")}
            aria-pressed={step === l.id}
          >
            <span className="text-xl" aria-hidden>{l.emoji}</span>
            <span className="text-sm">{l.label}</span>
            <span className="font-mono text-xs text-muted-foreground">{Math.round(targetBpm * l.mult)}</span>
          </button>
        ))}
      </div>
      <p className="text-center text-xs text-muted-foreground">
        {step < 2 ? "Five clean reps here, then climb a step." : "Full speed! Keep it relaxed."}
      </p>
    </div>
  );
}
