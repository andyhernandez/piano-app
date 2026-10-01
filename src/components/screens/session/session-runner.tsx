"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useAppStore, type SessionPlan } from "@/lib/store/app-store";
import type { BlockResult, BlockType, Child, InputMode, Session } from "@/lib/types";
import { buildScale } from "@/lib/music/scales";
import { orderedBlocks, buildQueue, STOP_SHORT } from "@/lib/engine/queue";
import { DISCIPLINE, fmtClock } from "@/lib/engine/record";
import { useStopwatch } from "@/lib/hooks/use-timer";
import { useAudio } from "@/lib/hooks/use-audio";
import { getInput } from "@/lib/input/manager";
import { BLOCK_COMPONENTS } from "@/components/blocks";
import { BlockHeader, Button, Headline, Icon, InputStatus, Instruction, Panel, Pill, Screen, Small, StopPath, Tempo, keyLabel, type Stop } from "@/components/ds";
import { SessionDone, type DoneResult } from "./session-done";
import { InputLost } from "./input-lost";
import { blockHeadline, handsText, readingSpec, rhythmSpec } from "./words";

/** The /session route: the active session from the store, or the done screen once it has been finished here. */
export function SessionRunner() {
  const router = useRouter();
  const session = useAppStore((s) => s.activeSession);
  const plan = useAppStore((s) => s.plan);
  const child = useAppStore((s) => s.children.find((c) => c.id === s.activeSession?.childId) ?? null);
  const [done, setDone] = React.useState<DoneResult | null>(null);
  const [finishing, setFinishing] = React.useState(false);

  React.useEffect(() => {
    if (!session && !done && !finishing) router.replace("/");
  }, [session, done, finishing, router]);

  if (done) return <SessionDone result={done} />;
  if (!session || !plan || !child) return <Screen style={{ height: "100dvh" }}>{null}</Screen>;
  return <Runner key={session.id} session={session} plan={plan} child={child} onFinishing={() => setFinishing(true)} onDone={setDone} />;
}

function firstUnfinished(order: BlockType[], session: Session): number {
  const i = order.findIndex((t, slot) => !session.blocks.some((b) => (b.slot !== undefined ? b.slot === slot : b.type === t) && (b.completed || b.skipped)));
  return i < 0 ? order.length - 1 : i;
}

/** "1:12 left" for the header timer chip; counts past zero as "+0:40". */
function timerText(seconds: number, elapsed: number): string {
  const left = seconds - elapsed;
  if (left >= 0) return `${fmtClock(left).replace(/^0/, "")} left`;
  return `+${fmtClock(-left).replace(/^0/, "")}`;
}

