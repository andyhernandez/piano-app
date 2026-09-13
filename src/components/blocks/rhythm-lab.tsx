"use client";
import * as React from "react";
import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, Ear, Hand, Play, RotateCcw, Shuffle, Sparkles, Square } from "lucide-react";
import type { BlockComponentProps } from "@/components/session/block-props";
import { BlockShell } from "@/components/session/block-shell";
import { InputBadge } from "@/components/session/input-badge";
import { TapPad } from "@/components/session/tap-pad";
import { Staff } from "@/components/staff/staff";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAudio } from "@/lib/hooks/use-audio";
import { useInput } from "@/lib/hooks/use-input";
import { useAppStore } from "@/lib/store/app-store";
import { currentRegionId } from "@/lib/engine/progression";
import { scoreRhythm } from "@/lib/engine/scoring";
import { expectedOnsetsMs, generateEcho, generateRhythm, RHYTHM_LEVELS, type RhythmPattern } from "@/lib/generator/rhythm";
import type { MidiScore } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { startBeatClock, audioTimeToPerfMs } from "./rhythm-lab/beat-clock";
import { currentStates, feedbackStates, matchOnsets, rhythmToBars, type NoteState } from "./rhythm-lab/notation";
import { VisualMetronome } from "./rhythm-lab/visual-metronome";

type Game = "clap" | "echo";
type Phase = "idle" | "countin-listen" | "listen" | "countin-tap" | "tap" | "scored";

interface RoundResult {
  score: MidiScore;
  states: (NoteState | undefined)[];
}

const COUNT_IN = 4;
const MAX_LEVEL = RHYTHM_LEVELS.length;
const RHYTHM_NOTE = 79; // G5, played on top of the click so the rhythm stands out from the pulse

function clampLevel(l: number) { return Math.max(1, Math.min(MAX_LEVEL, Math.round(l))); }

