"use client";
import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Ear, Mic, MicOff, RotateCcw, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getInput } from "@/lib/input/manager";
import { useInput } from "@/lib/hooks/use-input";
import { midiToName } from "@/lib/music/notes";
import { cn } from "@/lib/utils/cn";

export interface MicCalibrationResult {
  noiseFloor: number;
  confidenceThreshold: number;
}

type Phase = "requesting" | "denied" | "noise" | "play" | "done";

const TARGET = 60; // middle C
const NEEDED = 3;
/** While listening for the three Cs we open the gate wide so we can observe the real confidence range. */
const LISTEN_THRESHOLD = 0.6;

/**
 * Serialise `use("mic")` calls so a fast unmount/remount (StrictMode) never leaves two streams open.
 * The InputManager tears down the previous source at the start of each `use`, so ordering is all we need.
 */
let micChain: Promise<void> = Promise.resolve();
function requestMic(): Promise<void> {
  micChain = micChain.then(() => getInput().use("mic", null)).catch(() => {});
  return micChain;
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * p)));
  return sorted[idx];
}

/**
 * Microphone calibration (§10): measure the room's noise floor, then have the kid play middle C three times so we
 * can pick a confidence threshold from what the mic actually hears. Octave slips (C3/C5) count — with a friendly note.
 */