function Runner({ session, plan, child, onFinishing, onDone }: { session: Session; plan: SessionPlan; child: Child; onFinishing: () => void; onDone: (r: DoneResult) => void }) {
  const router = useRouter();
  const { recordBlock, finishSession, abandonSession, setInputMode } = useAppStore();
  const storeMode = useAppStore((s) => s.inputMode);
  const { audio } = useAudio();
  const input = React.useMemo(() => getInput(), []);

  const order = React.useMemo(() => orderedBlocks(child), [child]);
  const total = order.length;
  const [index, setIndex] = React.useState(() => firstUnfinished(order, session));
  const type = order[Math.min(index, total - 1)];
  const seconds = plan.blockSeconds[type];
  const scale = React.useMemo(() => buildScale(session.scale), [session.scale]);
  const queue = React.useMemo(() => buildQueue(child, plan), [child, plan]);

  const [paused, setPaused] = React.useState(false);
  const [lost, setLost] = React.useState(false);
  const [liveMode, setLiveMode] = React.useState<InputMode>(() => (input.isStarted ? input.mode : storeMode));
  const [lastNoteAt, setLastNoteAt] = React.useState<number | null>(null);
  const [advisoryDismissed, setAdvisoryDismissed] = React.useState(false);
  const [metaOverride, setMetaOverride] = React.useState<React.ReactNode | null>(null);
  const [recording, setRecording] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  // After "Resume" on the input-lost screen, the same outage is not raised again until the device comes back.
  const ignoreLostRef = React.useRef(false);

  const running = !paused && !lost && !busy;
  const { seconds: elapsed, reset } = useStopwatch(running);
  const timeUp = elapsed >= seconds;
  const recordedSec = session.blocks.reduce((a, b) => a + b.durationSec, 0);
  const sessionOver = child.settings.hardStop && recordedSec + elapsed >= plan.minutes * 60;

  // Input: start the hub if the Today screen did not, follow mode changes, and notice a device that drops mid-block.
  React.useEffect(() => {
    let cancelled = false;
    const sync = () => { if (!cancelled) { setLiveMode(input.mode); setInputMode(input.mode); } };
    if (!input.isStarted) {
      void input.autoDetect(child.settings.inputModePreference, child.settings.micCalibration).then(sync);
    }
    const u1 = input.onChange(sync);
    const u2 = input.onNote(() => setLastNoteAt(Date.now()));
    const poll = setInterval(() => {
      const gone = input.mode !== "timer" && !input.connected;
      if (!gone) ignoreLostRef.current = false;
      else if (!ignoreLostRef.current) setLost(true);
    }, 1000);
    return () => { cancelled = true; u1(); u2(); clearInterval(poll); };
  }, [input, child.settings.inputModePreference, child.settings.micCalibration, setInputMode]);

  React.useEffect(() => () => { audio.stopMetronome(); audio.stopGroove(); }, [audio]);

  const finish = React.useCallback(async () => {
    onFinishing();
    setBusy(true);
    audio.stopMetronome();
    audio.stopGroove();
    const r = await finishSession();
    if (r) onDone(r);
  }, [audio, finishSession, onDone, onFinishing]);

  const advance = React.useCallback(() => {
    if (index + 1 < total) {
      setIndex(index + 1);
      reset();
      setMetaOverride(null);
      setRecording(false);
      audio.stopMetronome();
      audio.stopGroove();
    } else {
      void finish();
    }
  }, [index, total, reset, audio, finish]);

  const complete = React.useCallback(async (partial: Omit<BlockResult, "type" | "plannedSec" | "durationSec">) => {
    setBusy(true);
    await recordBlock({ type, slot: index, plannedSec: seconds, durationSec: elapsed, inputMode: liveMode, ...partial });
    setBusy(false);
    advance();
  }, [recordBlock, type, index, seconds, elapsed, liveMode, advance]);

  const skip = React.useCallback(() => { void complete({ completed: false, skipped: true }); }, [complete]);
  const stopForToday = async () => {
    audio.stopMetronome();
    audio.stopGroove();
    await abandonSession();
    router.push("/");
  };
  const finishNow = async () => {
    onFinishing();
    setBusy(true);
    await recordBlock({ type, slot: index, plannedSec: seconds, durationSec: elapsed, inputMode: liveMode, completed: false, skipped: false });
    await finish();
  };

  const Block = BLOCK_COMPONENTS[type];
  const nextTitle = index + 1 < total ? DISCIPLINE[order[index + 1]].title.toLowerCase() : null;
  const defaultMeta = metaFor(type, child, scale, queue.find((q) => q.type === type)?.detail);
  const meta = lost ? "Paused — nothing is listening" : paused ? "Paused" : metaOverride ?? defaultMeta;

  const right = (
    <>
      {recording && <Pill tone="indigo" icon="fiber_manual_record">Rec</Pill>}
      <InputStatus mode={liveMode} lost={lost} />
    </>
  );

  const soFar: Stop[] = order.map((t, i) => {
    const r = session.blocks.find((b) => b.type === t && (b.slot === undefined || b.slot === i));
    const done = i < index && !!r;
    return { icon: queue[i]?.icon ?? "piano", name: STOP_SHORT[t], detail: done ? blockHeadline(r).text.toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : i === index ? "Now" : `${Math.max(1, Math.round(plan.blockSeconds[t] / 60))} min`, state: done ? "done" : i === index ? "current" : t === "improv" ? "own" : "upcoming" };
  });

  return (
    <Screen style={{ height: "100dvh", minHeight: 0, overflow: "hidden" }}>
      <BlockHeader
        index={index + 1}
        total={total}
        title={DISCIPLINE[type].title}
        meta={meta}
        right={right}
        timer={lost || paused ? "paused" : timerText(seconds, elapsed)}
        onClose={() => setPaused(true)}
        onPause={() => setPaused((p) => !p)}
        paused={paused}
      />
      {sessionOver && !advisoryDismissed && !lost && !paused && (
        <div style={{ flex: "none", padding: "14px 32px 0" }}>
          <Panel tone="sun" style={{ flexDirection: "row", alignItems: "center", gap: 18, padding: "14px 20px" }}>
            <Icon name="timer" size={28} color="var(--kc-sun-ink)" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 18, fontWeight: 600 }}>Time&apos;s up for today — finish, or keep going.</div>
              <Small>{fmtClock(recordedSec + elapsed)} played of {plan.minutes} minutes planned. Whatever you choose is recorded as it happened.</Small>
            </div>
            <Button variant="secondary" size="pill" onClick={() => setAdvisoryDismissed(true)}>Keep going</Button>
            <Button size="pill" onClick={() => void finishNow()}>Finish</Button>
          </Panel>
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0, position: "relative", display: "flex", flexDirection: "column" }}>
        {type === "ear" && (
          <div style={{ flex: "none", padding: "22px 32px 0" }}>
            <Instruction>{instructionFor(type, child, nextTitle)}</Instruction>
          </div>
        )}
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <Block
            key={`${session.id}-${type}-${index}`}
            child={child}
            session={session}
            plan={plan}
            scale={scale}
            index={index + 1}
            total={total}
            seconds={seconds}
            elapsed={elapsed}
            timeUp={timeUp}
            paused={!running}
            inputMode={liveMode}
            nextTitle={nextTitle}
            onDone={(r) => void complete(r)}
            onSkip={skip}
            setMeta={setMetaOverride}
            setRecording={setRecording}
          />
        </div>
        {paused && !lost && (
          <div style={{ position: "absolute", inset: 0, background: "var(--kc-base)", padding: "30px 32px", display: "flex", flexDirection: "column", gap: 24, overflow: "auto" }}>
            <Headline size={44} title="Paused." lede="The clock is stopped and nothing is listening. Pick up where you left off, or stop for today — everything played so far is already in the record." />
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 20, fontWeight: 600, lineHeight: 1.15 }}>Today&apos;s path</div>
              <StopPath stops={soFar} />
            </div>
            <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: "auto" }}>
              <Button icon="play_arrow" onClick={() => setPaused(false)}>Carry on</Button>
              <Button variant="secondary" size="control" onClick={() => { setPaused(false); skip(); }}>Skip this stop</Button>
              <Button variant="quiet" size="control" onClick={() => void stopForToday()}>Stop for today</Button>
            </div>
          </div>
        )}
        {lost && (
          <InputLost
            session={session}
            child={child}
            type={type}
            lostMode={liveMode}
            lastNoteAt={lastNoteAt}
            onResolved={(mode) => { setInputMode(mode); setLiveMode(mode); setLost(false); }}
          />
        )}
      </div>
    </Screen>
  );
}