export function RhythmLabBlock(props: BlockComponentProps) {
  const { child, inputMode, running } = props;
  const { audio } = useAudio();
  const { updateSettings, updateChild, pushCelebration } = useAppStore();

  const [game, setGame] = React.useState<Game>("clap");
  const [level, setLevel] = React.useState(() => clampLevel(child.settings.rhythmLevel || 1));
  const [bpm, setBpm] = React.useState(() => RHYTHM_LEVELS[clampLevel(child.settings.rhythmLevel || 1) - 1].bpm);
  const [pattern, setPattern] = React.useState<RhythmPattern | null>(null);
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [pulse, setPulse] = React.useState(0);
  const [beatInBar, setBeatInBar] = React.useState<number | null>(null);
  const [countLabel, setCountLabel] = React.useState<string | undefined>(undefined);
  const [activeBeat, setActiveBeat] = React.useState<number | null>(null); // beat within the pattern being listened to / tapped
  const [result, setResult] = React.useState<RoundResult | null>(null);
  const [rounds, setRounds] = React.useState(0);
  const [best, setBest] = React.useState<MidiScore | null>(null);
  const [freeRunning, setFreeRunning] = React.useState(false);
  const [suggestDown, setSuggestDown] = React.useState(false);
  const [levelledUp, setLevelledUp] = React.useState(false);

  // Mutable round state (never read during render).
  const phaseRef = React.useRef<Phase>("idle");
  const patternRef = React.useRef<RhythmPattern | null>(null);
  const tapsRef = React.useRef<number[]>([]);
  const startMsRef = React.useRef(0);
  const beatCounterRef = React.useRef(-1);
  const stopClockRef = React.useRef<(() => void) | null>(null);
  const timeoutsRef = React.useRef<ReturnType<typeof setTimeout>[]>([]);
  const hiStreakRef = React.useRef(0);
  const loStreakRef = React.useRef(0);
  const levelRef = React.useRef(level);
  const bpmRef = React.useRef(bpm);
  const gameRef = React.useRef(game);
  React.useEffect(() => { levelRef.current = level; bpmRef.current = bpm; gameRef.current = game; });

  const { tap } = useInput({
    onOnset: (e) => {
      const p = phaseRef.current;
      if (p === "tap" || p === "countin-tap") tapsRef.current.push(e.time);
    },
  });

  const setPhaseBoth = React.useCallback((p: Phase) => { phaseRef.current = p; setPhase(p); }, []);

  const stopEverything = React.useCallback(() => {
    stopClockRef.current?.();
    stopClockRef.current = null;
    audio.stopMetronome();
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    setBeatInBar(null);
    setCountLabel(undefined);
    setActiveBeat(null);
  }, [audio]);

  /** Score the round that just finished. */
  const finishRound = React.useCallback(() => {
    const p = patternRef.current;
    stopEverything();
    if (!p) { setPhaseBoth("idle"); return; }
    const expected = expectedOnsetsMs(p);
    const actual = tapsRef.current.map((t) => t - startMsRef.current).filter((t) => t >= -250);
    const score = scoreRhythm(expected, actual, inputMode);
    const states = feedbackStates(p, matchOnsets(expected, actual));
    setResult({ score, states });
    setPhaseBoth("scored");
    setRounds((r) => r + 1);
    setBest((b) => (!b || score.score > b.score ? score : b));
    audio.stinger(score.score >= 70 ? "success" : score.score >= 40 ? "pop" : "fail");

    const lvl = levelRef.current;
    // Map trail progress for the current region.
    if (score.score >= 70) {
      void updateChild(child.id, (c) => ({
        ...c,
        mapProgress: c.mapProgress.map((r) => (r.regionId === currentRegionId(c) ? { ...r, rhythmTrail: Math.max(r.rhythmTrail, lvl) } : r)),
      }));
    }
    // Auto level-up / level-down suggestion.
    if (score.score >= 85) {
      hiStreakRef.current += 1;
      loStreakRef.current = 0;
      setSuggestDown(false);
      if (hiStreakRef.current >= 2 && lvl < MAX_LEVEL) {
        const next = lvl + 1;
        hiStreakRef.current = 0;
        setLevel(next);
        setBpm(RHYTHM_LEVELS[next - 1].bpm);
        setLevelledUp(true);
        void updateSettings(child.id, { rhythmLevel: next });
        pushCelebration({ kind: "levelup", title: `Rhythm level ${next}!`, detail: RHYTHM_LEVELS[next - 1].title, emoji: "🥁" });
        audio.stinger("levelup");
      }
    } else if (score.score < 40) {
      loStreakRef.current += 1;
      hiStreakRef.current = 0;
      if (loStreakRef.current >= 2 && lvl > 1) setSuggestDown(true);
    } else {
      hiStreakRef.current = 0;
      loStreakRef.current = 0;
    }
  }, [audio, child.id, inputMode, pushCelebration, setPhaseBoth, stopEverything, updateChild, updateSettings]);

  /** Handle each metronome beat and drive the round timeline. */
  const handleBeat = React.useCallback((beat: number, time: number) => {
    const p = patternRef.current;
    if (!p) return;
    beatCounterRef.current += 1;
    const b = beatCounterRef.current;
    const patBeats = p.bars * p.beatsPerBar;
    const beatSec = 60 / p.bpm;
    const listenStart = COUNT_IN;
    const tapCountStart = listenStart + patBeats;
    const tapStart = tapCountStart + COUNT_IN;
    const end = tapStart + patBeats;

    setPulse((n) => n + 1);
    setBeatInBar(beat);

    if (b < listenStart) {
      setPhaseBoth("countin-listen");
      setCountLabel(String(b + 1));
      setActiveBeat(null);
    } else if (b < tapCountStart) {
      const pb = b - listenStart;
      setPhaseBoth("listen");
      setCountLabel("Listen");
      setActiveBeat(pb);
      p.notes.forEach((n) => {
        if (n.rest || n.onset < pb || n.onset >= pb + 1) return;
        audio.playNote(RHYTHM_NOTE, 0.12, 0.9, time + (n.onset - pb) * beatSec);
      });
    } else if (b < tapStart) {
      if (b === tapCountStart) tapsRef.current = [];
      setPhaseBoth("countin-tap");
      setCountLabel(String(b - tapCountStart + 1));
      setActiveBeat(null);
    } else if (b < end) {
      if (b === tapStart) {
        startMsRef.current = audioTimeToPerfMs(audio, time);
        setPhaseBoth("tap");
      }
      setCountLabel("Tap!");
      setActiveBeat(b - tapStart);
    } else if (b === end) {
      // Give the last tap a little grace, then score.
      setCountLabel("…");
      setActiveBeat(null);
      const id = setTimeout(finishRound, 300);
      timeoutsRef.current.push(id);
    }
  }, [audio, finishRound, setPhaseBoth]);

  const startRound = React.useCallback((p: RhythmPattern) => {
    stopEverything();
    setFreeRunning(false);
    patternRef.current = p;
    setPattern(p);
    setResult(null);
    setLevelledUp(false);
    tapsRef.current = [];
    beatCounterRef.current = -1;
    setPhaseBoth("countin-listen");
    setCountLabel("1");
    stopClockRef.current = startBeatClock(audio, p.bpm, handleBeat);
  }, [audio, handleBeat, setPhaseBoth, stopEverything]);

  const newPattern = React.useCallback((g: Game = gameRef.current) => {
    const lvl = levelRef.current;
    const base = g === "echo" ? generateEcho(lvl) : generateRhythm(lvl);
    return { ...base, bpm: bpmRef.current };
  }, []);

  const playNew = () => startRound(newPattern());
  const playAgain = () => { if (pattern) startRound({ ...pattern, bpm }); else playNew(); };

  const changeLevel = (delta: number) => {
    const next = clampLevel(level + delta);
    if (next === level) return;
    stopEverything();
    setPhaseBoth("idle");
    setResult(null);
    setPattern(null);
    setSuggestDown(false);
    setLevelledUp(false);
    hiStreakRef.current = 0;
    loStreakRef.current = 0;
    setLevel(next);
    setBpm(RHYTHM_LEVELS[next - 1].bpm);
    void updateSettings(child.id, { rhythmLevel: next });
  };

  const switchGame = (g: Game) => {
    if (g === game) return;
    stopEverything();
    setPhaseBoth("idle");
    setGame(g);
    setPattern(null);
    setResult(null);
  };

  // Free-running pulse while idle (visual metronome practice).
  const toggleFree = () => {
    if (freeRunning) { stopEverything(); setFreeRunning(false); return; }
    stopEverything();
    setFreeRunning(true);
    stopClockRef.current = startBeatClock(audio, bpm, (beat) => { setPulse((n) => n + 1); setBeatInBar(beat); });
  };
  const onBpmChange = (v: number) => {
    setBpm(v);
    if (freeRunning) audio.setMetronomeBpm(v);
  };

  // Space bar taps while a round is active.
  const roundActive = phase !== "idle" && phase !== "scored";
  React.useEffect(() => {
    if (!roundActive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      e.preventDefault();
      tap.tap();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [roundActive, tap]);

  // Time up → stop sound and any pending round.
  React.useEffect(() => {
    if (running) return;
    // Silence the external systems immediately; reset the visual state on the next tick.
    stopClockRef.current?.();
    stopClockRef.current = null;
    audio.stopMetronome();
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    const id = setTimeout(() => {
      stopEverything();
      setFreeRunning(false);
      if (phaseRef.current !== "scored") setPhaseBoth("idle");
    }, 0);
    return () => clearTimeout(id);
  }, [running, audio, stopEverything, setPhaseBoth]);

  // Unmount cleanup.
  React.useEffect(() => () => { stopClockRef.current?.(); audio.stopMetronome(); timeoutsRef.current.forEach(clearTimeout); }, [audio]);

  const spec = RHYTHM_LEVELS[level - 1];
  const showNotation = !!pattern && (game === "clap" || phase === "scored");
  const noteStates = React.useMemo<(NoteState | undefined)[]>(() => {
    if (!pattern) return [];
    if (phase === "scored" && result) return result.states;
    if (phase === "listen" || phase === "tap") return currentStates(pattern, activeBeat);
    return [];
  }, [pattern, phase, result, activeBeat]);
  const bars = React.useMemo(() => (pattern ? rhythmToBars(pattern, noteStates) : []), [pattern, noteStates]);

  const onDone = () => {
    stopEverything();
    props.onComplete({
      ...(best ? { midiScore: best } : {}),
      details: { level, rounds, game, bpm },
    });
  };

  return (
    <BlockShell
      type="rhythm"
      remainingSec={props.remainingSec}
      plannedSec={props.plannedSec}
      onDone={onDone}
      onAddMinute={() => props.addSeconds(60)}
      headerRight={<InputBadge mode={inputMode} />}
    >
      {/* Game picker + level */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-2xl border-2 bg-card p-1">
          <Button variant={game === "clap" ? "default" : "ghost"} size="sm" className="h-10" onClick={() => switchGame("clap")}><Hand className="h-4 w-4" /> Clap-Tap</Button>
          <Button variant={game === "echo" ? "default" : "ghost"} size="sm" className="h-10" onClick={() => switchGame("echo")}><Ear className="h-4 w-4" /> Rhythm Echo</Button>
        </div>
        <div className="ml-auto flex items-center gap-1 rounded-2xl border-2 bg-card p-1">
          <Button variant="ghost" size="icon" className="h-10 w-10" aria-label="Easier level" disabled={level <= 1 || roundActive} onClick={() => changeLevel(-1)}><ArrowDown className="h-5 w-5" /></Button>
          <div className="px-2 text-center leading-tight">
            <div className="font-display text-sm font-bold">Level {level}</div>
            <div className="text-xs text-muted-foreground">{spec.title}</div>
          </div>
          <Button variant="ghost" size="icon" className="h-10 w-10" aria-label="Harder level" disabled={level >= MAX_LEVEL || roundActive} onClick={() => changeLevel(1)}><ArrowUp className="h-5 w-5" /></Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="flex min-w-0 flex-col gap-4">
          {/* Notation */}
          <div className="min-h-[150px] rounded-3xl border-2 bg-card p-3">
            {showNotation && pattern ? (
              <div className="w-full overflow-x-auto">
                <Staff clef="treble" keySig="C" timeSig="4/4" bars={bars} barsPerLine={Math.min(4, pattern.bars)} noKeySig />
              </div>
            ) : (
              <div className="flex h-full min-h-[130px] flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                {game === "echo" && roundActive ? (
                  <>
                    <Ear className="h-8 w-8" />
                    <p className="font-bold">{phase === "listen" || phase === "countin-listen" ? "Listen closely…" : "Now tap it back!"}</p>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-8 w-8" />
                    <p className="font-bold">{game === "clap" ? "Press Play to see a rhythm." : "Hear a rhythm, tap it back, then see it written."}</p>
                  </>
                )}
              </div>
            )}
            {phase === "scored" && game === "echo" && <p className="mt-1 text-center text-sm font-bold text-muted-foreground">Here&apos;s what you played back</p>}
          </div>

          {/* Result */}
          {phase === "scored" && result && (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-wrap items-center gap-4 rounded-3xl border-2 bg-card p-4">
              <div className={cn("font-display text-6xl font-bold", result.score.score >= 85 ? "text-[color:var(--key-correct,#06d6a0)]" : result.score.score >= 40 ? "text-primary" : "text-muted-foreground")}>{result.score.score}</div>
              <div className="flex flex-col gap-1">
                <div className="font-display text-xl font-bold">{result.score.score >= 85 ? "Rock steady!" : result.score.score >= 70 ? "Nice groove!" : result.score.score >= 40 ? "Getting there!" : "Let's try that again"}</div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="muted">{result.score.components.hits} hits</Badge>
                  <Badge variant="muted">{result.score.components.misses} missed</Badge>
                  <Badge variant="muted">{result.score.components.extras} extra</Badge>
                  {result.score.components.avgDeviationMs > 0 && <Badge variant="muted">±{result.score.components.avgDeviationMs} ms</Badge>}
                </div>
              </div>
              {result.score.badge === "steady-pulse" && (
                <motion.div initial={{ rotate: -10, scale: 0.6 }} animate={{ rotate: 0, scale: 1 }} className="ml-auto flex items-center gap-2 rounded-2xl bg-accent px-4 py-2 font-display font-bold text-accent-foreground">
                  🏅 Steady Pulse
                </motion.div>
              )}
              {levelledUp && <Badge variant="accent" className="ml-auto text-sm">Level up! Now level {level}</Badge>}
            </motion.div>
          )}

          {suggestDown && phase === "scored" && (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-dashed bg-muted/40 p-3 text-sm">
              <span className="font-bold">Tricky one! Want to try an easier level?</span>
              <Button size="sm" variant="secondary" onClick={() => changeLevel(-1)}><ArrowDown className="h-4 w-4" /> Level {level - 1}</Button>
              <Button size="sm" variant="ghost" onClick={() => setSuggestDown(false)}>Keep going</Button>
            </div>
          )}

          {/* Tap pad */}
          <TapPad
            onTap={() => tap.tap()}
            disabled={!roundActive}
            label={phase === "tap" ? "TAP!" : phase === "countin-tap" ? "Get ready…" : phase === "listen" || phase === "countin-listen" ? "Listen…" : "TAP"}
            className={cn(phase === "tap" && "border-accent bg-accent/15 text-accent-foreground")}
          />
          <p className="text-center text-xs text-muted-foreground">Tap the pad, press Space, or hit any piano key.</p>

          {/* Controls */}
          <div className="flex flex-wrap justify-center gap-2">
            {roundActive ? (
              <Button size="lg" variant="outline" onClick={() => { stopEverything(); setPhaseBoth("idle"); setResult(null); }}><Square className="h-5 w-5" /> Stop</Button>
            ) : (
              <>
                {phase === "scored" && <Button size="lg" variant="secondary" onClick={playAgain}><RotateCcw className="h-5 w-5" /> Again</Button>}
                <Button size="lg" onClick={playNew}>{phase === "scored" ? <><Shuffle className="h-5 w-5" /> New rhythm</> : <><Play className="h-5 w-5" /> Play</>}</Button>
              </>
            )}
          </div>
        </div>

        {/* Visual metronome */}
        <div className="flex flex-col gap-2">
          <VisualMetronome pulse={pulse} beatInBar={beatInBar} bpm={bpm} onBpmChange={onBpmChange} bpmDisabled={roundActive} label={roundActive ? countLabel : undefined} />
          {!roundActive && (
            <Button variant="outline" onClick={toggleFree}>{freeRunning ? <><Square className="h-4 w-4" /> Stop pulse</> : <><Play className="h-4 w-4" /> Just the pulse</>}</Button>
          )}
          <div className="rounded-2xl bg-muted/50 p-3 text-xs text-muted-foreground">
            <div className="font-bold text-foreground">Round {rounds + (roundActive ? 1 : 0)}{best ? ` · Best ${best.score}` : ""}</div>
            {game === "clap" ? "Listen once, then tap it with the click." : "No peeking: listen, tap it back, then see it."}
          </div>
        </div>
      </div>
    </BlockShell>
  );
}
