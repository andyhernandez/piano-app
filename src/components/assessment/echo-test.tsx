"use client";
import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Ear, Repeat, TrendingDown, TrendingUp, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PianoKeyboard } from "@/components/keyboard/piano-keyboard";
import { useAudio } from "@/lib/hooks/use-audio";
import { useInput } from "@/lib/hooks/use-input";
import { lcsLength } from "@/lib/engine/scoring";
import { midiToPc, prettyPc } from "@/lib/music/notes";
import { seededRandom, pick } from "@/lib/utils/random";
import type { InputMode } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

export interface AssessmentTestProps {
  inputMode: InputMode;
  onDone: (score: number, details: Record<string, unknown>) => void;
}

/** C-major five-finger position (§3 Echo). */
const POOL = [60, 62, 64, 65, 67];
const LENGTHS = [2, 2, 3, 3, 4, 5];
const GAP_SEC = 0.5;
const ROUNDS = LENGTHS.length;

type Direction = "up" | "down" | "wiggle";
type Phase = "ready" | "listen" | "answer" | "feedback";

interface RoundResult {
  phrase: number[];
  played: number[];
  score: number;
  method: "played" | "described" | "timeout";
  countAnswer?: number | null;
  directionAnswer?: Direction | null;
}

function makePhrases(seed: number): number[][] {
  const rng = seededRandom(seed);
  return LENGTHS.map((n) => {
    const out: number[] = [];
    while (out.length < n) {
      const m = pick(rng, POOL);
      if (out[out.length - 1] === m) continue; // no immediate repeats so "up/down" stays meaningful
      out.push(m);
    }
    return out;
  });
}

function directionOf(phrase: number[]): Direction {
  let up = true;
  let down = true;
  for (let i = 1; i < phrase.length; i++) {
    if (phrase[i] <= phrase[i - 1]) up = false;
    if (phrase[i] >= phrase[i - 1]) down = false;
  }
  return up ? "up" : down ? "down" : "wiggle";
}

function feedbackCopy(score: number): string {
  if (score >= 0.99) return "Perfect echo! 🌟";
  if (score >= 0.66) return "So close — great ears!";
  if (score >= 0.34) return "Nice try, you caught part of it.";
  return "Not quite — that one was sneaky.";
}

/**
 * Echo test (ear): the app plays a short phrase, the kid plays it back (MIDI / mic / on-screen keys) or, in timer mode,
 * describes it (how many notes, which way it went). Score = mean round score × 100.
 */
