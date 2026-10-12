"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import type { BlockResult, BlockType, Child, Recording, Session } from "@/lib/types";
import { repo } from "@/lib/db/repo";
import { orderedBlocks, STOP_ICON, STOP_SHORT } from "@/lib/engine/queue";
import { fastestClean, fmtClock, weekCells, weekProgress } from "@/lib/engine/record";
import { parseDateKey, weekDays } from "@/lib/utils/date";
import { Button, Icon, IconButton, Logo, Panel, Pill, Rail, RailSection, Screen, Small, StopPath, Tick, Waveform, WeekKeys, Headline, keyLabel, type Stop } from "@/components/ds";
import { blockHeadline, capitalize, numberWord, ORDINAL } from "./words";

export interface DoneResult { session: Session; child: Child }

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

interface Sticker { tone: "sun" | "mint"; icon: string; title: string; sub: string }

/** D8 — Session done. Tick cheers, the path is lit, the stickers are only the ones really earned today. */
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
  const minutes = Math.max(1, Math.round(session.durationSec / 60));
  const keyName = keyLabel(session.scale.key, session.scale.mode);

  const of = (t: BlockType) => results.find((b) => b.type === t);
  const scales = of("scales");
  const reading = of("reading");
  const rhythm = of("rhythm");
  const cleanBpm = scales?.midiScore?.badge === "clean-scale" ? num(scales.details?.tempoBest) ?? num(scales.details?.bpm) : null;
  const previous = sessions ? sessions.filter((s) => s.id !== session.id) : [];
  const prevBest = fastestClean(previous);
  const newBest = sessions !== null && cleanBpm != null && (prevBest == null || cleanBpm > prevBest);
  const readingLevel = num(reading?.details?.level) ?? child.settings.readingLevel;
  const readingHeld = reading?.midiScore?.badge === "no-stop-reading";
  const readingUp = !!reading?.details?.promoted;
  const aheadMs = num(rhythm?.details?.aheadMs) ?? (rhythm?.midiScore ? num(rhythm.midiScore.components.avgDeviationMs) : null);
  const finger = num(scales?.details?.unevenFinger);
  const steady = rhythm?.midiScore?.badge === "steady-pulse";
  const overrunBlock = results.filter((b) => b.durationSec > b.plannedSec + 90).sort((a, b) => (b.durationSec - b.plannedSec) - (a.durationSec - a.plannedSec))[0];

  const title = doneCount >= order.length
    ? `All ${numberWord(order.length)} stops — ${numberWord(minutes)} minute${minutes === 1 ? "" : "s"}.`
    : `${capitalize(numberWord(doneCount))} of ${numberWord(order.length)} stops — ${numberWord(minutes)} minute${minutes === 1 ? "" : "s"}.`;
  const lede = overrunBlock
    ? `You kept going ${numberWord(Math.round((overrunBlock.durationSec - overrunBlock.plannedSec) / 60))} minute${Math.round((overrunBlock.durationSec - overrunBlock.plannedSec) / 60) === 1 ? "" : "s"} past the timer on ${STOP_SHORT[overrunBlock.type].toLowerCase()}. That's in the record too.`
    : overrunMin > 0
      ? `You ran ${numberWord(overrunMin)} minute${overrunMin === 1 ? "" : "s"} past the timer. That's in the record too.`
      : overrunMin < 0
        ? `You stopped ${numberWord(-overrunMin)} minute${overrunMin === -1 ? "" : "s"} short of the timer. That's recorded as it happened.`
        : "Right on the timer. That's recorded as it happened.";

  const stops: Stop[] = order.map((t, i) => {
    const r = results.find((b) => b.type === t && (b.slot === undefined || b.slot === i));
    const best = t === "scales" && newBest;
    return { icon: best ? "star" : STOP_ICON[t], name: STOP_SHORT[t], detail: stopResult(t, r, cleanBpm, newBest), state: !r ? "upcoming" : r.skipped ? "upcoming" : best ? "best" : "done" };
  });

  const stickers: Sticker[] = [];
  if (newBest && cleanBpm != null) stickers.push({ tone: "sun", icon: "star", title: `New best: ${cleanBpm} bpm`, sub: prevBest != null ? `${keyName} scale, ${cleanBpm - prevBest} faster than before` : `${keyName} scale, your first clean run on record` });
  else if (cleanBpm != null) stickers.push({ tone: "mint", icon: "check_circle", title: "Clean scale", sub: `Every note even at ${cleanBpm} bpm` });
  if (steady) stickers.push({ tone: "mint", icon: "favorite", title: "Steady pulse", sub: aheadMs != null && aheadMs !== 0 ? `Every tap landed, ${Math.abs(aheadMs)} ms ${aheadMs > 0 ? "ahead" : "behind"}` : "Every tap landed on the click" });
  if (readingUp) stickers.push({ tone: "sun", icon: "arrow_upward", title: `Reading level ${readingLevel}`, sub: `Level ${readingLevel - 1} was clean twice` });
  else if (readingHeld) stickers.push({ tone: "mint", icon: "favorite", title: "Steady to the end", sub: "Didn't stop to fix a note" });
  const ear = of("ear");
  const phrases = num(ear?.details?.phrases);
  const byEar = num(ear?.details?.byEarFirstTry);
  if (phrases && byEar === phrases) stickers.push({ tone: "mint", icon: "hearing", title: `${capitalize(numberWord(phrases))} of ${numberWord(phrases)} by ear`, sub: "Every phrase on the first try" });

  // Try next time.
  let tryNext: string | null = null;
  if (aheadMs != null && Math.abs(aheadMs) >= 25) tryNext = `Count the bar out loud before you start — taps ran ${Math.abs(aheadMs)} ms ${aheadMs > 0 ? "ahead of" : "behind"} the click.`;
  else if (finger != null) tryNext = `The ${ORDINAL[finger - 1]} finger lands later than its neighbours, in both octaves. Hands separately, slowly, tomorrow.`;
  else if (cleanBpm != null) tryNext = `The scale was clean at ${cleanBpm} bpm. Same tempo again tomorrow — not faster — then four clicks up.`;
  else if (reading && !readingHeld) tryNext = `Keep going through mistakes on the reading page. One clean run at level ${readingLevel} is the next step.`;

  // The week.
  const week = sessions ? sessions.filter((s) => weekDays(session.date).includes(s.date)) : [session];
  const cells = weekCells(child, week, session.date);
  const days = cells.map((d) => ({ letter: d.letter, minutes: d.state === "played" || d.state === "playing" ? d.minutes : undefined, today: d.state === "today" || d.state === "playing", rest: d.state === "rest" }));
  const wp = weekProgress(child, week, session.date);
  const todayIdx = weekDays(session.date).indexOf(session.date);
  const left = DAY_NAMES.filter((_, i) => i > todayIdx && !child.settings.restDays.includes(i));
  const need = wp.target - wp.played;
  const weekCopy = need <= 0
    ? "The whole week's lit. Every key played."
    : need === 1 && left.length
      ? `One more key — ${left.length === 1 ? left[0] : `${left.slice(0, -1).join(", ")} or ${left[left.length - 1]}`} — and the whole week's lit.`
      : left.length >= need
        ? `${capitalize(numberWord(need))} more keys light up the octave.`
        : `${capitalize(numberWord(wp.played))} of ${numberWord(wp.target)} days this week.`;

  const date = parseDateKey(session.date);
  const dateText = `${date.toLocaleDateString("en-US", { weekday: "long" })} ${date.getDate()} ${date.toLocaleDateString("en-US", { month: "long" })}`;
  const shared = [child.teacherShare?.log !== false && "your minutes", child.teacherShare?.figures !== false && "the levels", child.teacherShare?.recordings !== false && recording && "this clip"].filter(Boolean) as string[];

  return (
    <Screen style={{ height: "100dvh", minHeight: 0, overflow: "hidden" }}>
      <div style={{ height: 78, flex: "none", borderBottom: "2px solid var(--kc-hairline)", background: "var(--kc-panel)", display: "flex", alignItems: "center", gap: 22, padding: "0 30px" }}>
        <Logo href={null} />
        <Pill tone="mint" icon="check_circle">{capitalize(numberWord(doneCount))} of {numberWord(order.length)} stops</Pill>
        <span style={{ marginLeft: "auto", fontSize: 15, fontWeight: 700, color: "var(--kc-ink-faint)" }}>{dateText}</span>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "minmax(0, 1fr) 340px" }}>
        <div style={{ padding: "30px 32px", display: "flex", flexDirection: "column", gap: 20, minHeight: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 18 }}>
            <Tick mood="cheer" />
            <div style={{ flex: 1 }}>
              <Headline title={title} lede={lede} size={48} />
            </div>
          </div>
          <StopPath stops={stops} done />
          {stickers.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 20, fontWeight: 600, lineHeight: 1.15 }}>Stickers from today</div>
              <div style={{ display: "flex", gap: 16 }}>
                {stickers.slice(0, 3).map((s, i) => (
                  <div key={s.title} style={{ flex: 1, display: "flex", alignItems: "center", gap: 14, background: s.tone === "sun" ? "var(--kc-sun)" : "var(--kc-mint)", borderRadius: 22, padding: "16px 18px", transform: `rotate(${i % 2 ? 1.5 : -2}deg)`, boxShadow: s.tone === "sun" ? "var(--kc-shadow-press-sun)" : "0 4px 0 0 #04a37a" }}>
                    <span style={{ width: 52, height: 52, flex: "none", borderRadius: "50%", background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon name={s.icon} size={30} color={s.tone === "sun" ? "#b37a00" : "var(--kc-mint-ink)"} />
                    </span>
                    <div>
                      <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 22, fontWeight: 600, lineHeight: 1.15 }}>{s.title}</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: s.tone === "sun" ? "#5c3e00" : "#03402f" }}>{s.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: "auto" }}>
            <Button icon="check" onClick={() => router.push("/")}>Save and finish</Button>
            <span style={{ marginLeft: "auto", fontSize: 14, fontWeight: 700, color: "var(--kc-ink-faint)", maxWidth: 260, textAlign: "right" }}>Already in your record. Tomorrow&apos;s path leans on today.</span>
          </div>
        </div>
        <Rail>
          <RailSection label="This week" right={`${wp.played} of ${wp.target} days`}>
            <WeekKeys days={days} target={child.settings.sessionMinutes} />
            <Small>{weekCopy}</Small>
          </RailSection>
          {tryNext && (
            <Panel tone="indigo">
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--kc-font-display)", fontSize: 17, fontWeight: 600, color: "var(--kc-indigo-shadow)" }}>
                <Icon name="lightbulb" size={22} />
                Try next time
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.4 }}>{tryNext}</div>
            </Panel>
          )}
          {recording && <RecordingRow recording={recording} />}
          {teacher && (
            <Small color="var(--kc-ink-faint)" style={{ marginTop: "auto" }}>
              {teacher} sees {shared.length ? shared.map((s, i, a) => (i === 0 ? s : i === a.length - 1 ? ` and ${s}` : `, ${s}`)).join("") : "nothing"} on Monday — only what you turned on.
            </Small>
          )}
        </Rail>
      </div>
    </Screen>
  );
}

