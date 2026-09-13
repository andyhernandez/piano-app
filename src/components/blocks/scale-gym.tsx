"use client";
import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Maximize2, Minimize2, Play, RotateCcw, Square, Target, Volume2 } from "lucide-react";
import type { Hand, MidiScore, NoteEvent } from "@/lib/types";
import type { BlockComponentProps } from "@/components/session/block-props";
import { BlockShell } from "@/components/session/block-shell";
import { InputBadge } from "@/components/session/input-badge";
import { PianoKeyboard, type KeyState } from "@/components/keyboard/piano-keyboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAudio } from "@/lib/hooks/use-audio";
import { useInput } from "@/lib/hooks/use-input";
import { prefersFlats } from "@/lib/music/scales";
import { midiToName, prettyPc } from "@/lib/music/notes";
import { scoreScaleRun } from "@/lib/engine/scoring";
import { cn } from "@/lib/utils/cn";
import { MetronomeControl, MetronomeToggle, useMetronome } from "./shared/metronome-control";
import { Segmented } from "./shared/segmented";
import { useSoundingKeys } from "./shared/use-sounding-keys";
import { ascendingOf, fingeringFor, runFor, thumbUnderFor, viewRange, type Octaves, type RouletteOption } from "./scale-gym/scale-view";
import { DynamicRoulette } from "./scale-gym/roulette";
import { SelfReportDialog, type SelfReport } from "./scale-gym/self-report";
import { CheckResult } from "./scale-gym/check-result";

const FLASH_MS = 350;

/**
 * Block A — Warm-up & Scale Gym (§4A). Scale of the week on the keyboard with fingering and thumb-under
 * markers, metronome, Dynamic Roulette, "play it for me", and a scale check scored with `scoreScaleRun`.
 */
