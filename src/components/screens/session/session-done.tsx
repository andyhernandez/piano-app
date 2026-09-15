"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import type { BlockType, Child, Recording, Session } from "@/lib/types";
import { repo } from "@/lib/db/repo";
import { orderedBlocks } from "@/lib/engine/queue";
import { DISCIPLINE, fastestClean, fmtClock, weekCells, weekProgress } from "@/lib/engine/record";
import { parseDateKey, weekDays } from "@/lib/utils/date";
import { Button, Icon, LogTable, Panel, QueueRow, Screen, SectionLabel, StatTile, Waveform, WeekStrip, keyLabel } from "@/components/ds";
import { blockHeadline, capitalize, handsText, numberWord, ORDINAL, readingSpec, resultOf } from "./words";

export interface DoneResult { session: Session; child: Child }

const MONTHS = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** C3 — Session done. The facts of the session, what changed, the week, and a single way out. */
export function SessionDone({ result }: { result: DoneResult }) {
  const router = useRouter();
  const { session, child } = result;
  const [sessions, setSessions] = React.useState<Session[] | null>(null);
  const [teacher, setTeacher] = React.useState<string | null>(null);
  const [recording, setRecording] = React.useState<Recording | null>(null);

  React.useEffect(() => {
    let live = true;
    void repo.listSessions(child.id, 120).then((s) => { if (live) setSessions(s); });
    void repo.listTeachers().then((ts) => { if (live) setTeacher(ts.find((t) => t.childIds.includes(child.id))?.name ?? null); });
    const recId = session.blocks.map((b) => b.recordingId).filter((x): x is string => !!x).pop();
    if (recId) void repo.getRecording(recId).then((r) => { if (live && r) setRecording(r); });
    return () => { live = false; };
  }, [child.id, session.blocks]);

  const order = orderedBlocks(child);
  const results = session.blocks;
  const doneCount = results.filter((b) => b.completed).length;
  const plannedSec = session.plannedMinutes * 60;
  const overrunMin = Math.round((session.durationSec - plannedSec) / 60);
  const minutes = Math.round(session.durationSec / 60);

  const scales = resultOf(session, "scales");
  const reading = resultOf(session, "reading");
  const rhythm = resultOf(session, "rhythm");
  const cleanBpm = scales?.midiScore?.badge === "clean-scale" ? num(scales.details?.tempoBest) ?? num(scales.details?.bpm) : null;
  const previous = sessions ? sessions.filter((s) => s.id !== session.id) : [];
  const prevBest = fastestClean(previous);
  const newBest = cleanBpm != null && (prevBest == null || cleanBpm > prevBest);
  const readingLevel = num(reading?.details?.level) ?? child.settings.readingLevel;
  const readingHeld = reading?.midiScore?.badge === "no-stop-reading";
  const readingUp = !!reading?.details?.promoted;
  const aheadMs = num(rhythm?.details?.aheadMs) ?? (rhythm?.midiScore ? num(rhythm.midiScore.components.avgDeviationMs) : null);
  const finger = num(scales?.details?.unevenFinger);

  // Headline: the minutes, then the one fact worth leading with.
  let fact = `${capitalize(numberWord(doneCount))} of ${numberWord(order.length)} blocks played.`;
  if (cleanBpm != null) fact = `The scale was clean at ${cleanBpm} bpm.`;
  else if (finger != null) fact = `The scale is even except the ${ORDINAL[finger - 1]} finger.`;
  else if (readingUp) fact = `Reading moves up to level ${readingLevel}.`;
  else if (readingHeld) fact = `Reading level ${readingLevel} held.`;
  else if (aheadMs != null && aheadMs !== 0) fact = `Taps ran ${Math.abs(aheadMs)} ms ${aheadMs > 0 ? "ahead of" : "behind"} the click.`;
  const title = `${capitalize(numberWord(minutes))} minute${minutes === 1 ? "" : "s"}. ${fact}`;
  const lede = overrunMin > 0
    ? `You ran ${numberWord(overrunMin)} minute${overrunMin === 1 ? "" : "s"} past the timer. That's recorded as it happened.`
    : overrunMin < 0
      ? `You stopped ${numberWord(-overrunMin)} minute${overrunMin === -1 ? "" : "s"} short of the timer. That's recorded as it happened.`
      : "Right on the timer. That's recorded as it happened.";

  const rows = order.map((t, i) => {
    const r = results.find((b) => b.type === t);
    const h = r ? blockHeadline(r) : { text: "NOT PLAYED", marked: false };
    return { cells: [String(i + 1).padStart(2, "0"), r ? fmtClock(r.durationSec) : "—", DISCIPLINE[t].label, h.text], marked: h.marked };
  });

  const notes: { icon: string; tone: string; text: React.ReactNode }[] = [];
  if (cleanBpm != null) notes.push({ icon: "star", tone: "var(--kc-amber)", text: <><b>{cleanBpm} bpm clean</b> on {keyLabel(session.scale.key, session.scale.mode)}{newBest && prevBest != null ? ` — ${cleanBpm - prevBest} faster than your last best.` : newBest ? " — your first clean run on record." : "."}</> });
  if (readingUp) notes.push({ icon: "check", tone: "var(--kc-mint)", text: <>Level {readingLevel - 1} was clean twice. Reading moves to level {readingLevel}.</> });
  else if (readingHeld) notes.push({ icon: "check", tone: "var(--kc-mint)", text: <>You kept moving through level {readingLevel} without stopping to fix a note.</> });
  if (aheadMs != null && Math.abs(aheadMs) >= 25) notes.push({ icon: "error", tone: "var(--kc-clay)", text: <>Taps ran {Math.abs(aheadMs)} ms {aheadMs > 0 ? "ahead of" : "behind"} the click. Count the bar out loud before you start.</> });
  if (finger != null) notes.push({ icon: "error", tone: "var(--kc-clay)", text: <>The {ORDINAL[finger - 1]} finger lands later than its neighbours, in both octaves.</> });
  if (!notes.length) notes.push({ icon: "check", tone: "var(--kc-mint)", text: <>Nothing stood out today. The minutes are in the record.</> });

  // The week.
  const week = sessions ? sessions.filter((s) => weekDays(session.date).includes(s.date)) : [session];
  const days = weekCells(child, week, session.date);
  const wp = weekProgress(child, week, session.date);
  const todayIdx = weekDays(session.date).indexOf(session.date);
  const left = DAY_NAMES.filter((_, i) => i > todayIdx && !child.settings.restDays.includes(i));
  const need = wp.target - wp.played;
  const weekCopy = need <= 0
    ? `${capitalize(numberWord(wp.played))} of ${numberWord(wp.target)} days. That makes the week.`
    : need === 1 && left.length
      ? `${capitalize(numberWord(wp.played))} of ${numberWord(wp.target)} days. ${left.length === 1 ? left[0] : `${left.slice(0, -1).join(", ")} or ${left[left.length - 1]}`} makes the week.`
      : left.length >= need
        ? `${capitalize(numberWord(wp.played))} of ${numberWord(wp.target)} days. ${capitalize(numberWord(need))} more make the week.`
        : `${capitalize(numberWord(wp.played))} of ${numberWord(wp.target)} days this week.`;

  // What tomorrow leans on: the two weakest measured blocks.
  const lean = order
    .map((t) => ({ t, r: results.find((b) => b.type === t) }))
    .filter(({ r }) => r && !r.skipped && (r.midiScore || !r.completed))
    .sort((a, b) => (a.r?.midiScore?.score ?? 0) - (b.r?.midiScore?.score ?? 0))
    .slice(0, 2)
    .map(({ t, r }, i) => ({ index: i + 1, title: DISCIPLINE[t].title, detail: leanDetail(t, r?.details, readingLevel), duration: fmtClock(session.weights[t] * plannedSec) }));

  return (
    <Screen style={{ height: "100dvh", minHeight: 0, overflow: "hidden" }}>
      <div style={{ height: 72, flex: "none", borderBottom: "1px solid var(--kc-border)", display: "flex", alignItems: "center", gap: 22, padding: "0 34px" }}>
        <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em" }}>KeyCadence</span>
        <SectionLabel>SESSION DONE · {parseDateKey(session.date).getDate()} {MONTHS[parseDateKey(session.date).getMonth()]}</SectionLabel>
        <span style={{ marginLeft: "auto", fontSize: 14, color: "var(--kc-ink-dim)" }}>{child.name} · {session.mode ?? "guided"} · {numberWord(doneCount)} of {numberWord(order.length)} blocks</span>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "1fr 336px" }}>
        <div style={{ padding: "32px 34px", display: "flex", flexDirection: "column", gap: 22, minHeight: 0 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 38, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.05, maxWidth: 620 }}>{title}</h1>
            <p style={{ margin: "10px 0 0", fontSize: 17, lineHeight: 1.5, color: "var(--kc-ink-muted)", maxWidth: 620 }}>{lede}</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 14 }}>
            <StatTile label="TIME PLAYED" value={fmtClock(session.durationSec)} unit={`of ${session.plannedMinutes}`} />
            <StatTile label="READING LEVEL" value={readingLevel} unit={readingUp ? "up one" : readingHeld ? "held" : reading ? "played" : "—"} />
            <StatTile label="FASTEST CLEAN" value={cleanBpm ?? prevBest ?? "—"} unit={cleanBpm != null || prevBest != null ? "bpm" : undefined} delta={newBest && prevBest != null ? `+${cleanBpm! - prevBest}` : undefined} tone={newBest ? "amber" : "default"} />
            <StatTile label="AHEAD OF BEAT" value={aheadMs != null ? Math.abs(aheadMs) : "—"} unit={aheadMs != null ? (aheadMs < 0 ? "ms behind" : "ms") : undefined} tone={aheadMs != null && Math.abs(aheadMs) >= 25 ? "clay" : "default"} />
          </div>
          <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Panel style={{ gap: 11, minHeight: 0, overflow: "hidden" }}>
              <SectionLabel>BLOCK BY BLOCK</SectionLabel>
              <LogTable rows={rows} emphasize={2} />
            </Panel>
            <Panel style={{ minHeight: 0, overflow: "hidden" }}>
              <SectionLabel>WORTH SAYING OUT LOUD</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {notes.map((n, i) => (
                  <div key={i} style={{ display: "flex", gap: 11 }}>
                    <Icon name={n.icon} size={20} color={n.tone} />
                    <span style={{ fontSize: 15, lineHeight: 1.45, color: "var(--kc-ink-muted)" }}>{n.text}</span>
                  </div>
                ))}
              </div>
              {recording && <RecordingRow recording={recording} />}
            </Panel>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Button icon="check" onClick={() => router.push("/")}>Done</Button>
            <span style={{ marginLeft: "auto", fontSize: 14, color: "var(--kc-ink-faint)" }}>Saved to your record.</span>
          </div>
        </div>
        <div style={{ borderLeft: "1px solid var(--kc-border)", background: "var(--kc-panel)", padding: "32px 28px", display: "flex", flexDirection: "column", gap: 26, minHeight: 0, overflow: "auto" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <SectionLabel>THIS WEEK</SectionLabel>
            <WeekStrip days={days} target={child.settings.sessionMinutes} height={44} />
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45, color: "var(--kc-ink-dim)" }}>{weekCopy}</p>
          </div>
          {lean.length > 0 && (
            <div style={{ borderTop: "1px solid var(--kc-border)", paddingTop: 22, display: "flex", flexDirection: "column", gap: 11 }}>
              <SectionLabel>WHAT TOMORROW LEANS ON</SectionLabel>
              {lean.map((q) => <QueueRow key={q.index} index={q.index} title={q.title} detail={q.detail} duration={q.duration} draggable={false} menu={<span />} style={{ minHeight: 72, padding: "12px 16px" }} />)}
              {readingUp && <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45, color: "var(--kc-ink-dim)" }}>Reading starts at level {readingLevel} tomorrow.</p>}
            </div>
          )}
          {teacher && (
            <div style={{ marginTop: "auto", borderTop: "1px solid var(--kc-border)", paddingTop: 22, display: "flex", flexDirection: "column", gap: 10 }}>
              <SectionLabel>{teacher.toUpperCase()} SEES</SectionLabel>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45, color: "var(--kc-ink-muted)" }}>
                {[child.teacherShare?.log !== false && "minutes", child.teacherShare?.figures !== false && "levels", child.teacherShare?.recordings !== false && recording && "the recording"].filter(Boolean).map((s, i, a) => (i === 0 ? capitalize(String(s)) : i === a.length - 1 ? ` and ${s}` : `, ${s}`)).join("")}, on Monday morning. Nothing is sent that you turned off.
              </p>
            </div>
          )}
        </div>
      </div>
    </Screen>
  );
}

