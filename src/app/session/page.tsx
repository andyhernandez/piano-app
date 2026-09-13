"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Home, X } from "lucide-react";
import { useAppStore, useActiveChild } from "@/lib/store/app-store";
import { BLOCK_ORDER, type BlockResult, type BlockType, type Child, type InputMode, type ScaleId } from "@/lib/types";
import { buildScale, scaleName } from "@/lib/music/scales";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BLOCK_DEFS, type BlockComponentProps } from "@/components/session/block-props";
import { useCountdown } from "@/lib/hooks/use-timer";
import { useAudio } from "@/lib/hooks/use-audio";
import { getInput } from "@/lib/input/manager";
import { InputBadge } from "@/components/session/input-badge";
import { repo } from "@/lib/db/repo";
import { ScaleGymBlock } from "@/components/blocks/scale-gym";
import { RhythmLabBlock } from "@/components/blocks/rhythm-lab";
import { SightReadingBlock } from "@/components/blocks/sight-reading";
import { TheoryLabBlock } from "@/components/blocks/theory-lab";
import { RepertoireBlock } from "@/components/blocks/repertoire";
import { SandboxBlock } from "@/components/blocks/sandbox";
import { SessionSummary } from "@/components/session/session-summary";
import { Companion } from "@/components/map/companion";

const BLOCK_COMPONENTS: Record<BlockType, React.ComponentType<BlockComponentProps>> = {
  scales: ScaleGymBlock,
  rhythm: RhythmLabBlock,
  reading: SightReadingBlock,
  theory: TheoryLabBlock,
  repertoire: RepertoireBlock,
  improv: SandboxBlock,
};

type Phase = { kind: "start" } | { kind: "intro"; index: number } | { kind: "block"; index: number } | { kind: "summary" };

/**
 * Session runner (§4). Walks the six blocks in order with an interstitial before each, a hard-stopped countdown,
 * and a summary at the end. Session state persists to IndexedDB after every block so a closed tab loses nothing.
 */