export function EchoTest({ inputMode, onDone }: AssessmentTestProps) {
  const { audio } = useAudio();
  const [phrases] = React.useState(() => makePhrases(Math.floor(Math.random() * 1e9)));
  const [round, setRound] = React.useState(0);
  const [phase, setPhase] = React.useState<Phase>("ready");
  const [played, setPlayed] = React.useState<number[]>([]);
  const [countAnswer, setCountAnswer] = React.useState<number | null>(null);
  const [dirAnswer, setDirAnswer] = React.useState<Direction | null>(null);
  const [hearAgainUsed, setHearAgainUsed] = React.useState(false);
  const [results, setResults] = React.useState<RoundResult[]>([]);
  const [replayTick, setReplayTick] = React.useState(0);
  const playedRef = React.useRef<number[]>([]);
  const finalized = React.useRef(false);
  const onDoneRef = React.useRef(onDone);
  React.useEffect(() => { onDoneRef.current = onDone; });

  const phrase = phrases[round];
  const n = phrase.length;
  const isTimer = inputMode === "timer";

  const finishRound = React.useCallback((r: RoundResult) => {
    if (finalized.current) return;
    finalized.current = true;
    setResults((rs) => [...rs, r]);
    setPhase("feedback");
  }, []);

  const finishByPlaying = React.useCallback((method: "played" | "timeout") => {
    const p = playedRef.current;
    const score = n ? lcsLength(phrase, p) / n : 0;
    finishRound({ phrase, played: p, score, method });
  }, [phrase, n, finishRound]);

  // Phase machine. Every timer is cleaned up when the phase changes.
  React.useEffect(() => {
    if (phase === "ready") {
      const t = setTimeout(() => setPhase("listen"), 700);
      return () => clearTimeout(t);
    }
    if (phase === "listen") {
      const total = audio.playSequence(phrase, GAP_SEC, 0.45, 0.8) || n * GAP_SEC;
      const t = setTimeout(() => setPhase("answer"), total * 1000 + 450);
      return () => clearTimeout(t);
    }
    if (phase === "answer") {
      if (isTimer) return; // the kid answers with buttons or the on-screen keys; no clock in timer mode
      const t = setTimeout(() => finishByPlaying("timeout"), n * 1500 + 2000);
      return () => clearTimeout(t);
    }
    if (phase === "feedback") {
      const t = setTimeout(() => {
        if (round + 1 < ROUNDS) {
          finalized.current = false;
          playedRef.current = [];
          setPlayed([]);
          setCountAnswer(null);
          setDirAnswer(null);
          setHearAgainUsed(false);
          setRound(round + 1);
          setPhase("ready");
        } else {
          const all = results;
          const mean = all.length ? all.reduce((s, r) => s + r.score, 0) / all.length : 0;
          onDoneRef.current(Math.round(mean * 100), { rounds: all, inputMode });
        }
      }, 1900);
      return () => clearTimeout(t);
    }
  }, [phase, round, replayTick, phrase, n, isTimer, audio, finishByPlaying, results, inputMode]);

  const { tap } = useInput({
    onNote: (e) => {
      if (phase !== "answer" || e.kind !== "on") return;
      playedRef.current = [...playedRef.current, e.midi];
      setPlayed(playedRef.current);
      if (playedRef.current.length >= n) finishByPlaying("played");
    },
  });

  const hearAgain = () => {
    if (hearAgainUsed || phase !== "answer") return;
    setHearAgainUsed(true);
    playedRef.current = [];
    setPlayed([]);
    setReplayTick((t) => t + 1);
    setPhase("listen");
  };

  const describe = (count: number | null, dir: Direction | null) => {
    if (count === null || dir === null) return;
    const score = 0.5 * (count === n ? 1 : 0) + 0.5 * (dir === directionOf(phrase) ? 1 : 0);
    finishRound({ phrase, played: playedRef.current, score, method: "described", countAnswer: count, directionAnswer: dir });
  };

  const last = results[results.length - 1];

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
        <Ear className="h-4 w-4" /> Round {round + 1} of {ROUNDS} · {n} notes
      </div>
      <ol className="flex gap-1.5" aria-label="rounds">
        {LENGTHS.map((_, i) => (
          <li key={i} className={cn("h-2.5 w-6 rounded-full", i < results.length ? "bg-accent" : i === round ? "bg-primary" : "bg-muted")} />
        ))}
      </ol>

      <AnimatePresence mode="wait">
        {(phase === "ready" || phase === "listen") && (
          <motion.div key={`listen-${round}-${replayTick}`} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3 py-6">
            <motion.div animate={phase === "listen" ? { scale: [1, 1.2, 1] } : { scale: 1 }} transition={{ repeat: Infinity, duration: GAP_SEC }} className="text-7xl" aria-hidden>👂</motion.div>
            <h3 className="font-display text-3xl">Listen…</h3>
            <div className="flex gap-2">
              {phrase.map((_, i) => (
                <motion.span
                  key={i}
                  className="h-4 w-4 rounded-full bg-primary"
                  initial={{ opacity: 0.2 }}
                  animate={phase === "listen" ? { opacity: [0.2, 1, 0.2] } : { opacity: 0.2 }}
                  transition={{ delay: i * GAP_SEC, duration: GAP_SEC, repeat: 0 }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {phase === "answer" && (
          <motion.div key={`answer-${round}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex w-full flex-col items-center gap-4">
            <h3 className="font-display text-3xl">Your turn!</h3>
            <p className="text-muted-foreground">{isTimer ? "Play it back on the keys, or tell us about it." : "Play it back on your piano."}</p>

            <div className="flex min-h-10 flex-wrap justify-center gap-2" aria-live="polite">
              {Array.from({ length: n }, (_, i) => (
                <motion.div
                  key={i}
                  initial={false}
                  animate={{ scale: played[i] !== undefined ? [1, 1.2, 1] : 1 }}
                  className={cn("flex h-10 min-w-10 items-center justify-center rounded-xl border-2 px-2 font-display text-lg", played[i] !== undefined ? "border-primary bg-primary/10" : "border-dashed text-muted-foreground")}
                >
                  {played[i] !== undefined ? prettyPc(midiToPc(played[i])) : "·"}
                </motion.div>
              ))}
            </div>

            {isTimer && (
              <div className="w-full max-w-2xl overflow-x-auto">
                <PianoKeyboard from={60} to={72} height={130} showNoteNames onNoteOn={(m) => tap.note(m, "on")} onNoteOff={(m) => tap.note(m, "off")} />
              </div>
            )}

            {isTimer && (
              <div className="flex w-full max-w-xl flex-col gap-3 rounded-3xl border-2 bg-card p-4">
                <p className="text-center text-sm font-bold text-muted-foreground">Or just tell us:</p>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-bold">How many notes?</span>
                  <div className="grid grid-cols-4 gap-2">
                    {[2, 3, 4, 5].map((c) => (
                      <Button key={c} variant={countAnswer === c ? "default" : "outline"} size="lg" onClick={() => { setCountAnswer(c); describe(c, dirAnswer); }}>{c}</Button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-bold">Did it go up, down, or wiggle?</span>
                  <div className="grid grid-cols-3 gap-2">
                    {([["up", "Up", TrendingUp], ["down", "Down", TrendingDown], ["wiggle", "Wiggle", Waves]] as const).map(([d, label, Icon]) => (
                      <Button key={d} variant={dirAnswer === d ? "default" : "outline"} size="lg" onClick={() => { setDirAnswer(d); describe(countAnswer, d); }}>
                        <Icon className="h-5 w-5" /> {label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <Button variant="ghost" onClick={hearAgain} disabled={hearAgainUsed}>
              <Repeat className="h-4 w-4" /> {hearAgainUsed ? "Already replayed" : "Hear it again"}
            </Button>
          </motion.div>
        )}

        {phase === "feedback" && last && (
          <motion.div key={`fb-${round}`} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="text-6xl" aria-hidden>{last.score >= 0.99 ? "🌟" : last.score >= 0.5 ? "👍" : "🙂"}</div>
            <h3 className="font-display text-2xl">{feedbackCopy(last.score)}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>It went:</span>
              {last.phrase.map((m, i) => (
                <span key={i} className="rounded-lg border-2 border-primary/40 bg-primary/10 px-2 py-0.5 font-display text-base text-foreground">{prettyPc(midiToPc(m))}</span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
