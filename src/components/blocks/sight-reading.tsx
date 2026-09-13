"use client";
import * as React from "react";
import { motion } from "framer-motion";
import { ExternalLink, Keyboard, Mic, MicOff, Play, RotateCcw, Shuffle, Volume2 } from "lucide-react";
import type { BlockComponentProps } from "@/components/session/block-props";
import { BlockShell } from "@/components/session/block-shell";
import { InputBadge } from "@/components/session/input-badge";
import { Staff } from "@/components/staff/staff";
import { PianoKeyboard, keyboardRangeFor } from "@/components/keyboard/piano-keyboard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAudio } from "@/lib/hooks/use-audio";
import { useInput } from "@/lib/hooks/use-input";
import { useAppStore } from "@/lib/store/app-store";
import { repo } from "@/lib/db/repo";
import { scoreReading } from "@/lib/engine/scoring";
import { exerciseBeats, generateExercise, LEVELS, levelSpec } from "@/lib/generator/sightreading";
import { prefersFlats } from "@/lib/music/scales";
import type { MidiScore, NoteEvent } from "@/lib/types";
import { newId } from "@/lib/utils/id";
import { cn } from "@/lib/utils/cn";
import { AudioRecorder } from "@/lib/recording/audio-recorder";
import { startBeatClock, audioTimeToPerfMs } from "./rhythm-lab/beat-clock";
import { exerciseMidis, exerciseToBars, lhChord, noteIndexAtBeat, readingFeedback, type NoteState } from "./sight-reading/notation";
import { FlowMeter } from "./sight-reading/flow-meter";

type Phase = "ready" | "countin" | "playing" | "scoring" | "scored" | "selfreport";
type SelfReport = "yes" | "mostly" | "no";

interface Attempt {
  seed: string;
  score: MidiScore | null;
  selfReport: SelfReport | null;
  recordingId: string | null;
}

const COUNT_IN = 4;
const MAX_LEVEL = LEVELS.length;
const NO_STOP_TARGET = 3;
const EMPTY_STATES: ReadonlyMap<number, NoteState> = new Map();

function clampLevel(l: number) { return Math.max(1, Math.min(MAX_LEVEL, Math.round(l))); }

