"use client";
import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Drum, Headphones, Play, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Staff, type StaffNote } from "@/components/staff/staff";
import { TapPad } from "@/components/session/tap-pad";
import { useAudio } from "@/lib/hooks/use-audio";
import { useInput } from "@/lib/hooks/use-input";
import { scorePulseDrift, scoreTiming } from "@/lib/engine/scoring";
import { generateRhythm, expectedOnsetsMs, type RhythmPattern } from "@/lib/generator/rhythm";
import { cn } from "@/lib/utils/cn";
import type { AssessmentTestProps } from "./echo-test";

const TAP_BPM = 80;
const TAP_BEATS = 16;
const WARMUP_BEATS = 4;
const PATTERN_LEVELS = [2, 3, 4];
const PITCH = 71; // B4

type Phase =
  | { kind: "introA" }
  | { kind: "tapAlong" }
  | { kind: "resultA"; score: number }
  | { kind: "introB"; i: number }
  | { kind: "pattern"; i: number }
  | { kind: "resultB"; i: number; score: number };

function makePatterns(seed: number): RhythmPattern[] {
  return PATTERN_LEVELS.map((lvl, i) => generateRhythm(lvl, `assess-${seed}-${i}`));
}

/** Group a pattern's notes into bars for the Staff component. */
function toBars(p: RhythmPattern, currentBeat: number | null): StaffNote[][] {
  const bars: StaffNote[][] = Array.from({ length: p.bars }, () => []);
  for (const n of p.notes) {
    const bar = Math.min(p.bars - 1, Math.floor(n.onset / p.beatsPerBar));
    const isCurrent = currentBeat !== null && currentBeat >= n.onset && currentBeat < n.onset + n.beats;
    bars[bar].push({ midis: n.rest ? [] : [PITCH], beats: n.beats, state: isCurrent ? "current" : undefined });
  }
  return bars;
}

function driftCopy(score: number): string {
  if (score >= 85) return "Rock steady! 🥁";
  if (score >= 60) return "Good groove — you stayed close to the click.";
  if (score >= 35) return "You found the beat some of the time. Nice!";
  return "The click was tricky today — that's okay.";
}

/**
 * Pulse test (rhythm). Part A: tap along with an 80 BPM click for 16 beats (first 4 are warm-up) → drift score.
 * Part B: three short displayed rhythms with a one-bar count-in → timing score each. Pulse = ½A + ½ mean(B).
 */
