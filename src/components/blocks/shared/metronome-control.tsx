"use client";
import * as React from "react";
import { motion } from "framer-motion";
import { Minus, Pause, Play, Plus } from "lucide-react";
import { useAudio } from "@/lib/hooks/use-audio";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils/cn";

export const BPM_MIN = 40;
export const BPM_MAX = 180;

export function clampBpm(n: number): number {
  return Math.max(BPM_MIN, Math.min(BPM_MAX, Math.round(n)));
}

export interface MetronomeState {
  bpm: number;
  setBpm: (bpm: number) => void;
  /** Whether the kid has switched the metronome on. */
  on: boolean;
  setOn: (on: boolean) => void;
  toggle: () => void;
  /** Whether the engine is actually clicking (on && enabled). */
  running: boolean;
  /** Beat index within the bar (0 = accent). */
  beat: number;
  /** Monotonic counter, increments on every click — key animations off it. */
  tick: number;
  beatsPerBar: number;
}

/**
 * Owns the audio engine's metronome for one block. The engine is started/stopped by an effect, so it always
 * stops when the block unmounts or `enabled` (the block's running flag) turns false.
 */
export function useMetronome({ initialBpm = 80, beatsPerBar = 4, enabled = true }: { initialBpm?: number; beatsPerBar?: number; enabled?: boolean } = {}): MetronomeState {
  const { audio } = useAudio();
  const [bpm, setBpmState] = React.useState(() => clampBpm(initialBpm));
  const [on, setOn] = React.useState(false);
  const [pulse, setPulse] = React.useState({ beat: 0, tick: 0 });
  const bpmRef = React.useRef(clampBpm(initialBpm));
  const running = on && enabled;

  React.useEffect(() => {
    if (!running) return;
    audio.startMetronome({ bpm: bpmRef.current, beatsPerBar, onBeat: (beat) => setPulse((p) => ({ beat, tick: p.tick + 1 })) });
    return () => audio.stopMetronome();
  }, [audio, running, beatsPerBar]);

  const setBpm = React.useCallback((n: number) => {
    const c = clampBpm(n);
    bpmRef.current = c;
    setBpmState(c);
    if (audio.metronomeRunning) audio.setMetronomeBpm(c);
  }, [audio]);

  const toggle = React.useCallback(() => setOn((v) => !v), []);

  return { bpm, setBpm, on, setOn, toggle, running, beat: pulse.beat, tick: pulse.tick, beatsPerBar };
}

/** A circle that pulses on every click; bigger and gold on beat 1. */
export function PulseDot({ tick, beat, running, size = 56, className }: { tick: number; beat: number; running: boolean; size?: number; className?: string }) {
  const accent = beat === 0;
  return (
    <div className={cn("flex items-center justify-center", className)} style={{ width: size * 1.5, height: size * 1.5 }} aria-hidden>
      <motion.div
        key={running ? tick : "idle"}
        initial={{ scale: running ? (accent ? 1.5 : 1.3) : 1, opacity: 1 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        className={cn("rounded-full shadow-inner", running && accent ? "bg-secondary" : "bg-primary", !running && "opacity-30")}
        style={{ width: size, height: size }}
      />
    </div>
  );
}

/** Compact start/stop pill for a block header. */
export function MetronomeToggle({ m, className }: { m: MetronomeState; className?: string }) {
  return (
    <Button variant={m.on ? "default" : "outline"} size="sm" onClick={m.toggle} aria-pressed={m.on} aria-label={m.on ? "Stop metronome" : "Start metronome"} className={cn("font-mono tabular-nums", className)}>
      {m.on ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />} {m.bpm}
    </Button>
  );
}

/** Full metronome control: pulse dot, BPM readout, -/+ buttons, slider and Start/Stop. */
export function MetronomeControl({ m, className, showPulse = true }: { m: MetronomeState; className?: string; showPulse?: boolean }) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center gap-3">
        {showPulse && <PulseDot tick={m.tick} beat={m.beat} running={m.running} size={44} />}
        <div className="flex flex-1 flex-col">
          <div className="font-display text-4xl font-bold tabular-nums leading-none">{m.bpm}</div>
          <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">BPM</div>
        </div>
        <Button variant={m.on ? "destructive" : "default"} size="lg" onClick={m.toggle} aria-pressed={m.on}>
          {m.on ? <><Pause className="h-5 w-5" /> Stop</> : <><Play className="h-5 w-5" /> Start</>}
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => m.setBpm(m.bpm - 5)} aria-label="Slower" disabled={m.bpm <= BPM_MIN}><Minus className="h-5 w-5" /></Button>
        <Slider min={BPM_MIN} max={BPM_MAX} step={1} value={[m.bpm]} onValueChange={(v) => m.setBpm(v[0] ?? m.bpm)} aria-label="Tempo" className="flex-1" />
        <Button variant="outline" size="icon" onClick={() => m.setBpm(m.bpm + 5)} aria-label="Faster" disabled={m.bpm >= BPM_MAX}><Plus className="h-5 w-5" /></Button>
      </div>
    </div>
  );
}