function leanDetail(t: BlockType, d: Record<string, unknown> | undefined, readingLevel: number): string {
  const bpm = num(d?.bpm);
  switch (t) {
    case "scales": {
      const f = num(d?.unevenFinger);
      return f != null ? `${capitalize(ORDINAL[f - 1])} finger, hands separately` : bpm ? `Evenness at ${bpm} bpm` : "Hands separately, then together";
    }
    case "rhythm": {
      const ahead = num(d?.aheadMs);
      return ahead != null && ahead !== 0 ? `${ahead > 0 ? "Ahead of" : "Behind"} the click${bpm ? `, at ${bpm} bpm` : ""}` : bpm ? `The click at ${bpm} bpm` : "Tap or play";
    }
    case "reading":
      return `Level ${readingLevel}, ${handsText(readingSpec(readingLevel).hands)}`;
    case "theory":
      return "Hear it, then find it";
    case "repertoire":
      return "Your piece, then a lead sheet";
    default:
      return "Backing loop";
  }
}

/** The session's recording: its own amplitude, and Play. */
function RecordingRow({ recording }: { recording: Recording }) {
  const [bars, setBars] = React.useState<number[] | null>(null);
  const [duration, setDuration] = React.useState<number | null>(null);
  const [playing, setPlaying] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  React.useEffect(() => {
    let live = true;
    const url = URL.createObjectURL(recording.blob);
    const el = new Audio(url);
    el.onended = () => setPlaying(false);
    audioRef.current = el;
    void (async () => {
      try {
        const ctx = new AudioContext();
        const buf = await ctx.decodeAudioData(await recording.blob.arrayBuffer());
        const data = buf.getChannelData(0);
        const n = 24;
        const step = Math.floor(data.length / n) || 1;
        const peaks = Array.from({ length: n }, (_, i) => {
          let m = 0;
          for (let j = i * step; j < Math.min(data.length, (i + 1) * step); j += 16) m = Math.max(m, Math.abs(data[j]));
          return m;
        });
        const top = Math.max(...peaks, 0.01);
        if (live) { setBars(peaks.map((p) => Math.round((p / top) * 100))); setDuration(buf.duration); }
        await ctx.close();
      } catch { /* the waveform is optional */ }
    })();
    return () => { live = false; el.pause(); URL.revokeObjectURL(url); };
  }, [recording]);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) { el.pause(); el.currentTime = 0; setPlaying(false); } else { void el.play(); setPlaying(true); }
  };

  return (
    <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
      <SectionLabel size="meta">YOUR RECORDING</SectionLabel>
      <Waveform bars={bars ?? Array.from({ length: 24 }, () => 8)} height={40} />
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontFamily: "var(--kc-font-mono)", fontSize: 15, color: "var(--kc-ink-dim)" }}>{recording.title ?? DISCIPLINE[recording.blockType].title}{duration != null ? ` · ${fmtClock(duration)}` : ""}</span>
        <Button variant="quiet" size="pill" icon={playing ? "stop" : "play_arrow"} onClick={toggle}>{playing ? "Stop" : "Play"}</Button>
      </div>
    </div>
  );
}