export function PulseTest({ inputMode, onDone }: AssessmentTestProps) {
  const { audio } = useAudio();
  const [patterns] = React.useState(() => makePatterns(Math.floor(Math.random() * 1e9)));
  const [phase, setPhase] = React.useState<Phase>({ kind: "introA" });
  const [beatFlash, setBeatFlash] = React.useState(0);
  const [beatLabel, setBeatLabel] = React.useState<string>("");
  const [patternBeat, setPatternBeat] = React.useState<number | null>(null);
  const [tapCount, setTapCount] = React.useState(0);
  const [scoreA, setScoreA] = React.useState<number | null>(null);
  const [scoresB, setScoresB] = React.useState<number[]>([]);
  const beatCount = React.useRef(0);
  const expected = React.useRef<number[]>([]);
  const taps = React.useRef<number[]>([]);
  const patternStart = React.useRef<number | null>(null);
  const onDoneRef = React.useRef(onDone);
  React.useEffect(() => { onDoneRef.current = onDone; });

  React.useEffect(() => () => audio.stopMetronome(), [audio]);

  const { tap } = useInput({
    onOnset: (e) => {
      if (phase.kind !== "tapAlong" && phase.kind !== "pattern") return;
      taps.current.push(e.time);
      setTapCount((c) => c + 1);
    },
  });

  const resetCapture = () => {
    beatCount.current = 0;
    expected.current = [];
    taps.current = [];
    patternStart.current = null;
    setTapCount(0);
    setPatternBeat(null);
    setBeatLabel("");
  };

  // ---------- Part A ----------
  const startTapAlong = () => {
    resetCapture();
    setPhase({ kind: "tapAlong" });
    audio.startMetronome({
      bpm: TAP_BPM,
      beatsPerBar: 4,
      onBeat: () => {
        const i = beatCount.current;
        beatCount.current += 1;
        const now = performance.now();
        setBeatFlash((f) => f + 1);
        if (i < WARMUP_BEATS) setBeatLabel(["Listen…", "2", "3", "Get ready!"][i]);
        else if (i < TAP_BEATS) { setBeatLabel("Tap!"); expected.current.push(now); }
        if (i === TAP_BEATS - 1) {
          // Let the last beat's window close before scoring (half a beat).
          setTimeout(finishTapAlong, (60_000 / TAP_BPM) * 0.5);
        }
      },
    });
  };

  const finishTapAlong = () => {
    audio.stopMetronome();
    const exp = expected.current;
    const beatMs = 60_000 / TAP_BPM;
    const lo = (exp[0] ?? 0) - beatMs / 2;
    const hi = (exp[exp.length - 1] ?? 0) + beatMs / 2;
    const actual = taps.current.filter((t) => t >= lo && t <= hi);
    const score = exp.length ? scorePulseDrift(exp, actual) : 0;
    setScoreA(score);
    setPhase({ kind: "resultA", score });
  };

  // ---------- Part B ----------
  const hearPattern = (p: RhythmPattern) => {
    const t0 = audio.now() + 0.1;
    const beatSec = 60 / p.bpm;
    for (let b = 0; b < p.bars * p.beatsPerBar; b++) audio.click(b % p.beatsPerBar === 0, t0 + b * beatSec);
    for (const ms of expectedOnsetsMs(p)) audio.playNote(PITCH, 0.25, 0.9, t0 + ms / 1000);
  };

  const startPattern = (i: number) => {
    const p = patterns[i];
    resetCapture();
    setPhase({ kind: "pattern", i });
    const totalBeats = p.bars * p.beatsPerBar;
    audio.startMetronome({
      bpm: p.bpm,
      beatsPerBar: p.beatsPerBar,
      onBeat: () => {
        const b = beatCount.current;
        beatCount.current += 1;
        setBeatFlash((f) => f + 1);
        if (b < p.beatsPerBar) {
          setBeatLabel(String(b + 1));
          if (b === p.beatsPerBar - 1) setBeatLabel("Go!");
          return;
        }
        const pos = b - p.beatsPerBar;
        if (pos === 0) patternStart.current = performance.now();
        if (pos < totalBeats) {
          setPatternBeat(pos);
          setBeatLabel(String((pos % p.beatsPerBar) + 1));
        }
        if (pos === totalBeats - 1) setTimeout(() => finishPattern(i), (60_000 / p.bpm) * 0.6);
      },
    });
  };

  const finishPattern = (i: number) => {
    audio.stopMetronome();
    const p = patterns[i];
    const start = patternStart.current;
    const exp = expectedOnsetsMs(p);
    const beatMs = 60_000 / p.bpm;
    const actual = start === null ? [] : taps.current.map((t) => t - start).filter((t) => t >= -beatMs / 2 && t <= exp[exp.length - 1] + beatMs / 2);
    const score = scoreTiming(exp, actual).score;
    setScoresB((s) => [...s, score]);
    setPhase({ kind: "resultB", i, score });
  };

  // Auto-advance after result cards.
  React.useEffect(() => {
    if (phase.kind === "resultA") {
      const t = setTimeout(() => setPhase({ kind: "introB", i: 0 }), 1800);
      return () => clearTimeout(t);
    }
    if (phase.kind === "resultB") {
      const t = setTimeout(() => {
        if (phase.i + 1 < patterns.length) setPhase({ kind: "introB", i: phase.i + 1 });
        else {
          const meanB = scoresB.length ? scoresB.reduce((s, v) => s + v, 0) / scoresB.length : 0;
          const a = scoreA ?? 0;
          const total = Math.round(0.5 * a + 0.5 * meanB);
          onDoneRef.current(total, {
            tapAlong: { score: a, bpm: TAP_BPM, beats: TAP_BEATS - WARMUP_BEATS },
            patterns: patterns.map((p, i) => ({ seed: p.seed, level: p.level, bpm: p.bpm, score: scoresB[i] ?? 0 })),
            inputMode,
          });
        }
      }, 1800);
      return () => clearTimeout(t);
    }
  }, [phase, patterns, scoresB, scoreA, inputMode]);

  const listening = phase.kind === "tapAlong" || phase.kind === "pattern";
  const pad = (
    <div className="flex w-full max-w-md flex-col items-center gap-2">
      <TapPad onTap={() => tap.tap()} disabled={!listening} label={listening ? "TAP" : "…"} className="h-32" />
      <p className="text-xs text-muted-foreground">
        {inputMode === "midi" ? "Or tap any key on your piano." : inputMode === "mic" ? "Or clap / play any note — headphones help the mic hear only you." : "Tap the pad with the beat."}
      </p>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
        <Drum className="h-4 w-4" /> {phase.kind === "introA" || phase.kind === "tapAlong" || phase.kind === "resultA" ? "Part 1 · Tap along" : `Part 2 · Rhythm ${"i" in phase ? phase.i + 1 : 1} of ${patterns.length}`}
      </div>
      <ol className="flex gap-1.5" aria-label="parts">
        {[0, 1, 2, 3].map((i) => {
          const done = i === 0 ? scoreA !== null : scoresB.length > i - 1;
          const active = i === 0 ? phase.kind === "introA" || phase.kind === "tapAlong" : "i" in phase && phase.i === i - 1;
          return <li key={i} className={cn("h-2.5 w-8 rounded-full", done ? "bg-accent" : active ? "bg-primary" : "bg-muted")} />;
        })}
      </ol>

      <AnimatePresence mode="wait">
        {phase.kind === "introA" && (
          <motion.div key="introA" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3 text-center">
            <div className="text-6xl" aria-hidden>🥁</div>
            <h3 className="font-display text-3xl">Tap along with the click</h3>
            <p className="max-w-sm text-muted-foreground">Listen to four clicks first, then tap on every click. Keep going for a while.</p>
            {inputMode === "mic" && <p className="flex items-center gap-1 text-xs text-muted-foreground"><Headphones className="h-4 w-4" /> Headphones help the mic hear only you.</p>}
            <Button size="lg" onClick={startTapAlong}><Play className="h-6 w-6" /> Start the click</Button>
          </motion.div>
        )}

        {phase.kind === "tapAlong" && (
          <motion.div key="tapAlong" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex w-full flex-col items-center gap-4">
            <motion.div key={beatFlash} initial={{ scale: 1.25 }} animate={{ scale: 1 }} transition={{ duration: 0.25 }} className={cn("flex h-28 w-28 items-center justify-center rounded-full border-4 font-display text-2xl", beatCountLabelClass(beatLabel))}>
              {beatLabel || "…"}
            </motion.div>
            <p className="text-sm text-muted-foreground">{tapCount} tap{tapCount === 1 ? "" : "s"}</p>
            {pad}
          </motion.div>
        )}

        {phase.kind === "resultA" && (
          <motion.div key="resultA" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-2 py-6 text-center">
            <div className="text-6xl" aria-hidden>{phase.score >= 60 ? "🌟" : "👍"}</div>
            <h3 className="font-display text-2xl">{driftCopy(phase.score)}</h3>
            <p className="text-muted-foreground">Next: tap some rhythms you can see.</p>
          </motion.div>
        )}

        {(phase.kind === "introB" || phase.kind === "pattern" || phase.kind === "resultB") && (
          <motion.div key={`B-${phase.i}-${phase.kind}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex w-full flex-col items-center gap-3">
            {phase.kind === "resultB" ? (
              <div className="flex flex-col items-center gap-1 text-center">
                <div className="text-5xl" aria-hidden>{phase.score >= 60 ? "🌟" : "👍"}</div>
                <h3 className="font-display text-2xl">{driftCopy(phase.score)}</h3>
              </div>
            ) : (
              <h3 className="font-display text-2xl">{phase.kind === "introB" ? "Tap this rhythm" : beatLabel ? `${beatLabel}` : "Ready…"}</h3>
            )}
            <div className="w-full max-w-2xl overflow-x-auto rounded-3xl border-2 bg-card p-3">
              <Staff clef="treble" keySig="C" timeSig={`${patterns[phase.i].beatsPerBar}/4`} bars={toBars(patterns[phase.i], phase.kind === "pattern" ? patternBeat : null)} barsPerLine={2} noKeySig />
            </div>
            {phase.kind === "introB" && (
              <div className="flex flex-col items-center gap-2 text-center">
                <p className="text-sm text-muted-foreground">You&apos;ll hear one bar of clicks to count you in, then tap each note. Rests are quiet.</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button variant="outline" onClick={() => hearPattern(patterns[phase.i])}><Volume2 className="h-5 w-5" /> Hear it</Button>
                  <Button size="lg" onClick={() => startPattern(phase.i)}><Play className="h-6 w-6" /> Count me in</Button>
                </div>
              </div>
            )}
            {phase.kind === "pattern" && (
              <>
                <motion.div key={beatFlash} initial={{ scale: 1.2 }} animate={{ scale: 1 }} transition={{ duration: 0.2 }} className={cn("h-5 w-5 rounded-full", patternBeat === null ? "bg-secondary" : "bg-primary")} aria-hidden />
                {pad}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function beatCountLabelClass(label: string): string {
  if (label === "Tap!") return "border-primary bg-primary/10 text-primary";
  if (label === "Get ready!") return "border-secondary bg-secondary/20 text-secondary-foreground";
  return "border-border bg-muted text-muted-foreground";
}
