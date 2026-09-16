"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Screen, InputStatus, SectionLabel, QueueRow, SegmentBar, Button, Tempo, MainWithRail, keyLabel } from "@/components/ds";
import { useAppStore, useActiveChild } from "@/lib/store/app-store";
import { useInput } from "@/lib/hooks/use-input";
import { useAudio } from "@/lib/hooks/use-audio";
import { buildQueue, orderedBlocks, queueSeconds } from "@/lib/engine/queue";
import { DISCIPLINE } from "@/lib/engine/record";
import { BLOCK_ORDER } from "@/lib/types";
import type { QueueItem } from "@/lib/engine/queue";
import { repo } from "@/lib/db/repo";
import { dateKey } from "@/lib/utils/date";
import { AppHeader } from "./app-header";
import { QueueEditor, rowStates } from "./queue-editor";
import { TodayRail } from "./today-rail";
import { openSkillCheck } from "../skill-check/open";
import { useProfileData } from "./today-data";
import { words, capitalize } from "./words";

function guidedCopy(next: QueueItem | undefined, keyName: string, inProgress: boolean): { title: React.ReactNode; lede: React.ReactNode } {
  if (!next) return { title: "Everything for today is done.", lede: "Come back tomorrow, or open the queue and add a block." };
  const verb = inProgress ? "Pick up at" : "Start with";
  switch (next.type) {
    case "scales":
      return { title: `${verb} the ${keyName} scale.`, lede: <>Two octaves, hands separately first, with the click at <Tempo bpm={72} />.</> };
    case "rhythm":
      return { title: `${verb} timing.`, lede: `${next.detail}. Tap along or play; the click is steady, you follow it.` };
    case "reading":
      return { title: `${verb} sight reading.`, lede: `${next.detail}. Keep going through mistakes; stopping counts more than a wrong note.` };
    case "theory":
      return { title: `${verb} harmony.`, lede: `${next.detail}. Hear the chord, then find it on the keys.` };
    case "repertoire":
      return { title: `${verb} your pieces.`, lede: `${next.detail}.` };
    default:
      return { title: `${verb} something of your own.`, lede: `${next.detail}. Nothing is measured here.` };
  }
}

