"use client";
import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eye } from "lucide-react";
import { MiniStaff } from "@/components/staff/staff";
import { PianoKeyboard, type KeyState } from "@/components/keyboard/piano-keyboard";
import { useAudio } from "@/lib/hooks/use-audio";
import { useInput } from "@/lib/hooks/use-input";
import { midiToName } from "@/lib/music/notes";
import { seededRandom, pick } from "@/lib/utils/random";
import type { Clef } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import type { AssessmentTestProps } from "./echo-test";

const TOTAL = 10;
const CAP_MS = 8000;
/** White keys C4–G5 (treble) and C3–B3 (bass). */
const TREBLE_POOL = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79];
const BASS_POOL = [48, 50, 52, 53, 55, 57, 59];

interface FlashNote { midi: number; clef: Clef }
interface FlashResult { target: number; answered: number | null; elapsedMs: number; score: number; credit: number }

function makeNotes(seed: number): FlashNote[] {
  const rng = seededRandom(seed);
  const out: FlashNote[] = [];
  while (out.length < TOTAL) {
    const i = out.length;
    // Rounds 6–10 mix in the bass clef (about half the time).
    const useBass = i >= 5 && rng() < 0.55;
    const midi = pick(rng, useBass ? BASS_POOL : TREBLE_POOL);
    if (out[i - 1]?.midi === midi) continue;
    out.push({ midi, clef: midi >= 60 ? "treble" : "bass" });
  }
  return out;
}

function speedFactor(elapsedMs: number): number {
  return Math.max(0.4, Math.min(1, 1 - (elapsedMs - 1500) / 6000));
}

function copyFor(r: FlashResult): string {
  if (r.answered === null) return "Time's up — let's try the next one.";
  if (r.credit === 1) return r.elapsedMs < 2500 ? "Lightning fast! ⚡" : "Yes, that's it!";
  if (r.credit === 0.5) return "Right note name, different octave — nice reading!";
  return `Not quite — it was ${midiToName(r.target)}.`;
}

/**
 * Flash test (reading): one note at a time on a mini staff; the kid taps it on the on-screen keyboard or plays it.
 * Speed matters: per-note score = credit × clamp(1 − (elapsed − 1.5s)/6s, 0.4, 1). Octave slips earn half credit.
 */
export function FlashTest({ inputMode, onDone }: AssessmentTestProps) {
  const { audio } = useAudio();
  const [notes] = React.useState(() => makeNotes(Math.floor(Math.random() * 1e9)));
  const [index, setIndex] = React.useState(0);
  const [phase, setPhase] = React.useState<"show" | "feedback">("show");
  const [results, setResults] = React.useState<FlashResult[]>([]);
  const shownAt = React.useRef(0);
  const answered = React.useRef(false);
  const onDoneRef = React.useRef(onDone);
  React.useEffect(() => { onDoneRef.current = onDone; });

  const current = notes[index];

  const finish = React.useCallback((midi: number | null) => {
    if (answered.current) return;
    answered.current = true;
    const elapsedMs = Math.max(0, performance.now() - shownAt.current);
    const target = notes[index].midi;
    const credit = midi === null ? 0 : midi === target ? 1 : midi % 12 === target % 12 ? 0.5 : 0;
    const score = credit > 0 ? credit * speedFactor(elapsedMs) : 0;
    audio.stinger(credit > 0 ? "success" : "fail");
    setResults((rs) => [...rs, { target, answered: midi, elapsedMs: Math.round(elapsedMs), score, credit }]);
    setPhase("feedback");
  }, [audio, index, notes]);

  // Show phase: stamp the clock and arm the 8s cap. Feedback phase: pause, then advance.
  React.useEffect(() => {
    if (phase === "show") {
      shownAt.current = performance.now();
      answered.current = false;
      const t = setTimeout(() => finish(null), CAP_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      if (index + 1 < TOTAL) {
        setIndex(index + 1);
        setPhase("show");
      } else {
        const mean = results.length ? results.reduce((s, r) => s + r.score, 0) / results.length : 0;
        onDoneRef.current(Math.round(mean * 100), { notes: results, inputMode });
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [phase, index, finish, results, inputMode]);

  const { tap } = useInput({
    onNote: (e) => {
      if (phase !== "show" || e.kind !== "on") return;
      finish(e.midi);
    },
  });

  const last = results[results.length - 1];
  const highlights: Partial<Record<number, KeyState>> = {};
  if (phase === "feedback" && last) {
    highlights[last.target] = "correct";
    if (last.answered !== null && last.answered !== last.target) highlights[last.answered] = "active";
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
        <Eye className="h-4 w-4" /> Note {index + 1} of {TOTAL} · {current.clef === "treble" ? "treble clef" : "bass clef"}
      </div>
      <ol className="flex gap-1.5" aria-label="notes">
        {notes.map((_, i) => (
          <li key={i} className={cn("h-2.5 w-4 rounded-full", i < results.length ? (results[i].credit > 0 ? "bg-accent" : "bg-secondary") : i === index ? "bg-primary" : "bg-muted")} />
        ))}
      </ol>

      <div className="relative flex w-full max-w-md flex-col items-center gap-2 rounded-3xl border-2 bg-card p-4">
        <h3 className="font-display text-2xl">{phase === "show" ? "Which note is this?" : last ? copyFor(last) : ""}</h3>
        <AnimatePresence mode="wait">
          <motion.div key={index} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }} className="[&_svg]:h-auto [&_svg]:w-[300px]">
            <MiniStaff midis={[current.midi]} clef={current.clef} state={phase === "feedback" && last?.credit ? "correct" : undefined} />
          </motion.div>
        </AnimatePresence>
        {/* Time bar: 8 seconds per note. Restarted by the key. */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          {phase === "show" && (
            <motion.div key={`bar-${index}`} className="h-full bg-primary/70" initial={{ width: "100%" }} animate={{ width: "0%" }} transition={{ duration: CAP_MS / 1000, ease: "linear" }} />
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{inputMode === "timer" ? "Tap the key." : "Play it on your piano, or tap the key."}</p>
      <div className="w-full max-w-4xl overflow-x-auto">
        <PianoKeyboard
          from={48}
          to={84}
          height={140}
          showNoteNames={false}
          highlights={highlights}
          disabled={phase !== "show"}
          onNoteOn={(m) => tap.note(m, "on")}
          onNoteOff={(m) => tap.note(m, "off")}
        />
      </div>
    </div>
  );
}