export function MicCalibration({ onDone, onCancel }: { onDone: (cal: MicCalibrationResult) => void; onCancel: () => void }) {
  const [phase, setPhase] = React.useState<Phase>("requesting");
  const [attempt, setAttempt] = React.useState(0);
  const [noiseFloor, setNoiseFloor] = React.useState<number | null>(null);
  const [heard, setHeard] = React.useState<{ midi: number; ok: boolean; octaveOff: boolean; id: number }[]>([]);
  const [result, setResult] = React.useState<MicCalibrationResult | null>(null);
  const confidences = React.useRef<number[]>([]);
  const hits = React.useRef(0);
  const lastNoteAt = React.useRef(0);
  const seq = React.useRef(0);

  // Step 0 + 1: request the mic, then measure the room.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      await requestMic();
      if (cancelled) { getInput().stop(); return; }
      const mic = getInput().micSource;
      if (!mic) { setPhase("denied"); return; }
      setPhase("noise");
      const floor = await mic.measureNoiseFloor(1500);
      if (cancelled) return;
      // Re-check: the source may have been torn down while we were measuring.
      const still = getInput().micSource;
      if (!still) { setPhase("denied"); return; }
      still.calibration = { noiseFloor: floor, confidenceThreshold: LISTEN_THRESHOLD };
      setNoiseFloor(floor);
      setPhase("play");
    })();
    return () => {
      cancelled = true;
      getInput().stop();
    };
  }, [attempt]);

  // Step 2: listen for three middle Cs.
  useInput({
    onNote: (e) => {
      if (phase !== "play" || e.kind !== "on") return;
      // The pitch tracker can re-trigger on a sustained note; debounce a little.
      if (e.time - lastNoteAt.current < 250) return;
      lastNoteAt.current = e.time;
      const pc = ((e.midi % 12) + 12) % 12;
      const octaveOff = pc === 0 && e.midi !== TARGET && Math.abs(e.midi - TARGET) === 12;
      const ok = e.midi === TARGET || octaveOff;
      seq.current += 1;
      const id = seq.current;
      setHeard((h) => [...h.slice(-5), { midi: e.midi, ok, octaveOff, id }]);
      if (!ok) return;
      confidences.current.push(e.confidence);
      hits.current += 1;
      if (hits.current >= NEEDED) {
        const sorted = [...confidences.current].sort((a, b) => a - b);
        const p20 = percentile(sorted, 0.2);
        const threshold = Math.min(0.9, Math.max(0.6, Number.isFinite(p20) && p20 > 0 ? p20 : 0.8));
        const cal = { noiseFloor: noiseFloor ?? 0.01, confidenceThreshold: Math.round(threshold * 100) / 100 };
        const mic = getInput().micSource;
        if (mic) mic.calibration = cal;
        setResult(cal);
        setPhase("done");
      }
    },
  });

  const restart = () => {
    confidences.current = [];
    hits.current = 0;
    lastNoteAt.current = 0;
    setHeard([]);
    setResult(null);
    setNoiseFloor(null);
    setPhase("requesting");
    setAttempt((a) => a + 1);
  };

  const cancel = () => {
    getInput().stop();
    onCancel();
  };

  const okCount = Math.min(NEEDED, heard.filter((h) => h.ok).length);

  return (
    <div className="flex flex-col items-center gap-5 rounded-3xl border-2 bg-card p-5 text-center">
      <AnimatePresence mode="wait">
        {phase === "requesting" && (
          <motion.div key="req" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3">
            <Mic className="h-12 w-12 animate-pulse text-primary" />
            <h3 className="font-display text-2xl">Can we use the microphone?</h3>
            <p className="max-w-sm text-muted-foreground">Your browser will ask. Say yes so KeyCadence can hear your piano.</p>
          </motion.div>
        )}

        {phase === "denied" && (
          <motion.div key="denied" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3">
            <MicOff className="h-12 w-12 text-muted-foreground" />
            <h3 className="font-display text-2xl">No microphone this time</h3>
            <p className="max-w-sm text-muted-foreground">
              That&apos;s okay! The microphone was blocked or isn&apos;t available. You can practise with the timer, and a grown-up can turn the mic on later in Settings.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" onClick={restart}><RotateCcw className="h-4 w-4" /> Try again</Button>
              <Button onClick={cancel}><Timer className="h-5 w-5" /> Use timer instead</Button>
            </div>
          </motion.div>
        )}

        {phase === "noise" && (
          <motion.div key="noise" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3">
            <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.2 }} className="text-6xl" aria-hidden>🤫</motion.div>
            <h3 className="font-display text-2xl">Shh… measuring the room</h3>
            <p className="text-muted-foreground">Stay quiet for a moment.</p>
            <div className="h-3 w-48 overflow-hidden rounded-full bg-muted">
              <motion.div className="h-full bg-primary" initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 1.5, ease: "linear" }} />
            </div>
          </motion.div>
        )}

        {phase === "play" && (
          <motion.div key="play" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex w-full flex-col items-center gap-4">
            <Ear className="h-10 w-10 text-primary" />
            <h3 className="font-display text-2xl">Play middle C three times</h3>
            <p className="text-muted-foreground">Nice and clear, one at a time. Middle C is the C closest to the middle of your piano.</p>
            <div className="flex gap-3" aria-label={`${okCount} of ${NEEDED} heard`}>
              {Array.from({ length: NEEDED }, (_, i) => (
                <motion.div
                  key={i}
                  initial={false}
                  animate={i < okCount ? { scale: [1, 1.25, 1], backgroundColor: "var(--accent)" } : { scale: 1, backgroundColor: "var(--muted)" }}
                  className={cn("flex h-16 w-16 items-center justify-center rounded-2xl border-2", i < okCount ? "border-accent text-accent-foreground" : "text-muted-foreground")}
                >
                  {i < okCount ? <Check className="h-9 w-9" strokeWidth={3} /> : <span className="font-display text-2xl">{i + 1}</span>}
                </motion.div>
              ))}
            </div>
            <div className="min-h-8 text-sm text-muted-foreground">
              {heard.length === 0 && <span>Listening…</span>}
              {heard.length > 0 && (() => {
                const last = heard[heard.length - 1];
                if (last.octaveOff) return <span>We heard a C an octave off — that&apos;s fine! 🎵</span>;
                if (last.ok) return <span>Heard it! 🎵</span>;
                return <span>We heard {midiToName(last.midi)} — try the C in the middle.</span>;
              })()}
            </div>
            <div className="flex flex-wrap justify-center gap-1">
              {heard.map((h) => (
                <motion.span key={h.id} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={cn("rounded-full border-2 px-3 py-0.5 text-xs font-bold", h.ok ? "border-accent bg-accent/20" : "bg-muted text-muted-foreground")}>
                  {midiToName(h.midi)}
                </motion.span>
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={cancel}><Timer className="h-4 w-4" /> Skip — use timer instead</Button>
          </motion.div>
        )}

        {phase === "done" && result && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-3">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 15 }} className="flex h-20 w-20 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Check className="h-12 w-12" strokeWidth={3} />
            </motion.div>
            <h3 className="font-display text-2xl">Your piano sounds great!</h3>
            <p className="text-muted-foreground">The microphone is ready. Headphones help it hear only you.</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" onClick={restart}><RotateCcw className="h-4 w-4" /> Redo</Button>
              <Button size="lg" onClick={() => onDone(result)}><Mic className="h-5 w-5" /> Sounds good</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