export function TodayScreen() {
  const router = useRouter();
  const parent = useAppStore((s) => s.parent);
  const children = useAppStore((s) => s.children);
  const activeChildId = useAppStore((s) => s.activeChildId);
  const setActiveChild = useAppStore((s) => s.setActiveChild);
  const activeSession = useAppStore((s) => s.activeSession);
  const planSession = useAppStore((s) => s.planSession);
  const startSession = useAppStore((s) => s.startSession);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const child = useActiveChild();
  const { mode: inputMode, label: inputLabel } = useInput();
  const { unlock } = useAudio();
  const [today] = React.useState(() => dateKey());
  const [dateLabel] = React.useState(() => new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }).toUpperCase());
  const [skippedCheck, setSkippedCheck] = React.useState<boolean | null>(null);
  const [starting, setStarting] = React.useState(false);
  const data = useProfileData(child?.id ?? null, activeSession ? 1 : 0);

  const needsOnboarding = !parent || children.length === 0;
  React.useEffect(() => {
    if (needsOnboarding) router.replace("/onboarding");
    else if (!activeChildId || !children.some((c) => c.id === activeChildId)) void setActiveChild(children[0].id);
  }, [needsOnboarding, activeChildId, children, router, setActiveChild]);

  React.useEffect(() => {
    if (!child) return;
    let cancelled = false;
    void repo.getKV<boolean>(`skillCheck.skipped:${child.id}`).then((v) => { if (!cancelled) setSkippedCheck(!!v); });
    return () => { cancelled = true; };
  }, [child]);

  if (!child) {
    return (
      <Screen>
        <AppHeader active="today" />
      </Screen>
    );
  }

  const guided = child.settings.mode === "guided";
  const plan = activeSession ? { blockSeconds: BLOCK_ORDER.reduce((acc, b) => ({ ...acc, [b]: Math.round(activeSession.weights[b] * activeSession.plannedMinutes * 60) }), {} as Record<typeof BLOCK_ORDER[number], number>), weights: activeSession.weights, scale: activeSession.scale, minutes: activeSession.plannedMinutes } : planSession(child, data.assignment);
  const queue = buildQueue(child, plan);
  const order = orderedBlocks(child);
  const states = rowStates(order, activeSession);
  const doneCount = states.filter((s) => s === "done").length;
  const nextIndex = states.indexOf("current");
  const next = nextIndex >= 0 ? queue[nextIndex] : undefined;
  const totalSeconds = queueSeconds(child, plan);
  const leftSeconds = queue.reduce((a, q, i) => a + (states[i] === "done" ? 0 : q.seconds), 0);
  const keyName = keyLabel(plan.scale.key, plan.scale.mode);
  const top = BLOCK_ORDER.reduce((a, b) => (plan.weights[b] > plan.weights[a] ? b : a), BLOCK_ORDER[0]);
  const flat = BLOCK_ORDER.every((b) => Math.abs(plan.weights[b] - plan.weights[top]) < 0.03);
  const inProgress = !!activeSession;
  const finishedToday = !inProgress && data.sessions.some((s) => s.date === today && s.endedAt !== null);
  const minutesToday = data.sessions.filter((s) => s.date === today).reduce((a, s) => a + Math.round(s.durationSec / 60), 0);
  const copy = finishedToday
    ? { title: "Done for today.", lede: `${capitalize(words(minutesToday))} minute${minutesToday === 1 ? "" : "s"} in the record. Another session adds to it; nothing is lost by stopping here.` }
    : guidedCopy(next, keyName, inProgress);
  const offerCheck = !child.skillProfile && skippedCheck === false;

  const begin = async () => {
    if (inProgress) { router.push("/session"); return; }
    setStarting(true);
    try {
      await unlock();
      await startSession(child, inputMode, data.assignment?.note || undefined, data.assignment);
      router.push("/session");
    } finally {
      setStarting(false);
    }
  };
  const notNow = async () => {
    await repo.setKV(`skillCheck.skipped:${child.id}`, true);
    setSkippedCheck(true);
  };
  const toggleMode = () => void updateSettings(child.id, { mode: guided ? "own" : "guided" });

  return (
    <Screen>
      <AppHeader active="today" right={<InputStatus mode={inputMode} device={inputLabel} />} />
      <MainWithRail rail={<TodayRail child={child} plan={plan} sessions={data.sessions} assignment={data.assignment} teacher={data.teacher} today={today} activeToday={inProgress} />}>
        <div style={{ padding: "36px 38px", display: "flex", flexDirection: "column", gap: 22, minHeight: 0, flex: 1 }}>
          <div>
            <SectionLabel>{dateLabel}</SectionLabel>
            <h1 style={{ margin: "8px 0 0", fontSize: 42, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.05 }}>
              {guided ? copy.title : <>{capitalize(words(Math.round(totalSeconds / 60)))} minutes, in {keyName}</>}
            </h1>
            <p style={{ margin: "10px 0 0", fontSize: 17, lineHeight: 1.5, color: "var(--kc-ink-muted)", maxWidth: 520 }}>
              {guided ? copy.lede : `${flat ? "Evenly weighted" : `Weighted toward ${DISCIPLINE[top].title.toLowerCase()}`}. Edit anything below — the shape is yours.`}
            </p>
          </div>
          {guided ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {next && <QueueRow index={next.index} title={next.title} detail={next.detail} duration={next.duration} state="current" draggable={false} settings={[]} />}
              <SegmentBar total={queue.length} filled={doneCount} radius={3} gap={6} />
              <span style={{ fontSize: 14, color: "var(--kc-ink-dim)" }}>
                {inProgress
                  ? `${capitalize(words(doneCount))} of ${words(queue.length)} done · about ${words(Math.ceil(leftSeconds / 60))} minutes left`
                  : `${capitalize(words(queue.length))} blocks · about ${words(Math.round(totalSeconds / 60))} minutes`}
              </span>
            </div>
          ) : (
            <QueueEditor child={child} plan={plan} session={activeSession} />
          )}
          <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 16 }}>
            <Button icon="play_arrow" onClick={() => void begin()} disabled={starting || (!next && !inProgress)}>{inProgress ? "Continue" : finishedToday ? "Practise again" : "Begin practice"}</Button>
            {offerCheck && (
              <>
                <Button variant="secondary" size="control" onClick={() => openSkillCheck(router.push)}>Take the skill check</Button>
                <button type="button" onClick={() => void notNow()} style={{ background: "transparent", border: "none", padding: 0, fontSize: 13, color: "var(--kc-ink-faint)", cursor: "pointer", fontFamily: "inherit", flex: "none" }}>Not now</button>
              </>
            )}
            <span style={{ fontSize: 14, color: "var(--kc-ink-dim)", flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {child.settings.hardStop ? `Stops at ${child.settings.sessionMinutes} minutes unless you keep going.` : "The timer keeps counting; nothing interrupts."}
            </span>
            <button type="button" onClick={toggleMode} disabled={inProgress} style={{ flex: "none", background: "transparent", border: "none", padding: 0, fontSize: 13, color: "var(--kc-ink-faint)", cursor: inProgress ? "default" : "pointer", fontFamily: "inherit", opacity: inProgress ? 0.5 : 1 }}>
              {guided ? "Switch to own plan" : "Switch to guided"}
            </button>
          </div>
        </div>
      </MainWithRail>
    </Screen>
  );
}