/** The short result under a lit stop: "Even!", "22 ms early", "5 of 5 by ear", "Level 4", "Just for fun". */
function stopResult(t: BlockType, r: BlockResult | undefined, cleanBpm: number | null, newBest: boolean): string {
  if (!r) return "Not played";
  if (r.skipped) return "Skipped";
  const d = r.details ?? {};
  switch (t) {
    case "scales": {
      if (newBest && cleanBpm != null) return `${cleanBpm} bpm!`;
      if (r.midiScore?.badge === "clean-scale") return "Even!";
      const bpm = num(d.tempoBest) ?? num(d.bpm);
      return bpm ? `${bpm} bpm` : "Played";
    }
    case "rhythm": {
      const ahead = num(d.aheadMs);
      if (ahead != null && ahead !== 0) return `${Math.abs(ahead)} ms ${ahead > 0 ? "early" : "late"}`;
      return r.midiScore?.badge === "steady-pulse" ? "Steady!" : "Played";
    }
    case "ear": {
      const phrases = num(d.phrases);
      const byEar = num(d.byEarFirstTry);
      return phrases ? `${byEar ?? 0} of ${phrases} by ear` : "Played";
    }
    case "reading": {
      const level = num(d.level);
      return level != null ? `Level ${level}${d.promoted ? " up!" : ""}` : "Played";
    }
    case "theory": {
      const asked = num(d.asked);
      const right = num(d.right);
      return asked ? `${right ?? 0} of ${asked}` : "Played";
    }
    case "improv":
      return "Just for fun";
    default:
      return blockHeadline(r).text.toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
  }
}

