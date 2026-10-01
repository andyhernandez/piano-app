"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Screen, InputStatus, Button, MainWithRail, Headline, TickSays, StopPath, ActionNote, keyLabel, type Stop } from "@/components/ds";
import { useAppStore, useActiveChild } from "@/lib/store/app-store";
import { useInput } from "@/lib/hooks/use-input";
import { useAudio } from "@/lib/hooks/use-audio";
import { buildQueue, orderedBlocks, queueSeconds, STOP_SHORT } from "@/lib/engine/queue";
import { weekProgress } from "@/lib/engine/record";
import { BLOCK_ORDER } from "@/lib/types";
import { repo } from "@/lib/db/repo";
import { dateKey } from "@/lib/utils/date";
import { blockHeadline } from "../session/words";
import { AppHeader } from "./app-header";
import { QueueEditor, rowStates } from "./queue-editor";
import { TodayRail } from "./today-rail";
import { useProfileData } from "./today-data";
import { weightingReason } from "./today-copy";
import { words, capitalize } from "./words";

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
  const [weekday] = React.useState(() => new Date().toLocaleDateString("en-US", { weekday: "long" }));
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
  const inProgress = !!activeSession;
  const finishedToday = !inProgress && data.sessions.some((s) => s.date === today && s.endedAt !== null);
  const minutesToday = data.sessions.filter((s) => s.date === today).reduce((a, s) => a + Math.round(s.durationSec / 60), 0);
  const offerCheck = !child.skillProfile && skippedCheck === false;
  const week = weekProgress(child, data.sessions, today);
  const dayNumber = Math.min(week.target, week.played + (finishedToday || inProgress ? 0 : 1));
  const everHadEar = data.sessions.some((s) => s.blocks.some((b) => b.type === "ear" && b.completed));
  const minutesLeft = Math.max(1, Math.ceil(leftSeconds / 60));
  const stopsLeft = queue.length - doneCount;

  const stops: Stop[] = queue.map((q, i) => {
    const done = states[i] === "done";
    const result = activeSession?.blocks.find((b) => b.type === q.type && (b.slot === undefined || b.slot === i));
    const state: Stop["state"] = done ? "done" : i === nextIndex ? (inProgress ? "current" : "first") : q.type === "improv" ? "own" : q.type === "ear" && !everHadEar ? "new" : "upcoming";
    const minutes = Math.max(1, Math.round(q.seconds / 60));
    const detail = done && result ? blockHeadline(result).text.toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : state === "new" ? `New · ${minutes} min` : `${minutes} min`;
    return { icon: q.icon, name: STOP_SHORT[q.type], detail, state };
  });

  const title = finishedToday
    ? `Done for today, ${child.name}.`
    : inProgress
      ? `Hi ${child.name} — ${words(stopsLeft)} stop${stopsLeft === 1 ? "" : "s"} left, ${words(minutesLeft)} minute${minutesLeft === 1 ? "" : "s"}.`
      : `Hi ${child.name} — ${words(queue.length)} stops, ${words(Math.round(totalSeconds / 60))} minutes.`;
  const tickLine = finishedToday
    ? `${capitalize(words(minutesToday))} minute${minutesToday === 1 ? "" : "s"} in the record today. Another session adds to it — nothing is lost by stopping here.`
    : inProgress
      ? `You're part way through. Pick up at ${next ? STOP_SHORT[next.type].toLowerCase() : "the next stop"} — everything before it is already in the record.`
      : weightingReason(child, plan, data.teacher?.name ?? null, !!data.assignment?.note);

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
  const primaryLabel = inProgress ? "Continue" : finishedToday ? "Play again" : guided ? "Start playing" : "Start";

  return (
    <Screen>
      <AppHeader active="today" right={<InputStatus mode={inputMode} device={inputLabel} />} />
      <MainWithRail rail={<TodayRail child={child} plan={plan} sessions={data.sessions} assignment={data.assignment} teacher={data.teacher} today={today} activeToday={inProgress} variant={guided ? "guided" : "own"} />}>
        <div style={{ padding: "30px 32px", display: "flex", flexDirection: "column", gap: guided ? 20 : 16, minHeight: 0, flex: 1 }}>
          {guided ? (
            <>
              <Headline kicker={`${weekday} · day ${dayNumber} of ${week.target}`} title={title} size={50} />
              <TickSays>{tickLine}</TickSays>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 20, fontWeight: 600, lineHeight: 1.15 }}>Today&apos;s path</div>
                <StopPath stops={stops} />
              </div>
            </>
          ) : (
            <>
              <Headline kicker={`${weekday} · own plan`} title={`${capitalize(words(Math.round(totalSeconds / 60)))} minutes in ${keyName}`} size={44} />
              <QueueEditor child={child} plan={plan} session={activeSession} newTypes={everHadEar ? [] : ["ear"]} />
            </>
          )}
          <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 14, flex: "none" }}>
            <Button icon="play_arrow" onClick={() => void begin()} disabled={starting || (!next && !inProgress)}>{primaryLabel}</Button>
            {offerCheck && !inProgress ? (
              <>
                <Button variant="secondary" size="control" onClick={() => router.push("/skill-check")}>Take the skill check</Button>
                <Button variant="quiet" size="control" onClick={() => void notNow()}>Not now</Button>
              </>
            ) : (
              <Button variant="secondary" size="control" disabled={inProgress} onClick={toggleMode}>{guided ? "Change the plan" : "Back to guided"}</Button>
            )}
            <ActionNote>{child.settings.hardStop ? `Stops at ${child.settings.sessionMinutes} minutes unless you keep going.` : "Stop whenever you like — the timer just helps."}</ActionNote>
          </div>
        </div>
      </MainWithRail>
    </Screen>
  );
}