export function ScaleGymBlock(props: BlockComponentProps) {
  const { scale, inputMode, child } = props;
  const { audio } = useAudio();
  const metro = useMetronome({ initialBpm: 72, beatsPerBar: 4, enabled: props.running });
  const keys = useSoundingKeys();
  const flats = prefersFlats(scale);

  const [hand, setHand] = React.useState<Hand>("RH");
  const [octaves, setOctaves] = React.useState<Octaves>(() => (child.settings.readingLevel <= 2 ? 1 : 2));
  const [full, setFull] = React.useState(false);
  const [roulette, setRoulette] = React.useState<RouletteOption | null>(null);
  const [playhead, setPlayhead] = React.useState<number | null>(null);

  // Scale check state. Progress is mirrored in a ref so fast note bursts never read stale state.
  const [armed, setArmed] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const progressRef = React.useRef(0);
  const eventsRef = React.useRef<NoteEvent[]>([]);
  const [flash, setFlash] = React.useState<Partial<Record<number, KeyState>>>({});
  const [result, setResult] = React.useState<MidiScore | null>(null);
  const [best, setBest] = React.useState<MidiScore | null>(null);
  const [checks, setChecks] = React.useState(0);
  const [askFeel, setAskFeel] = React.useState(false);
  const timeouts = React.useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  React.useEffect(() => {
    const set = timeouts.current;
    return () => { for (const id of set) clearTimeout(id); set.clear(); };
  }, []);

  const later = React.useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => { timeouts.current.delete(id); fn(); }, ms);
    timeouts.current.add(id);
  }, []);

  const run = React.useMemo(() => runFor(scale, hand, octaves), [scale, hand, octaves]);
  const ascending = React.useMemo(() => ascendingOf(run), [run]);
  const fingering = React.useMemo(() => fingeringFor(scale, hand, octaves), [scale, hand, octaves]);
  const markers = React.useMemo(() => thumbUnderFor(scale, hand, fingering).map((i) => ascending[i]), [scale, hand, fingering, ascending]);
  const [lo, hi] = React.useMemo(() => viewRange(run, full), [run, full]);

  const labels = React.useMemo(() => {
    const out: Partial<Record<number, string>> = {};
    ascending.forEach((m, i) => { if (fingering[i] !== undefined) out[m] = String(fingering[i]); });
    return out;
  }, [ascending, fingering]);

  const highlights = React.useMemo(() => {
    const h: Partial<Record<number, KeyState>> = {};
    for (const m of run) h[m] = "scale";
    if (armed && progress < run.length) h[run[progress]] = "hint";
    if (playhead !== null) h[playhead] = "active";
    return { ...h, ...flash };
  }, [run, armed, progress, playhead, flash]);

  const flashKey = React.useCallback((midi: number, state: KeyState) => {
    setFlash((f) => ({ ...f, [midi]: state }));
    later(() => setFlash((f) => { const n = { ...f }; delete n[midi]; return n; }), FLASH_MS);
  }, [later]);

  const resetCheck = React.useCallback(() => {
    progressRef.current = 0;
    eventsRef.current = [];
    setProgress(0);
    setFlash({});
  }, []);

  const startCheck = () => {
    resetCheck();
    setResult(null);
    setArmed(true);
    metro.setOn(true);
  };

  /** Scores the current attempt and returns it (also stored in state). Null if nothing was played. */
  const finishCheck = React.useCallback((): MidiScore | null => {
    setArmed(false);
    const events = eventsRef.current;
    if (!events.some((e) => e.kind === "on")) { resetCheck(); return null; }
    const scored = scoreScaleRun(run, events, metro.bpm, inputMode);
    // Timer mode uses the on-screen keyboard: the check still teaches, but never awards the badge.
    const s: MidiScore = inputMode === "timer" ? { ...scored, badge: null } : scored;
    setResult(s);
    setBest((b) => (!b || s.score > b.score ? s : b));
    setChecks((c) => c + 1);
    audio.stinger(s.badge ? "levelup" : s.score >= 70 ? "success" : "pop");
    resetCheck();
    return s;
  }, [run, metro.bpm, inputMode, audio, resetCheck]);

  const { mode, label } = useInput({
    onNote: (e) => {
      if (!armed) return;
      eventsRef.current.push(e);
      if (e.kind !== "on") return;
      const p = progressRef.current;
      // Accept the expected note, or forgive one skipped note so the kid can keep going.
      const hop = [0, 1].find((k) => run[p + k] === e.midi);
      if (hop === undefined) { flashKey(e.midi, "wrong"); return; }
      progressRef.current = p + hop + 1;
      setProgress(progressRef.current);
      flashKey(e.midi, "correct");
      if (progressRef.current >= run.length) finishCheck();
    },
  });

  const [playing, setPlaying] = React.useState(false);
  const playScale = () => {
    if (playing) return;
    const gap = 60 / metro.bpm;
    audio.playSequence(run, gap, gap * 0.9);
    setPlaying(true);
    run.forEach((m, i) => later(() => setPlayhead(m), i * gap * 1000 + 60));
    later(() => { setPlayhead(null); setPlaying(false); }, run.length * gap * 1000 + 80);
  };

  const onLand = (o: RouletteOption) => {
    setRoulette(o);
    if (o.bpm) metro.setBpm(o.bpm);
    audio.stinger("pop");
  };

  const complete = (finalBest: MidiScore | null, selfReport: SelfReport | null) => {
    props.onComplete({
      midiScore: finalBest ?? undefined,
      details: { scale: scale.name, bpm: metro.bpm, roulette: roulette?.label ?? null, octaves, hand, checks: checks + (finalBest && finalBest !== best ? 1 : 0), selfReport },
    });
  };

  const [pendingBest, setPendingBest] = React.useState<MidiScore | null>(null);
  const onDone = () => {
    const last = armed ? finishCheck() : null;
    const finalBest = last && (!best || last.score > best.score) ? last : best;
    if (inputMode === "timer") { setPendingBest(finalBest); setAskFeel(true); return; }
    complete(finalBest, null);
  };

  const nextName = armed && progress < run.length ? midiToName(run[progress], flats) : null;
  const headerRight = (
    <>
      <InputBadge mode={mode} label={label} />
      <MetronomeToggle m={metro} />
    </>
  );

  return (
    <BlockShell type="scales" remainingSec={props.remainingSec} plannedSec={props.plannedSec} onDone={onDone} onAddMinute={() => props.addSeconds(60)} headerRight={headerRight}>
      {/* Scale header + view controls */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="flex min-w-0 flex-col">
            <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Scale of the week</div>
            <div className="font-display text-2xl font-bold sm:text-3xl">{scale.name}</div>
            <div className="flex flex-wrap gap-1 pt-1">
              {scale.notes.map((n) => <span key={n} className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold">{prettyPc(n)}</span>)}
            </div>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Segmented label="Hand" value={hand} onChange={setHand} options={[{ value: "RH", label: "RH" }, { value: "LH", label: "LH" }]} />
            <Segmented label="Octaves" value={octaves} onChange={setOctaves} options={[{ value: 1, label: "1 oct" }, { value: 2, label: "2 oct" }]} />
            <Button variant="outline" size="icon" onClick={() => setFull((v) => !v)} aria-pressed={full} aria-label={full ? "Show two octaves" : "Show all 88 keys"} className="hidden lg:inline-flex">
              {full ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            </Button>
            <Button variant="outline" onClick={playScale} disabled={playing}>
              <Volume2 className={cn("h-5 w-5", playing && "animate-pulse")} /> Play it for me
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Controls: metronome / roulette / check */}
      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="font-display text-lg">Metronome</CardTitle></CardHeader>
          <CardContent><MetronomeControl m={metro} /></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="font-display text-lg">Dynamic Roulette</CardTitle></CardHeader>
          <CardContent><DynamicRoulette value={roulette} onLand={onLand} /></CardContent>
        </Card>
        <Card className={cn(armed && "border-primary")}>
          <CardHeader className="pb-2"><CardTitle className="font-display text-lg">Check my scale</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            {!armed ? (
              <>
                <p className="text-sm text-muted-foreground">
                  {inputMode === "timer" ? "Tap the scale up and down on the keyboard below, with the click." : `Play ${scale.name} up and down with the click${hand === "LH" ? " (left hand)" : ""}.`}
                </p>
                <Button size="lg" onClick={startCheck} className="w-full"><Target className="h-6 w-6" /> Check my scale</Button>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between text-sm font-bold">
                  <span>{progress} / {run.length} notes</span>
                  {nextName && <span className="rounded-full bg-[#fde68a] px-3 py-0.5 text-[#1f2140]">Next: {nextName}</span>}
                </div>
                <Progress value={(progress / run.length) * 100} className="h-3" />
                <div className="flex gap-2">
                  <Button size="lg" variant="accent" onClick={finishCheck} className="flex-1"><Square className="h-5 w-5" /> Finish check</Button>
                  <Button size="lg" variant="outline" onClick={() => { resetCheck(); }} aria-label="Start over"><RotateCcw className="h-5 w-5" /></Button>
                </div>
              </>
            )}
            {best && !armed && <div className="text-xs font-bold text-muted-foreground">Best this block: {best.score}/100{best.badge ? " · Clean Scale!" : ""}</div>}
          </CardContent>
        </Card>
      </div>

      {/* Keyboard, full width */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 text-xs font-bold text-muted-foreground">
            <span>{hand === "RH" ? "Right hand" : "Left hand"} fingering · <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#4f46e5] align-middle" /> thumb under</span>
            <span>{octaves === 1 ? "One octave" : "Two octaves"}{full ? " · 88 keys" : ""}</span>
          </div>
          <div className="overflow-x-auto">
            <PianoKeyboard
              from={lo}
              to={hi}
              highlights={highlights}
              labels={labels}
              markers={markers}
              showNoteNames={!full}
              preferFlats={flats}
              onNoteOn={keys.onNoteOn}
              onNoteOff={keys.onNoteOff}
              height={full ? 120 : 170}
              className={full ? "min-w-[900px]" : undefined}
            />
          </div>
        </CardContent>
      </Card>

      <AnimatePresence>
        {result && !armed && (
          <motion.div key="result" exit={{ opacity: 0, y: 8 }}>
            <CheckResult result={result} />
            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={startCheck}><Play className="h-5 w-5" /> Try again</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SelfReportDialog open={askFeel} onPick={(v) => { setAskFeel(false); complete(pendingBest, v); }} />
    </BlockShell>
  );
}