/** The session's recording: a round play button, its own amplitude, and the length. */
function RecordingRow({ recording }: { recording: Recording }) {
  const [bars, setBars] = React.useState<number[] | null>(null);
  const [duration, setDuration] = React.useState<number | null>(null);
  const [playing, setPlaying] = React.useState(false);
  const [position, setPosition] = React.useState(0);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  React.useEffect(() => {
    let live = true;
    const url = URL.createObjectURL(recording.blob);
    const el = new Audio(url);
    el.onended = () => { setPlaying(false); setPosition(0); };
    el.ontimeupdate = () => { if (el.duration) setPosition(el.currentTime / el.duration); };
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
    if (playing) { el.pause(); el.currentTime = 0; setPlaying(false); setPosition(0); } else { void el.play(); setPlaying(true); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 18, fontWeight: 600, lineHeight: 1.15 }}>{recording.title ?? "Your recording"}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--kc-base)", border: "2px solid var(--kc-hairline)", borderRadius: 18, padding: "12px 14px" }}>
        <IconButton icon={playing ? "stop" : "play_arrow"} variant="primary" label={playing ? "Stop" : "Play"} onClick={toggle} />
        <Waveform bars={bars ?? Array.from({ length: 24 }, () => 20)} height={36} split={playing ? position : 1} />
        <span style={{ fontSize: 14, fontWeight: 800, color: "var(--kc-ink-faint)" }}>{duration != null ? fmtClock(duration).replace(/^0/, "") : ""}</span>
      </div>
    </div>
  );
}
