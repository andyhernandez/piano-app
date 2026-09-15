"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useAppStore, type SessionPlan } from "@/lib/store/app-store";
import type { BlockResult, BlockType, Child, InputMode, Session } from "@/lib/types";
import { buildScale } from "@/lib/music/scales";
import { orderedBlocks, buildQueue } from "@/lib/engine/queue";
import { DISCIPLINE, fmtClock } from "@/lib/engine/record";
import { useStopwatch } from "@/lib/hooks/use-timer";
import { useAudio } from "@/lib/hooks/use-audio";
import { getInput } from "@/lib/input/manager";
import { BLOCK_COMPONENTS } from "@/components/blocks";
import { BlockHeader, Button, Clock, Headline, Icon, LogTable, Panel, Pill, ProgressStrip, Screen, SectionLabel, Tempo, keyLabel } from "@/components/ds";
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

const CLOCK_IN_BLOCK: Partial<Record<BlockType, boolean>> = { reading: true };

function firstUnfinished(order: BlockType[], session: Session): number {
  const i = order.findIndex((t) => !session.blocks.some((b) => b.type === t && (b.completed || b.skipped)));
  return i < 0 ? order.length - 1 : i;
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
    await recordBlock({ type, plannedSec: seconds, durationSec: elapsed, inputMode: liveMode, ...partial });
    setBusy(false);
    advance();
  }, [recordBlock, type, seconds, elapsed, liveMode, advance]);

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
    await recordBlock({ type, plannedSec: seconds, durationSec: elapsed, inputMode: liveMode, completed: false, skipped: false });
    await finish();
  };

  const Block = BLOCK_COMPONENTS[type];
  const nextTitle = index + 1 < total ? DISCIPLINE[order[index + 1]].title.toLowerCase() : null;
  const defaultMeta = metaFor(type, child, scale, queue.find((q) => q.type === type)?.detail);
  const meta = lost || paused ? "Paused" : metaOverride ?? defaultMeta;
  const showClock = !(liveMode === "timer" && CLOCK_IN_BLOCK[type]);

  const right = lost ? (
    <>
      <Pill tone="clay" icon="error">NO INPUT</Pill>
      <Clock seconds={elapsed} dim />
      <Button variant="secondary" size="control" onClick={() => { ignoreLostRef.current = true; setLost(false); }}>Resume</Button>
    </>
  ) : (
    <>
      <Icon name={liveMode === "midi" ? "piano" : liveMode === "mic" ? "mic" : "timer"} size={20} color={liveMode === "midi" ? "var(--kc-mint)" : "var(--kc-ink-dim)"} />
      {liveMode === "timer" && <Pill>TIMER ONLY</Pill>}
      {recording && <Pill tone="clay">{"●"} REC</Pill>}
      {showClock && <Clock seconds={elapsed} dim={paused} />}
      <Button variant="secondary" size="control" onClick={() => setPaused((p) => !p)}>{paused ? "Resume" : "Pause"}</Button>
    </>
  );

  const soFar = order.slice(0, index).map((t, i) => {
    const r = session.blocks.find((b) => b.type === t);
    return { cells: [String(i + 1).padStart(2, "0"), r ? fmtClock(r.durationSec) : "—", DISCIPLINE[t].label, r ? blockHeadline(r).text : "—"], marked: r ? blockHeadline(r).marked : false };
  });

  return (
    <Screen style={{ height: "100dvh", minHeight: 0, overflow: "hidden" }}>
      <BlockHeader index={index + 1} total={total} title={DISCIPLINE[type].title} meta={meta} right={right} />
      <ProgressStrip value={seconds ? Math.min(1, elapsed / seconds) : 0} dim={lost} />
      {sessionOver && !advisoryDismissed && !lost && (
        <div style={{ flex: "none", padding: "14px 30px 0" }}>
          <Panel padding="card" style={{ flexDirection: "row", alignItems: "center", gap: 18 }}>
            <Icon name="timer" size={20} color="var(--kc-amber)" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Time&apos;s up for today — finish or keep going.</div>
              <div style={{ fontSize: 14, color: "var(--kc-ink-dim)", marginTop: 2 }}>{fmtClock(recordedSec + elapsed)} played of {plan.minutes} minutes planned. Whatever you choose is recorded as it happened.</div>
            </div>
            <Button variant="secondary" size="control" onClick={() => setAdvisoryDismissed(true)}>Keep going</Button>
            <Button size="control" onClick={() => void finishNow()}>Finish</Button>
          </Panel>
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0, position: "relative", display: "flex", flexDirection: "column" }}>
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
          <div style={{ position: "absolute", inset: 0, background: "var(--kc-base)", padding: "34px 38px", display: "flex", flexDirection: "column", gap: 26, overflow: "auto" }}>
            <Headline size={38} title="Paused." lede="The clock is stopped and nothing is listening. Pick up where you left off, or stop for today — everything played so far is already in the record." />
            <div style={{ display: "flex", gap: 10 }}>
              <Button size="control" onClick={() => setPaused(false)}>Resume</Button>
              <Button variant="secondary" size="control" onClick={() => { setPaused(false); skip(); }}>Skip this block</Button>
              <Button variant="quiet" size="control" onClick={() => void stopForToday()}>Stop for today</Button>
            </div>
            {soFar.length > 0 && (
              <Panel style={{ maxWidth: 560 }}>
                <SectionLabel>SO FAR TODAY</SectionLabel>
                <LogTable rows={soFar} emphasize={2} />
              </Panel>
            )}
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
    default:
      return queueDetail ?? key;
  }
}