export default function SessionPage() {
  const router = useRouter();
  const child = useActiveChild();
  const { activeSession, plan, startSession, recordBlock, finishSession, abandonSession, planSession, setInputMode } = useAppStore();
  const { audio, unlock } = useAudio();
  const [phase, setPhase] = React.useState<Phase>({ kind: "start" });
  const [inputMode, setMode] = React.useState<InputMode>("timer");
  const [inputLabel, setInputLabel] = React.useState("Tap pad");
  const [detecting, setDetecting] = React.useState(false);
  const [teacherNote, setTeacherNote] = React.useState<string | undefined>();
  const [summary, setSummary] = React.useState<Awaited<ReturnType<typeof finishSession>>>(null);

  React.useEffect(() => { if (!child) router.replace("/"); }, [child, router]);
  React.useEffect(() => {
    if (!child) return;
    repo.assignmentFor(child.id).then((a) => setTeacherNote(a?.note || undefined));
  }, [child]);

  const preview = child ? planSession(child) : null;

  const begin = async () => {
    if (!child) return;
    setDetecting(true);
    await unlock();
    const input = getInput();
    const mode = await input.autoDetect(child.settings.inputModePreference, child.settings.micCalibration);
    setMode(mode);
    setInputLabel(input.label);
    setInputMode(mode);
    await startSession(child, mode, teacherNote);
    setDetecting(false);
    setPhase({ kind: "intro", index: 0 });
  };

  const advance = React.useCallback(async (index: number) => {
    if (index + 1 < BLOCK_ORDER.length) setPhase({ kind: "intro", index: index + 1 });
    else {
      audio.stopMetronome(); audio.stopGroove();
      const result = await finishSession();
      setSummary(result);
      setPhase({ kind: "summary" });
    }
  }, [audio, finishSession]);

  const quit = async () => {
    audio.stopMetronome(); audio.stopGroove();
    await abandonSession();
    router.push("/");
  };

  if (!child) return null;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-4">
      <div className="mb-2 flex items-center gap-3 text-sm text-muted-foreground">
        <span className="font-display text-lg text-foreground">🎹 KeyCadence</span>
        {activeSession && <span>· {scaleName(activeSession.scale)}</span>}
        {phase.kind !== "start" && phase.kind !== "summary" && <InputBadge mode={inputMode} label={inputLabel} />}
        <div className="ml-auto flex gap-2">
          {phase.kind !== "summary" && phase.kind !== "start" && (
            <Button variant="ghost" size="sm" onClick={quit}><X className="h-4 w-4" /> Quit</Button>
          )}
        </div>
      </div>
      {phase.kind !== "start" && phase.kind !== "summary" && (
        <ol className="mb-3 flex gap-1">
          {BLOCK_ORDER.map((b, i) => {
            const done = activeSession?.blocks.some((r) => r.type === b && (r.completed || r.skipped));
            const current = phase.index === i;
            return <li key={b} className={`h-2 flex-1 rounded-full ${done ? "bg-accent" : current ? "bg-primary" : "bg-muted"}`} title={BLOCK_DEFS[b].title} />;
          })}
        </ol>
      )}

      <AnimatePresence mode="wait">
        {phase.kind === "start" && preview && (
          <motion.div key="start" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-1 items-center justify-center">
            <Card className="w-full max-w-xl">
              <CardHeader className="items-center text-center">
                <Companion state={child.companion} mood="wave" size={120} />
                <CardTitle className="text-3xl">Today&apos;s session</CardTitle>
                <CardDescription>{scaleName(preview.scale)} · {preview.minutes} minutes · 6 blocks</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {teacherNote && (
                  <div className="rounded-2xl border-2 border-secondary bg-secondary/20 p-3 text-sm"><b>Note from your teacher:</b> {teacherNote}</div>
                )}
                <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                  {BLOCK_ORDER.map((b) => (
                    <li key={b} className="rounded-2xl bg-muted p-2">
                      <div className="text-xl">{BLOCK_DEFS[b].emoji}</div>
                      <div className="font-bold leading-tight">{BLOCK_DEFS[b].title}</div>
                      <div className="text-muted-foreground">{Math.round(preview.blockSeconds[b] / 60)} min</div>
                    </li>
                  ))}
                </ul>
                <Button size="xl" onClick={begin} disabled={detecting}>{detecting ? "Listening for your piano…" : "Let's go!"} <ArrowRight className="h-6 w-6" /></Button>
                <Button variant="ghost" onClick={() => router.push("/")}><Home className="h-4 w-4" /> Back home</Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {phase.kind === "intro" && plan && (
          <motion.div key={`intro-${phase.index}`} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-1 items-center justify-center">
            <Interstitial type={BLOCK_ORDER[phase.index]} seconds={plan.blockSeconds[BLOCK_ORDER[phase.index]]} index={phase.index}
              onStart={() => setPhase({ kind: "block", index: phase.index })}
              onSkip={async () => {
                await recordBlock({ type: BLOCK_ORDER[phase.index], plannedSec: plan.blockSeconds[BLOCK_ORDER[phase.index]], durationSec: 0, completed: false, skipped: true });
                void advance(phase.index);
              }} />
          </motion.div>
        )}

        {phase.kind === "block" && plan && activeSession && (
          <motion.div key={`block-${phase.index}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-1 flex-col">
            <BlockRunner
              type={BLOCK_ORDER[phase.index]}
              plannedSec={plan.blockSeconds[BLOCK_ORDER[phase.index]]}
              inputMode={inputMode}
              child={child}
              scaleId={plan.scale}
              onFinished={async (result) => {
                audio.stopMetronome(); audio.stopGroove();
                await recordBlock(result);
                void advance(phase.index);
              }}
            />
          </motion.div>
        )}

        {phase.kind === "summary" && summary && (
          <motion.div key="summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-1 items-center justify-center">
            <SessionSummary session={summary.session} child={summary.child} onHome={() => router.push("/")} onMap={() => router.push("/map")} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Interstitial({ type, seconds, index, onStart, onSkip }: { type: BlockType; seconds: number; index: number; onStart: () => void; onSkip: () => void }) {
  const def = BLOCK_DEFS[type];
  return (
    <Card className="w-full max-w-xl text-center">
      <CardHeader className="items-center">
        <div className="text-6xl">{def.emoji}</div>
        <CardDescription>Block {index + 1} of {BLOCK_ORDER.length} · {Math.round(seconds / 60)} min</CardDescription>
        <CardTitle className="text-3xl">{def.title}</CardTitle>
        <p className="text-muted-foreground">{def.intro}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ul className="flex flex-wrap justify-center gap-2 text-sm font-bold">
          {def.rules.map((r) => <li key={r} className="rounded-full bg-muted px-3 py-1 text-muted-foreground">{r}</li>)}
        </ul>
        <Button size="xl" onClick={onStart}>Start <ArrowRight className="h-6 w-6" /></Button>
        <Button variant="ghost" size="sm" onClick={onSkip}>Skip this block today</Button>
      </CardContent>
    </Card>
  );
}

function BlockRunner({ type, plannedSec, inputMode, child, scaleId, onFinished }: { type: BlockType; plannedSec: number; inputMode: InputMode; child: Child; scaleId: ScaleId; onFinished: (r: BlockResult) => void }) {
  const { audio } = useAudio();
  const [startedAt] = React.useState(() => Date.now());
  const [timeUp, setTimeUp] = React.useState(false);
  const finishedRef = React.useRef(false);
  const scale = React.useMemo(() => buildScale(scaleId), [scaleId]);
  const { remaining, addSeconds } = useCountdown(plannedSec, {
    running: true,
    onDone: () => { audio.bell(); setTimeUp(true); },
  });
  const Component = BLOCK_COMPONENTS[type];
  const complete: BlockComponentProps["onComplete"] = (partial) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinished({
      type,
      plannedSec,
      durationSec: Math.round((Date.now() - startedAt) / 1000),
      completed: true,
      skipped: false,
      ...partial,
    });
  };
  return (
    <>
      <Component child={child} scale={scale} plannedSec={plannedSec} inputMode={inputMode} running={!timeUp} remainingSec={remaining} addSeconds={addSeconds} onComplete={complete} />
      <AnimatePresence>
        {timeUp && (
          <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-x-0 bottom-20 z-40 mx-auto w-[calc(100%-2rem)] max-w-md rounded-3xl border-2 border-secondary bg-card p-4 shadow-xl">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🔔</span>
              <div className="flex-1">
                <div className="font-display text-lg font-semibold">Time&apos;s up!</div>
                <div className="text-sm text-muted-foreground">Finish your thought, then move on.</div>
              </div>
              <Button size="sm" variant="outline" onClick={() => { addSeconds(60); setTimeUp(false); }}>+1 min</Button>
              <Button size="sm" variant="accent" onClick={() => complete()}>Next</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