/** The one-line instruction under the header, beside the mini Tick. Blocks replace it as their phases move. */
function instructionFor(type: BlockType, child: Child, nextTitle: string | null): string {
  switch (type) {
    case "scales":
      return "Right hand, up and back. Listen for one note louder than the rest.";
    case "rhythm":
      return "The click plays the rhythm once, counts you in, then you tap it back.";
    case "ear":
      return "Hear it, play it back, then find it on the staff.";
    case "reading":
      return `Keep going through mistakes — stopping counts more than a wrong note. Level ${child.settings.readingLevel}.`;
    case "theory":
      return "Hear the chord, then find it on the keys.";
    case "repertoire":
      return "Your piece first, slowly. Then the lead sheet.";
    default:
      return nextTitle ? "Play whatever you like. Nothing is measured here." : "Last stop. Play whatever you like — nothing is measured here.";
  }
}

function metaFor(type: BlockType, child: Child, scale: ReturnType<typeof buildScale>, queueDetail?: string): React.ReactNode {
  const key = keyLabel(scale.key, scale.mode);
  const s = child.settings;
  switch (type) {
    case "scales":
      return <>{key} · two octaves · hands separately</>;
    case "rhythm": {
      const spec = rhythmSpec(s.rhythmLevel);
      return <>Level {s.rhythmLevel} · {spec.title.toLowerCase()} · <Tempo bpm={spec.bpm} /></>;
    }
    case "reading": {
      const spec = readingSpec(s.readingLevel);
      return <>Level {s.readingLevel} · {handsText(spec.hands)} · {key} · <Tempo bpm={spec.tempo} /></>;
    }
    case "ear":
      return <>{key} · three to five notes · by ear, then on the staff</>;
    default:
      return queueDetail ?? key;
  }
}
