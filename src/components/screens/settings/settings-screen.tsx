"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { openSkillCheck } from "../skill-check/open";
import { Screen, Panel, SectionLabel, Row, Choice, Toggle, Button, WeekKeys, Avatar, Pill, Rail, RailSection, Small } from "@/components/ds";
import { useAppStore, useActiveChild } from "@/lib/store/app-store";
import { useAudio } from "@/lib/hooks/use-audio";
import { repo } from "@/lib/db/repo";
import { weekCells } from "@/lib/engine/record";
import { dateKey, daysBetween } from "@/lib/utils/date";
import type { InputMode, Session } from "@/lib/types";
import { AppHeader } from "../today/app-header";
import { CodePrompt, useCodeLocked } from "../household/code-gate";
import { Stepper } from "./stepper";
import { MicCalibrationPanel } from "./mic-calibration";
import { nativeMidiAvailable, pairBluetoothKeyboard } from "@/lib/input/native-midi";
import { SyncPanel } from "./sync-panel";
import { dayMonth } from "../today/words";

type Pref = InputMode | "auto";
const INPUT_LABELS: Record<Pref, string> = { auto: "Auto", midi: "Keys", mic: "Mic", timer: "Timer" };
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const RETAKE_DAYS = 28;

function restSentence(rest: number[]): string {
  const names = rest.slice().sort().map((i) => DAY_NAMES[i]).filter(Boolean);
  if (!names.length) return "No rest days planned.";
  if (names.length === 1) return `${names[0]} is a rest day.`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]} are rest days.`;
}

export function SettingsScreen() {
  const router = useRouter();
  const child = useActiveChild();
  const parent = useAppStore((s) => s.parent);
  const children = useAppStore((s) => s.children);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const locked = useCodeLocked("settings");
  const { audio } = useAudio();
  const [today] = React.useState(() => dateKey());
  const [calibrating, setCalibrating] = React.useState(false);
  const [sessions, setSessions] = React.useState<Session[]>([]);
  const [recordings, setRecordings] = React.useState(0);
  const [sound, setSound] = React.useState<{ volume: number; accent: boolean } | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!parent || children.length === 0) router.replace("/onboarding");
  }, [parent, children.length, router]);

  React.useEffect(() => {
    if (!child) return;
    let cancelled = false;
    void Promise.all([repo.listSessions(child.id, 500), repo.listRecordings(child.id)]).then(([s, r]) => { if (!cancelled) { setSessions(s); setRecordings(r.length); } });
    return () => { cancelled = true; };
  }, [child]);

  React.useEffect(() => {
    let cancelled = false;
    void Promise.all([repo.getKV<number>("sound.volume"), repo.getKV<boolean>("sound.accent")]).then(([v, a]) => {
      if (!cancelled) setSound({ volume: typeof v === "number" ? v : 0.8, accent: a !== false });
    });
    return () => { cancelled = true; };
  }, []);

  const right = parent?.pin && !locked ? <Pill tone="mint" icon="check">Code entered</Pill> : undefined;

  if (!child) return <Screen><AppHeader active="settings" right={right} /></Screen>;

  const s = child.settings;
  const set = (patch: Parameters<typeof updateSettings>[1]) => void updateSettings(child.id, patch);
  const days = weekCells(child, sessions, today).map((d) => ({ letter: d.letter, minutes: d.state === "played" || d.state === "playing" ? d.minutes : undefined, today: d.state === "today" || d.state === "playing", rest: d.state === "rest" }));
  const toggleRest = (i: number) => {
    const rest = s.restDays.includes(i) ? s.restDays.filter((d) => d !== i) : [...s.restDays, i].sort();
    set({ restDays: rest, practiceDaysPerWeek: 7 - rest.length });
  };
  const setVolume = (v: number) => { audio.setVolume(v); setSound((o) => ({ volume: v, accent: o?.accent ?? true })); void repo.setKV("sound.volume", v); };
  const setAccent = (a: boolean) => { setSound((o) => ({ volume: o?.volume ?? 0.8, accent: a })); void repo.setKV("sound.accent", a); };
  const profileAge = child.skillProfile ? daysBetween(dateKey(new Date(child.skillProfile.assessedAt)), today) : null;
  const retakeDue = child.skillProfile ? new Date(new Date(child.skillProfile.assessedAt).getTime() + RETAKE_DAYS * 86_400_000).toISOString() : null;

  const exportLog = () => {
    const payload = { player: child.name, exportedAt: new Date().toISOString(), settings: s, sessions: sessions.map((x) => ({ date: x.date, startedAt: x.startedAt, minutes: Math.round(x.durationSec / 60), completed: x.completed, scale: x.scale, blocks: x.blocks.map((b) => ({ type: b.type, minutes: Math.round(b.durationSec / 60), completed: b.completed, skipped: b.skipped, score: b.midiScore?.score ?? null, badge: b.midiScore?.badge ?? null, details: b.details ?? null })) })) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url; a.download = `${child.name.toLowerCase()}-practice-log.json`; a.click();
    URL.revokeObjectURL(url);
  };
  const deleteEverything = async () => {
    setBusy(true);
    await repo.nuke();
    useAppStore.setState({ parent: null, children: [], activeChildId: null, activeSession: null, plan: null, parentUnlocked: false });
    router.replace("/onboarding");
  };

  const rail = (
    <Rail>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Avatar initial={child.name.slice(0, 1).toUpperCase()} active size={56} />
        <div>
          <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 22, fontWeight: 600, lineHeight: 1.15 }}>{child.name}</div>
          <Small>{child.ageBand === "adult" ? "Adult" : "Under thirteen"} · since {dayMonth(child.createdAt)}</Small>
        </div>
      </div>
      <RailSection label="Weekly target" right={`${s.practiceDaysPerWeek} days a week`}>
        <WeekKeys days={days} target={s.sessionMinutes} height={64} onDay={locked ? undefined : toggleRest} />
        <Small>{restSentence(s.restDays)} Tap a day to plan it off.</Small>
      </RailSection>
      <Panel tone="indigo">
        <SectionLabel size="title">Skill check</SectionLabel>
        <Small>
          {child.skillProfile && retakeDue
            ? `Last taken ${dayMonth(child.skillProfile.assessedAt)}. ${profileAge != null && profileAge >= RETAKE_DAYS ? "A new one is due" : `Next one is due ${dayMonth(retakeDue)}`} — or take it now.`
            : "Not taken yet. Five short parts set where every stop starts."}
        </Small>
        <div><Button variant="secondary" size="pill" icon="replay" onClick={() => openSkillCheck(router.push)}>{child.skillProfile ? "Take it again" : "Take the skill check"}</Button></div>
      </Panel>
      <SyncPanel />
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        <SectionLabel size="title">Your recordings and log</SectionLabel>
        <Small>{sessions.length} session{sessions.length === 1 ? "" : "s"} and {recordings} recording{recordings === 1 ? "" : "s"} on this device.</Small>
        {confirmDelete ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Small color="var(--kc-indigo-shadow)">Every profile, the log, recordings, the code and the sync settings. This cannot be undone; a synced copy on another device stays.</Small>
            <div style={{ display: "flex", gap: 8 }}>
              <Button size="pill" variant="secondary" icon="delete" onClick={() => void deleteEverything()} disabled={busy}>Yes, delete everything</Button>
              <Button size="pill" variant="quiet" onClick={() => setConfirmDelete(false)} disabled={busy}>Keep it</Button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <Button size="pill" variant="secondary" icon="download" onClick={exportLog} style={{ height: 44 }}>Export</Button>
            <Button size="pill" variant="quiet" onClick={() => setConfirmDelete(true)}>Delete all</Button>
          </div>
        )}
      </div>
    </Rail>
  );

  const card = (title: string, children: React.ReactNode) => (
    <Panel style={{ padding: "18px 22px", gap: 0, minHeight: 0, overflowY: "auto" }}>
      <SectionLabel size="title">{title}</SectionLabel>
      {children}
    </Panel>
  );

  return (
    <Screen>
      <AppHeader active="settings" right={right} />
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "minmax(0, 1fr) 340px" }}>
        {locked ? (
          <CodePrompt title="Settings sit behind the household code" lede="Mode, weekly target and the teacher link are the household’s to change. Practising never asks for the code." />
        ) : (
          <div style={{ padding: "28px 32px", display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: 16, minHeight: 0, overflowY: "auto" }}>
            {card("The session", (
              <>
                <Row title="Mode">
                  <Choice options={["guided", "own"] as const} value={s.mode} onChange={(v) => set({ mode: v })} labels={{ guided: "Guided", own: "Own plan" }} />
                </Row>
                <Row title="Length">
                  <Stepper value={s.sessionMinutes} min={5} max={60} step={5} onChange={(v) => set({ sessionMinutes: v })} format={(v) => `${v} min`} label="Session length" />
                </Row>
                <Row title="Hard stop" detail={s.hardStop ? "Ends at the length above." : "The timer keeps counting; nothing interrupts."}>
                  <Toggle checked={s.hardStop} onChange={(v) => set({ hardStop: v })} label="Hard stop" />
                </Row>
                <Row title="Count-in" detail="Two bars of click first." last>
                  <Toggle checked={s.countIn} onChange={(v) => set({ countIn: v })} label="Count-in" />
                </Row>
              </>
            ))}
            {card("What the app listens to", (
              <>
                <Row title="Input" detail="Auto picks the best one it finds.">
                  <Choice options={["auto", "midi", "mic", "timer"] as const} value={s.inputModePreference} onChange={(v) => set({ inputModePreference: v })} labels={INPUT_LABELS} />
                </Row>
                <Row title="Microphone" detail={s.micCalibration ? "Calibrated. Measure again if the room changes." : "Not calibrated. Three seconds of quiet teaches it the room."} last={!calibrating && !nativeMidiAvailable()}>
                  <Button size="pill" variant="secondary" onClick={() => setCalibrating((c) => !c)} style={{ height: 44 }}>{s.micCalibration ? "Measure again" : "Calibrate"}</Button>
                </Row>
                {calibrating && <div style={{ padding: "12px 0" }}><MicCalibrationPanel childId={child.id} onClose={() => setCalibrating(false)} /></div>}
                {nativeMidiAvailable() && (
                  <Row title="Bluetooth keyboard" detail="Pair once through the iPad’s sheet." last>
                    <Button size="pill" variant="secondary" icon="bluetooth" onClick={() => void pairBluetoothKeyboard()} style={{ height: 44 }}>Pair</Button>
                  </Row>
                )}
              </>
            ))}
            {card("Levels", (
              <>
                <Row title="Sight reading" detail="Moves up after two clean runs.">
                  <Stepper value={s.readingLevel} min={1} max={10} onChange={(v) => set({ readingLevel: v, noStopStreak: 0 })} label="Reading level" />
                </Row>
                <Row title="Timing" detail="Quarters to dotted figures.">
                  <Stepper value={s.rhythmLevel} min={1} max={10} onChange={(v) => set({ rhythmLevel: v })} label="Timing level" />
                </Row>
                <Row title="Harmony" detail="Primary triads first." last>
                  <Stepper value={s.theoryLevel} min={1} max={5} onChange={(v) => set({ theoryLevel: v })} label="Harmony level" />
                </Row>
              </>
            ))}
            {card("Sound", (
              <>
                <Row title="Volume" detail="Piano, click and loops together.">
                  <Stepper value={Math.round((sound?.volume ?? 0.8) * 100)} min={0} max={100} step={10} onChange={(v) => setVolume(v / 100)} format={(v) => `${v}%`} label="Volume" />
                </Row>
                <Row title="Metronome accent" detail={sound?.accent === false ? "Every click the same." : "First beat of the bar is louder."} last>
                  <Toggle checked={sound?.accent !== false} onChange={setAccent} label="Metronome accent" />
                </Row>
              </>
            ))}
          </div>
        )}
        {rail}
      </div>
    </Screen>
  );
}