export function SightReadingBlock(props: BlockComponentProps) {
  const { child, scale, inputMode, running } = props;
  const { audio } = useAudio();
  const { updateSettings, pushCelebration } = useAppStore();

  const level = clampLevel(child.settings.readingLevel || 1);
  const spec = levelSpec(level);
  const [seed, setSeed] = React.useState(() => newId("ex"));
  const exercise = React.useMemo(() => generateExercise({ level, scale: { key: scale.key, mode: scale.mode }, seed }), [level, scale.key, scale.mode, seed]);

  const [phase, setPhase] = React.useState<Phase>("ready");
  const [countBeat, setCountBeat] = React.useState(0);
  const [progress, setProgress] = React.useState(0);
  const [currentIdx, setCurrentIdx] = React.useState(-1);
  const [feedback, setFeedback] = React.useState<ReadonlyMap<number, NoteState>>(EMPTY_STATES);
  const [attempts, setAttempts] = React.useState<Attempt[]>([]);
  const [lastScore, setLastScore] = React.useState<MidiScore | null>(null);
  const [recording, setRecording] = React.useState(false);
  const [micDenied, setMicDenied] = React.useState(false);
  const [savedRecording, setSavedRecording] = React.useState<string | null>(null);
  const [showKeyboard, setShowKeyboard] = React.useState(inputMode === "timer");

  const phaseRef = React.useRef<Phase>("ready");
  const eventsRef = React.useRef<NoteEvent[]>([]);
  const startMsRef = React.useRef(0);
  const beatCounterRef = React.useRef(-1);
  const stopClockRef = React.useRef<(() => void) | null>(null);
  const tickRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutsRef = React.useRef<ReturnType<typeof setTimeout>[]>([]);
  const recorderRef = React.useRef<AudioRecorder | null>(null);
  const exerciseRef = React.useRef(exercise);
  React.useEffect(() => { exerciseRef.current = exercise; });

  const { tap } = useInput({
    onNote: (e) => {
      const p = phaseRef.current;
      if (p === "playing" || p === "countin") eventsRef.current.push(e);
    },
  });

  const setPhaseBoth = React.useCallback((p: Phase) => { phaseRef.current = p; setPhase(p); }, []);

  const stopClocks = React.useCallback(() => {
    stopClockRef.current?.();
    stopClockRef.current = null;
    audio.stopMetronome();
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, [audio]);

  const finishAttempt = React.useCallback(async () => {
    const ex = exerciseRef.current;
    stopClocks();
    audio.bell();
    setPhaseBoth("scoring");
    setCurrentIdx(-1);
    setProgress(100);

    const events = eventsRef.current;
    const playedAnything = events.some((e) => e.kind === "on");
    let score: MidiScore | null = null;
    if (playedAnything) {
      score = scoreReading(ex, events, startMsRef.current, inputMode);
      setFeedback(readingFeedback(ex, events, startMsRef.current));
    }

    let recordingId: string | null = null;
    const rec = recorderRef.current;
    if (rec) {
      try {
        const blob = await rec.stop();
        if (blob.size > 0) {
          recordingId = newId("rec");
          await repo.putRecording({
            id: recordingId,
            childId: child.id,
            sessionId: useAppStore.getState().activeSession?.id ?? "",
            blockType: "reading",
            createdAt: new Date().toISOString(),
            mimeType: blob.type || rec.mimeType || "audio/webm",
            blob,
            title: `Sight reading L${ex.level}`,
          });
          setSavedRecording(recordingId);
        }
      } catch (err) {
        console.warn("Recording failed", err);
      }
      recorderRef.current = null;
      setRecording(false);
    }

    setLastScore(score);
    if (score) {
      audio.stinger(score.badge ? "success" : score.score >= 50 ? "pop" : "fail");
      setAttempts((a) => [...a, { seed: ex.seed, score, selfReport: null, recordingId }]);
      setPhaseBoth("scored");
    } else {
      setAttempts((a) => [...a, { seed: ex.seed, score: null, selfReport: null, recordingId }]);
      setPhaseBoth("selfreport");
    }
  }, [audio, child.id, inputMode, setPhaseBoth, stopClocks]);

  const handleBeat = React.useCallback((_beat: number, time: number) => {
    const ex = exerciseRef.current;
    const beats = exerciseBeats(ex);
    const bMs = 60_000 / ex.tempo;
    beatCounterRef.current += 1;
    const b = beatCounterRef.current;
    if (b < COUNT_IN) {
      setCountBeat(b + 1);
      return;
    }
    if (b === COUNT_IN) {
      startMsRef.current = audioTimeToPerfMs(audio, time);
      setPhaseBoth("playing");
      setCountBeat(0);
      tickRef.current = setInterval(() => {
        const elapsedBeats = (performance.now() - startMsRef.current) / bMs;
        setProgress(Math.max(0, Math.min(100, (elapsedBeats / beats) * 100)));
        setCurrentIdx(noteIndexAtBeat(ex, elapsedBeats));
      }, 100);
      return;
    }
    if (b === COUNT_IN + beats) {
      // Let the final note ring, then score.
      timeoutsRef.current.push(setTimeout(() => { void finishAttempt(); }, 400));
    }
  }, [audio, finishAttempt, setPhaseBoth]);

  const start = async () => {
    stopClocks();
    eventsRef.current = [];
    beatCounterRef.current = -1;
    setFeedback(EMPTY_STATES);
    setLastScore(null);
    setSavedRecording(null);
    setProgress(0);
    setCurrentIdx(-1);
    setCountBeat(0);
    setPhaseBoth("countin");
    if (inputMode === "timer" && !micDenied && AudioRecorder.supported()) {
      const rec = new AudioRecorder();
      try {
        await rec.start();
        recorderRef.current = rec;
        setRecording(true);
      } catch {
        setMicDenied(true);
        recorderRef.current = null;
      }
    }
    if (phaseRef.current !== "countin") return; // cancelled while waiting for the mic
    stopClockRef.current = startBeatClock(audio, exerciseRef.current.tempo, handleBeat);
  };

  const cancelAttempt = React.useCallback(() => {
    stopClocks();
    recorderRef.current?.cancel();
    recorderRef.current = null;
    setRecording(false);
    setCurrentIdx(-1);
    setProgress(0);
    setPhaseBoth("ready");
  }, [setPhaseBoth, stopClocks]);

  const newExercise = () => {
    cancelAttempt();
    setFeedback(EMPTY_STATES);
    setLastScore(null);
    setSavedRecording(null);
    setSeed(newId("ex"));
  };
  const tryAgain = () => { void start(); };

  const selfReport = (r: SelfReport) => {
    setAttempts((a) => {
      if (!a.length) return a;
      const copy = [...a];
      copy[copy.length - 1] = { ...copy[copy.length - 1], selfReport: r };
      return copy;
    });
    audio.stinger(r === "yes" ? "success" : "pop");
    setPhaseBoth("scored");
  };

  /** Playback is only offered after an attempt (spec: no listening first). */
  const hearIt = () => {
    const ex = exerciseRef.current;
    const t0 = audio.now() + 0.1;
    const bSec = 60 / ex.tempo;
    ex.notes.forEach((n) => {
      const when = t0 + (n.bar * ex.timeSig[0] + n.beat) * bSec;
      if (n.midi != null) audio.playNote(n.midi, n.beats * bSec * 0.9, 0.8, when);
      if (n.midiLH != null) {
        const lh = spec.lhChords ? lhChord(n.midiLH, ex.scale) : [n.midiLH];
        audio.playChord(lh, bSec * (spec.lhChords ? 1.8 : 3.6), 0.5, when);
      }
    });
  };

  // Time up: stop metronome and any running attempt.
  React.useEffect(() => {
    if (running) return;
    stopClocks();
    const p = phaseRef.current;
    if (p === "countin" || p === "playing") cancelAttempt();
  }, [running, stopClocks, cancelAttempt]);

  // Unmount cleanup.
  React.useEffect(() => () => {
    stopClockRef.current?.();
    audio.stopMetronome();
    if (tickRef.current) clearInterval(tickRef.current);
    timeoutsRef.current.forEach(clearTimeout);
    recorderRef.current?.cancel();
  }, [audio]);

  // Notation
  const states = React.useMemo<ReadonlyMap<number, NoteState>>(() => {
    if (phase === "playing" && currentIdx >= 0) return new Map([[currentIdx, "current" as NoteState]]);
    if (phase === "scored" || phase === "scoring" || phase === "selfreport") return feedback;
    return EMPTY_STATES;
  }, [phase, currentIdx, feedback]);
  const notation = React.useMemo(() => exerciseToBars(exercise, exercise.scale, states, spec.lhChords), [exercise, states, spec.lhChords]);
  const flats = prefersFlats(exercise.scale);
  const allMidis = React.useMemo(() => exerciseMidis(exercise, exercise.scale, spec.lhChords), [exercise, spec.lhChords]);
  const [kbFrom, kbTo] = React.useMemo(() => keyboardRangeFor(allMidis), [allMidis]);

  const best = React.useMemo(() => attempts.reduce<MidiScore | null>((b, a) => (a.score && (!b || a.score.score > b.score) ? a.score : b), null), [attempts]);
  const bestNoStop = best?.badge === "no-stop-reading" || attempts.some((a) => a.selfReport === "yes");
  const active = phase === "countin" || phase === "playing" || phase === "scoring";
  const lastAttempt = attempts[attempts.length - 1];
  const continuity = lastScore ? lastScore.components.continuity : lastAttempt?.selfReport ? { yes: 95, mostly: 65, no: 25 }[lastAttempt.selfReport] : null;

  const onDone = () => {
    stopClocks();
    recorderRef.current?.cancel();
    let readingLevel = level;
    let noStopStreak = child.settings.noStopStreak || 0;
    if (attempts.length) {
      noStopStreak = bestNoStop ? noStopStreak + 1 : 0;
      if (noStopStreak >= NO_STOP_TARGET && readingLevel < MAX_LEVEL) {
        readingLevel += 1;
        noStopStreak = 0;
        pushCelebration({ kind: "levelup", title: `Reading level ${readingLevel}!`, detail: LEVELS[readingLevel - 1].title, emoji: "🚀" });
      }
      void updateSettings(child.id, { readingLevel, noStopStreak });
    }
    const recordingId = [...attempts].reverse().find((a) => a.recordingId)?.recordingId;
    props.onComplete({
      ...(best ? { midiScore: best } : {}),
      ...(recordingId ? { recordingId } : {}),
      details: { level, seed, attempts: attempts.length, selfReport: lastAttempt?.selfReport ?? null, noStopStreak },
    });
  };

  const streakNow = child.settings.noStopStreak || 0;

  return (
    <BlockShell
      type="reading"
      remainingSec={props.remainingSec}
      plannedSec={props.plannedSec}
      onDone={onDone}
      onAddMinute={() => props.addSeconds(60)}
      rules={["No listening first", "Keep going through mistakes", "Eyes on the page"]}
      headerRight={<InputBadge mode={inputMode} />}
    >
      {/* Level card */}
      <div className="grid gap-3 rounded-3xl border-2 bg-card p-4 sm:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Level {level}</Badge>
            <h2 className="font-display text-xl font-bold">{spec.title}</h2>
            <span className="text-sm text-muted-foreground">· {scale.name} · ♩ {exercise.tempo}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{spec.description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>No-Stop streak:</span>
            {Array.from({ length: NO_STOP_TARGET }, (_, i) => (
              <span key={i} className={cn("h-3 w-3 rounded-full border-2 border-primary", i < streakNow + (bestNoStop ? 1 : 0) && "bg-primary")} aria-hidden />
            ))}
            {child.settings.sightReadingFactoryLink && (
              <Button asChild variant="link" size="sm" className="ml-auto h-8">
                <a href={child.settings.sightReadingFactoryLink} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /> Open Sight Reading Factory</a>
              </Button>
            )}
          </div>
        </div>
        <FlowMeter continuity={continuity} compact />
      </div>

      {/* Progress + count-in */}
      <div className="flex items-center gap-3">
        <Progress value={progress} className="h-4 flex-1" indicatorClassName={active ? "duration-100" : undefined} />
        {phase === "countin" && (
          <motion.span key={countBeat} initial={{ scale: 1.4 }} animate={{ scale: 1 }} className="w-10 text-center font-display text-3xl font-bold text-primary">{countBeat || "…"}</motion.span>
        )}
        {recording && <Badge variant="accent" className="animate-pulse"><Mic className="h-3.5 w-3.5" /> Rec</Badge>}
      </div>

      {/* Staff */}
      <div className="rounded-3xl border-2 bg-card p-3">
        <div className="w-full overflow-x-auto">
          <Staff clef={notation.clef} keySig={scale.vexKey} timeSig="4/4" bars={notation.bars} bassBars={notation.bassBars} preferFlats={flats} barsPerLine={4} />
        </div>
      </div>

      {/* Result */}
      {(phase === "scored" || phase === "selfreport") && (
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="rounded-3xl border-2 bg-card p-4">
          {phase === "selfreport" ? (
            <div className="flex flex-col gap-3">
              <div className="font-display text-xl font-bold">Did you keep going?</div>
              <p className="text-sm text-muted-foreground">{savedRecording ? "Your recording is saved for a grown-up to hear." : micDenied ? "No mic this time — just tell us how it went." : "Tell us how it went."}</p>
              <div className="flex flex-wrap gap-2">
                <Button size="lg" variant="accent" onClick={() => selfReport("yes")}>Yes, all the way!</Button>
                <Button size="lg" variant="secondary" onClick={() => selfReport("mostly")}>Mostly</Button>
                <Button size="lg" variant="outline" onClick={() => selfReport("no")}>I stopped a lot</Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {lastScore ? (
                <>
                  <FlowMeter continuity={lastScore.components.continuity} />
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="muted">Pitch {lastScore.components.pitch >= 80 ? "sharp eyes" : lastScore.components.pitch >= 50 ? "mostly right" : "check the notes"}</Badge>
                    <Badge variant="muted">Rhythm {lastScore.components.rhythm >= 70 ? "steady" : lastScore.components.rhythm >= 40 ? "a bit loose" : "stay with the click"}</Badge>
                    {lastScore.badge === "no-stop-reading" && (
                      <motion.span initial={{ rotate: -8, scale: 0.7 }} animate={{ rotate: 0, scale: 1 }} className="ml-auto rounded-2xl bg-accent px-3 py-1 font-display font-bold text-accent-foreground">🏅 No-Stop Reading</motion.span>
                    )}
                  </div>
                </>
              ) : (
                <div className="font-display text-lg font-bold">
                  {lastAttempt?.selfReport === "yes" ? "Brilliant — that's what sight reading is all about!" : lastAttempt?.selfReport === "mostly" ? "Nice! Next time, keep the pulse even through the slips." : "No worries — slow and steady next time."}
                  {savedRecording && <span className="ml-2 text-sm font-normal text-muted-foreground">Recording saved.</span>}
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {phase === "ready" && (
          <Button size="xl" onClick={() => { void start(); }}><Play className="h-6 w-6" /> {attempts.length ? "Start" : "Ready? Start"}</Button>
        )}
        {active && <Button size="lg" variant="outline" onClick={cancelAttempt}>Stop</Button>}
        {phase === "scored" && (
          <>
            <Button size="lg" variant="secondary" onClick={tryAgain}><RotateCcw className="h-5 w-5" /> Try again</Button>
            <Button size="lg" onClick={newExercise}><Shuffle className="h-5 w-5" /> New exercise</Button>
            <Button size="lg" variant="outline" onClick={hearIt}><Volume2 className="h-5 w-5" /> Hear it</Button>
          </>
        )}
        {inputMode === "timer" && micDenied && phase === "ready" && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground"><MicOff className="h-3.5 w-3.5" /> Mic not available — you can still play and tell us how it went.</span>
        )}
        <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setShowKeyboard((s) => !s)}><Keyboard className="h-4 w-4" /> {showKeyboard ? "Hide keyboard" : "Show keyboard"}</Button>
      </div>

      {showKeyboard && (
        <div className="w-full overflow-x-auto rounded-3xl border-2 bg-card p-2 touch-none">
          <PianoKeyboard
            from={kbFrom}
            to={kbTo}
            preferFlats={flats}
            height={120}
            onNoteOn={(m) => { tap.note(m, "on"); audio.playNote(m, 0.5, 0.8); }}
            onNoteOff={(m) => tap.note(m, "off")}
          />
        </div>
      )}
    </BlockShell>
  );
}
