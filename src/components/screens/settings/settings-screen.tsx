"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Screen, Panel, SectionLabel, Row, Choice, Toggle, Button, WeekStrip, Avatar, Pill } from "@/components/ds";
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

type Pref = InputMode | "auto";
const INPUT_LABELS: Record<Pref, string> = { auto: "Auto", midi: "MIDI keyboard", mic: "Microphone", timer: "Timer only" };
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const LENGTHS = [10, 20, 30];

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

  if (!child) return <Screen><AppHeader active="settings" /></Screen>;

  const s = child.settings;
  const set = (patch: Parameters<typeof updateSettings>[1]) => void updateSettings(child.id, patch);
  const lengthOptions = LENGTHS.includes(s.sessionMinutes) ? LENGTHS : [...LENGTHS, s.sessionMinutes].sort((a, b) => a - b);
  const days = weekCells(child, sessions, today);
  const toggleRest = (i: number) => {
    const rest = s.restDays.includes(i) ? s.restDays.filter((d) => d !== i) : [...s.restDays, i].sort();
    set({ restDays: rest, practiceDaysPerWeek: 7 - rest.length });
  };
  const setVolume = (v: number) => { audio.setVolume(v); setSound((o) => ({ volume: v, accent: o?.accent ?? true })); void repo.setKV("sound.volume", v); };
  const setAccent = (a: boolean) => { setSound((o) => ({ volume: o?.volume ?? 0.8, accent: a })); void repo.setKV("sound.accent", a); };
  const weeks = Math.max(0, Math.floor(daysBetween(dateKey(new Date(child.createdAt)), today) / 7));
  const profileAge = child.skillProfile ? daysBetween(dateKey(new Date(child.skillProfile.assessedAt)), today) : null;

  const rail = (
    <div style={{ display: "flex", flexDirection: "column", gap: 22, minHeight: 0 }}>
      <Panel padding="panel">
        <SectionLabel>WEEKLY TARGET</SectionLabel>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontFamily: "var(--kc-font-mono)", fontSize: 32, color: "var(--kc-mint)" }}>{s.practiceDaysPerWeek}</span>
          <span style={{ fontSize: 15, color: "var(--kc-ink-dim)" }}>days a week</span>
        </div>
        <WeekStrip days={days} target={s.sessionMinutes} height={40} onDay={locked ? undefined : toggleRest} />
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45, color: "var(--kc-ink-dim)" }}>{restSentence(s.restDays)} A missed day is a fact, not a failure — tap a day to plan it off.</p>
      </Panel>
      <Panel padding="panel">
        <SectionLabel>PROFILE</SectionLabel>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Avatar initial={child.name.slice(0, 1).toUpperCase()} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{child.name}</div>
            <div style={{ fontFamily: "var(--kc-font-mono)", fontSize: 12, color: "var(--kc-ink-faint)" }}>
              {(child.ageBand === "adult" ? "ADULT" : "CHILD")} · LEVEL {s.readingLevel} · {weeks} WEEK{weeks === 1 ? "" : "S"}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button variant="secondary" size="control" onClick={() => router.push("/skill-check")}>{child.skillProfile ? "Retake skill check" : "Take the skill check"}</Button>
          <Button variant="quiet" size="control" onClick={() => router.push("/household")}>Household</Button>
        </div>
        {profileAge != null && <span style={{ fontSize: 13, color: "var(--kc-ink-faint)" }}>Last checked {profileAge === 0 ? "today" : `${profileAge} day${profileAge === 1 ? "" : "s"} ago`}.</span>}
      </Panel>
      <Panel padding="panel" style={{ marginTop: "auto" }}>
        <SectionLabel>YOUR RECORDINGS AND LOG</SectionLabel>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45, color: "var(--kc-ink-dim)" }}>
          <span style={{ fontFamily: "var(--kc-font-mono)", color: "var(--kc-ink)" }}>{sessions.length}</span> session{sessions.length === 1 ? "" : "s"} and <span style={{ fontFamily: "var(--kc-font-mono)", color: "var(--kc-ink)" }}>{recordings}</span> recording{recordings === 1 ? "" : "s"} on this device. Everything stays here unless sync is on. Deleting the app deletes the log with it.
        </p>
        <Button variant="secondary" size="control" onClick={() => router.push("/household")}>Open the household</Button>
      </Panel>
    </div>
  );

  return (
    <Screen>
      <AppHeader active="settings" />
      <div style={{ flex: 1, minHeight: 0, padding: "32px 36px", display: "grid", gridTemplateColumns: "minmax(0, 1fr) 340px", gap: 26, overflow: "hidden" }}>
        {locked ? (
          <CodePrompt title="Settings sit behind the household code" lede="Mode, weekly target and the teacher link are the household's to change. Practising never asks for the code." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 18, minHeight: 0, overflowY: "auto", paddingRight: 2 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 34, fontWeight: 600, letterSpacing: "-0.03em" }}>Settings</h1>
              <p style={{ margin: "8px 0 0", fontSize: 15, color: "var(--kc-ink-muted)", maxWidth: 520 }}>{child.name}&apos;s profile. Every setting here can be changed back, and nothing you change deletes what already happened.</p>
            </div>

            <Panel padding="panel">
              <SectionLabel>THE SESSION</SectionLabel>
              <div>
                <Row title="Mode" detail="Guided shows one next action. Own plan shows the whole queue and the numbers.">
                  <Choice options={["guided", "own"] as const} value={s.mode} onChange={(v) => set({ mode: v })} labels={{ guided: "Guided", own: "Own plan" }} />
                </Row>
                <Row title="Session length" detail="The engine fits the six disciplines into whatever you pick.">
                  <Choice options={lengthOptions.map(String)} value={String(s.sessionMinutes)} onChange={(v) => set({ sessionMinutes: Number(v) })} labels={Object.fromEntries(lengthOptions.map((m) => [String(m), `${m} min`]))} />
                </Row>
                <Row title="Hard stop" detail={s.hardStop ? "Practice ends at the length above." : "The timer keeps counting; nothing interrupts."}>
                  <Toggle checked={s.hardStop} onChange={(v) => set({ hardStop: v })} label="Hard stop" />
                </Row>
                <Row title="Count-in" detail="Two bars of click before an exercise that measures timing." last>
                  <Toggle checked={s.countIn} onChange={(v) => set({ countIn: v })} label="Count-in" />
                </Row>
              </div>
            </Panel>

            <Panel padding="panel">
              <SectionLabel>WHAT THE APP LISTENS TO</SectionLabel>
              <div>
                <Row title="Input" detail="A MIDI keyboard hears every note. The microphone hears timing. The timer just counts. Auto picks the best one it finds.">
                  <Choice options={["auto", "midi", "mic", "timer"] as const} value={s.inputModePreference} onChange={(v) => set({ inputModePreference: v })} labels={INPUT_LABELS} />
                </Row>
                <Row title="Microphone" detail={s.micCalibration ? <>Calibrated. Noise floor <span style={{ fontFamily: "var(--kc-font-mono)" }}>{s.micCalibration.noiseFloor.toFixed(4)}</span>, confidence <span style={{ fontFamily: "var(--kc-font-mono)" }}>{s.micCalibration.confidenceThreshold.toFixed(2)}</span>. Measure again if the room changes.</> : "Not calibrated. Three seconds of quiet teaches the app what the room sounds like."} last={!calibrating}>
                  {s.micCalibration ? <Pill tone="mint" icon="check">CALIBRATED</Pill> : <Pill>NOT YET</Pill>}
                  <Button size="control" variant="secondary" onClick={() => setCalibrating((c) => !c)}>{s.micCalibration ? "Measure again" : "Calibrate"}</Button>
                </Row>
                {calibrating && <div style={{ paddingTop: 16 }}><MicCalibrationPanel childId={child.id} onClose={() => setCalibrating(false)} /></div>}
                {nativeMidiAvailable() && (
                  <Row title="Bluetooth keyboard" detail="A USB keyboard is heard as soon as it is plugged in. A Bluetooth one pairs once through Apple's sheet." last>
                    <Button size="control" variant="secondary" icon="bluetooth" onClick={() => void pairBluetoothKeyboard()}>Pair</Button>
                  </Row>
                )}
              </div>
            </Panel>

            <Panel padding="panel">
              <SectionLabel>LEVELS</SectionLabel>
              <div>
                <Row title="Sight reading" detail="Ten levels. Three clean runs at a level moves it up on its own; set it by hand after a lesson.">
                  <Stepper value={s.readingLevel} min={1} max={10} onChange={(v) => set({ readingLevel: v, noStopStreak: 0 })} label="Reading level" />
                </Row>
                <Row title="Timing" detail="Ten levels of rhythm patterns, from quarters to dotted figures.">
                  <Stepper value={s.rhythmLevel} min={1} max={10} onChange={(v) => set({ rhythmLevel: v })} label="Timing level" />
                </Row>
                <Row title="Harmony" detail="Five levels: primary triads first, then the rest of the key, then sevenths." last>
                  <Stepper value={s.theoryLevel} min={1} max={5} onChange={(v) => set({ theoryLevel: v })} label="Harmony level" />
                </Row>
              </div>
            </Panel>

            <Panel padding="panel">
              <SectionLabel>SOUND</SectionLabel>
              <div>
                <Row title="Volume" detail="The piano, the click and the backing loops together.">
                  <Stepper value={Math.round((sound?.volume ?? 0.8) * 100)} min={0} max={100} step={10} onChange={(v) => setVolume(v / 100)} format={(v) => `${v}%`} label="Volume" width={56} />
                </Row>
                <Row title="Metronome accent" detail={sound?.accent === false ? "Every click the same." : "The first beat of the bar is louder."} last>
                  <Toggle checked={sound?.accent !== false} onChange={setAccent} label="Metronome accent" />
                </Row>
              </div>
            </Panel>

            <SyncPanel />
          </div>
        )}
        {rail}
      </div>
    </Screen>
  );
}
