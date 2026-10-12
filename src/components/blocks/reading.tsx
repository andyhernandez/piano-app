"use client";
import * as React from "react";
import type { BlockProps } from "./types";
import type { MidiScore, NoteEvent } from "@/lib/types";
import type { NoteState, StaffRegion } from "@/components/ds";
import { BottomBar, Button, CheckItem, Instruction, Panel, Pill, SheetPanel, Staff, StatChip, Tempo, exerciseToLines, keyLabel } from "@/components/ds";
import { useAudio } from "@/lib/hooks/use-audio";
import { useInput } from "@/lib/hooks/use-input";
import { useAppStore } from "@/lib/store/app-store";
import { generateExercise, levelSpec, noteTimeline, LEVELS, READING_PROMOTE_AT, type Exercise } from "@/lib/generator/sightreading";
import { scoreReading } from "@/lib/engine/scoring";
import { fmtClock } from "@/lib/engine/record";
import { startBeatClock, audioTimeToPerfMs, meanSd } from "./shared/beat-clock";
import { CardTitle, Cells, MetronomeDots, NextStopButton, PAGE, RecordControl, SMALL, useBlockRecorder } from "./shared/controls";

/*
 * Sight reading (D4). A fresh exercise at the student's level in the session key. The page moves with the
 * click once they start; notes go mint as they land, lilac when missed. Bar by bar underneath shows where
 * the page is and which bars had a miss. Continuity is what counts — keep going through mistakes. Two
 * clean runs move the level up. When nothing is listening, the page sits still and the player marks each
 * time through.
 */

const BARS_PER_LINE = 4;
const STAFF_W = 1000;
// Notation size while the page is moving: staff-space 14px, a treble line 136px tall, a grand-staff line 200px.
const LINE_GAP = 14;
const LINE_TOPS = { treble: 36, bass: 132 };
const LINE_H = { single: 136, grand: 200 };
const LINES_SHOWN = { single: 3, grand: 2 };
const SCROLL_EASE = "transform 480ms cubic-bezier(0.22, 0.61, 0.36, 1)";
const PROMOTE_AT = READING_PROMOTE_AT;
const TICK_MS = 50;
const MAX_LEVEL = LEVELS.length;

type Phase = "idle" | "countin" | "run";
interface Run { score: MidiScore; notesRight: number; total: number; aheadMs: number; clean: boolean; level: number }
interface Live { states: Map<number, NoteState>; current: number | null; right: number; passed: number; moving: number; aheadMs: number; firstMiss: number | null }

const handsText = (h: Exercise["hands"]) => (h === "together" ? "hands together" : h === "alternating" ? "alternating hands" : h === "LH" ? "left hand" : "right hand");

function emptyLive(): Live {
  return { states: new Map(), current: null, right: 0, passed: 0, moving: 0, aheadMs: 0, firstMiss: null };
}

/** Where the page is, given the notes played so far. Mirrors scoreReading's windows so the page and the score agree. */
function liveStates(ex: Exercise, ons: { midi: number; t: number }[], nowMs: number): Live {
  const beatMs = 60_000 / ex.tempo;
  const tl = noteTimeline(ex);
  const out = emptyLive();
  const devs: number[] = [];
  let cursor = 0;
  for (const n of tl) {
    const expT = n.beat * beatMs;
    let found = -1;
    for (let i = cursor; i < ons.length; i++) {
      if (ons[i].t < expT - beatMs) continue;
      if (ons[i].t > expT + beatMs) break;
      found = i;
      break;
    }
    if (found >= 0) {
      cursor = found + 1;
      out.passed++;
      out.moving++;
      const pitch = ons[found].midi === n.midi || ons[found].midi % 12 === n.midi % 12;
      if (pitch) out.right++;
      out.states.set(n.index, pitch ? "played" : "missed");
      devs.push(ons[found].t - expT);
      if (!pitch && out.firstMiss === null) out.firstMiss = n.index;
    } else if (nowMs > expT + beatMs) {
      out.passed++;
      out.states.set(n.index, "missed");
      if (out.firstMiss === null) out.firstMiss = n.index;
    } else if (nowMs >= expT - beatMs * 0.25) {
      out.states.set(n.index, "current");
      if (out.current === null) out.current = n.index;
    } else {
      out.states.set(n.index, "upcoming");
    }
  }
  out.aheadMs = devs.length ? -Math.round(meanSd(devs).mean) : 0;
  return out;
}

/** "A hair early", "Right on the beat", "Dragging a little". */
function beatWords(aheadMs: number): { line1: string; line2: string } {
  const abs = Math.abs(aheadMs);
  if (abs < 10) return { line1: "Right on the beat", line2: `within ${abs} ms` };
  const dir = aheadMs > 0 ? "ahead of" : "behind";
  if (abs < 35) return { line1: aheadMs > 0 ? "A hair early" : "A hair late", line2: `${abs} ms ${dir} the beat` };
  return { line1: aheadMs > 0 ? "Rushing a little" : "Dragging a little", line2: `${abs} ms ${dir} the beat` };
}

export function ReadingBlock({ child, session, scale, inputMode, elapsed, seconds, timeUp, paused, nextTitle, onDone, setMeta, setRecording }: BlockProps) {
  const { audio, unlock } = useAudio();
  const updateSettings = useAppStore((s) => s.updateSettings);
  const measured = inputMode !== "timer";
  const key = keyLabel(scale.key, scale.mode);

  const [level, setLevel] = React.useState(() => Math.max(1, Math.min(MAX_LEVEL, child.settings.readingLevel || 1)));
  const [tempo, setTempo] = React.useState(() => levelSpec(Math.max(1, Math.min(MAX_LEVEL, child.settings.readingLevel || 1))).tempo);
  const [exercise, setExercise] = React.useState<Exercise>(() => generateExercise({ level: Math.max(1, Math.min(MAX_LEVEL, child.settings.readingLevel || 1)), scale: session.scale }));
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [beat, setBeat] = React.useState<number | null>(null);
  const [countLeft, setCountLeft] = React.useState(0);
  const [live, setLive] = React.useState<Live>(emptyLive);
  const [runs, setRuns] = React.useState<Run[]>([]);
  const [streak, setStreak] = React.useState(() => child.settings.noStopStreak || 0);
  const [promoted, setPromoted] = React.useState(false);
  const [clickOn, setClickOn] = React.useState(false);
  // Timer mode: times through, with the clock reading when each was marked.
  const [marks, setMarks] = React.useState<number[]>([]);

  const phaseRef = React.useRef<Phase>("idle");
  const startMsRef = React.useRef<number | null>(null);
  const eventsRef = React.useRef<NoteEvent[]>([]);
  const stopClockRef = React.useRef<(() => void) | null>(null);
  const beatsRef = React.useRef(0);
  const exerciseRef = React.useRef(exercise);
  React.useEffect(() => { exerciseRef.current = exercise; });
  React.useEffect(() => () => { stopClockRef.current?.(); }, []);

  const ex = exercise;
  const tl = React.useMemo(() => noteTimeline(ex), [ex]);
  React.useEffect(() => {
    setMeta?.(<>Level {level} · {key} · {handsText(ex.hands)} · <Tempo bpm={tempo} /></>);
    return () => setMeta?.(null);
  }, [setMeta, level, ex.hands, key, tempo]);

  const recorder = useBlockRecorder({ child, session, type: "reading", title: `Sight reading, level ${level}`, setRecording });

  const setPhaseBoth = React.useCallback((p: Phase) => { phaseRef.current = p; setPhase(p); }, []);
  const stopClock = React.useCallback(() => {
    stopClockRef.current?.();
    stopClockRef.current = null;
    setBeat(null);
    setCountLeft(0);
    setClickOn(false);
  }, []);

  const finishRun = React.useCallback(() => {
    const start = startMsRef.current;
    stopClock();
    setPhaseBoth("idle");
    if (start === null) return;
    const exNow = exerciseRef.current;
    const score = scoreReading({ ...exNow, tempo }, eventsRef.current, start, inputMode);
    const final = liveStates({ ...exNow, tempo }, eventsRef.current.filter((e) => e.kind === "on").map((e) => ({ midi: e.midi, t: e.time - start })), Infinity);
    setLive(final);
    const clean = score.badge === "no-stop-reading";
    setRuns((r) => [...r, { score, notesRight: final.right, total: tl.length, aheadMs: final.aheadMs, clean, level }]);
    startMsRef.current = null;
    if (clean) {
      const next = streak + 1;
      if (next >= PROMOTE_AT && level < MAX_LEVEL) {
        const up = level + 1;
        setStreak(0);
        setLevel(up);
        setTempo(levelSpec(up).tempo);
        setPromoted(true);
        setExercise(generateExercise({ level: up, scale: session.scale }));
        setLive(emptyLive());
        void updateSettings(child.id, { readingLevel: up, noStopStreak: 0 });
      } else {
        setStreak(next);
        void updateSettings(child.id, { noStopStreak: next });
      }
    } else if (streak !== 0) {
      setStreak(0);
      void updateSettings(child.id, { noStopStreak: 0 });
    }
  }, [stopClock, setPhaseBoth, tempo, inputMode, tl.length, level, streak, session.scale, updateSettings, child.id]);
  const finishRef = React.useRef(finishRun);
  React.useEffect(() => { finishRef.current = finishRun; });

  // The page moves with the clock while a run is on.
  React.useEffect(() => {
    if (phase !== "run") return;
    const beatMs = 60_000 / tempo;
    const last = tl[tl.length - 1];
    const endAt = last ? (last.beat + last.beats) * beatMs + beatMs : 0;
    const id = setInterval(() => {
      const start = startMsRef.current;
      if (start === null) return;
      const now = performance.now() - start;
      const ons = eventsRef.current.filter((e) => e.kind === "on").map((e) => ({ midi: e.midi, t: e.time - start }));
      setLive(liveStates({ ...exerciseRef.current, tempo }, ons, now));
      if (now > endAt) finishRef.current();
    }, TICK_MS);
    return () => clearInterval(id);
  }, [phase, tempo, tl]);

  const beginAt = React.useCallback((startMs: number) => {
    startMsRef.current = startMs;
    eventsRef.current = [];
    setLive(emptyLive());
    setPhaseBoth("run");
  }, [setPhaseBoth]);

  useInput({
    onNote: (e) => {
      if (paused || !measured) return;
      if (phaseRef.current === "idle" && e.kind === "on") beginAt(e.time);
      if (phaseRef.current !== "run") return;
      eventsRef.current.push(e);
    },
  });

  /** Start with the click: a count-in when the household asked for one, then the page moves. */
  const startWithClick = async () => {
    await unlock();
    stopClock();
    beatsRef.current = 0;
    const countIn = child.settings.countIn ? 8 : 0;
    setCountLeft(countIn);
    setClickOn(true);
    setPhaseBoth(countIn ? "countin" : "run");
    if (!countIn) beginAt(performance.now());
    stopClockRef.current = startBeatClock(audio, tempo, (b, time) => {
      const n = beatsRef.current++;
      setBeat(b);
      if (n < countIn) { setCountLeft(countIn - n); return; }
      if (n === countIn && countIn) { setCountLeft(0); beginAt(audioTimeToPerfMs(audio, time)); }
    });
  };
  const stopRun = () => { if (phaseRef.current === "run") finishRun(); else { stopClock(); setPhaseBoth("idle"); } };

  const newExercise = () => {
    stopClock();
    setPhaseBoth("idle");
    startMsRef.current = null;
    setExercise(generateExercise({ level, scale: session.scale }));
    setLive(emptyLive());
    setMarks([]);
    setPromoted(false);
  };
  const slower = () => setTempo((t) => Math.max(40, t - 8));

  // A metronome on the rail, nothing else listening.
  const toggleClick = async () => {
    if (clickOn) { stopClock(); return; }
    await unlock();
    setClickOn(true);
    stopClockRef.current = startBeatClock(audio, tempo, (b) => setBeat(b));
  };

  const finishBlock = () => {
    if (phaseRef.current === "run") finishRun();
    stopClock();
    const best = runs.slice().sort((a, b) => (b.clean ? 1 : 0) - (a.clean ? 1 : 0) || b.score.score - a.score.score)[0];
    const cleanCount = runs.filter((r) => r.clean).length;
    onDone({
      completed: true,
      skipped: false,
      midiScore: best?.score,
      recordingId: recorder.recordingId,
      inputMode,
      details: { level, seed: ex.seed, tempo, hands: ex.hands, runs: measured ? runs.length : marks.length, clean: cleanCount, promoted, aheadMs: best?.aheadMs ?? null, timesThrough: marks.length },
    });
  };
  const markThrough = () => {
    if (marks.length + 1 >= 2) { const next = [...marks, elapsed]; setMarks(next); finishBlock(); return; }
    setMarks((m) => [...m, elapsed]);
  };

  // ---- the page ----
  const lines = React.useMemo(() => exerciseToLines(ex, scale, { barsPerLine: BARS_PER_LINE, states: measured ? live.states : undefined, lhChord: levelSpec(level).lhChords, tops: LINE_TOPS }), [ex, scale, live.states, measured, level]);
  const currentNote = live.current !== null ? ex.notes[live.current] : null;
  const currentLine = currentNote ? Math.floor(currentNote.bar / BARS_PER_LINE) : 0;
  const grand = ex.hands === "together" || ex.hands === "alternating";
  const lineH = grand ? LINE_H.grand : LINE_H.single;
  const shown = grand ? LINES_SHOWN.grand : LINES_SHOWN.single;
  // The page glides so the line being played sits second from the top: the line just finished stays visible
  // above it, the next ones below. It scrolls one line at a time instead of swapping the whole page.
  const firstShown = Math.max(0, Math.min(currentLine - 1, lines.length - shown));
  const regionFor = (firstBar: number): StaffRegion[] => (currentNote && currentNote.bar >= firstBar && currentNote.bar < firstBar + BARS_PER_LINE ? [{ bar: currentNote.bar - firstBar, beat: currentNote.beat, width: 48 }] : []);

  const last = runs[runs.length - 1];
  const cleanCount = runs.filter((r) => r.clean).length;
  const currentBar = phase === "run" ? (currentNote?.bar ?? (live.passed >= tl.length ? ex.bars : 0)) : last && live.states.size ? ex.bars : -1;
  const missedBars = Array.from(new Set(ex.notes.filter((n, i) => live.states.get(i) === "missed").map((n) => n.bar)));
  const barMeta = phase === "run" ? `You're on bar ${Math.min(ex.bars, (currentNote?.bar ?? 0) + 1)} of ${ex.bars}` : last && live.states.size ? (missedBars.length ? `${missedBars.length} bar${missedBars.length === 1 ? "" : "s"} with a miss` : `All ${ex.bars} bars clean`) : `Level ${level} · ${ex.bars} bars`;

  const instruction = paused
    ? "Paused."
    : phase === "countin" ? `Count-in — ${Math.ceil(countLeft / 4)} bar${Math.ceil(countLeft / 4) === 1 ? "" : "s"}, then the page moves.`
    : phase === "run" ? "Keep going through mistakes — don't stop to fix a note."
    : timeUp ? `Time. Finish this page, then on to ${nextTitle ?? "the summary"}.`
    : promoted ? `Two clean runs. Level ${level} from here — ${levelSpec(level).title.toLowerCase()}.`
    : runs.length === 0 ? "Keep going through mistakes — don't stop to fix a note."
    : last?.clean ? `Clean. ${PROMOTE_AT - streak === 1 ? "One more" : `${PROMOTE_AT - streak} more`} like that moves the level up.`
    : `${last.notesRight} of ${last.total} right. Same page again, or a new one.`;

  const ahead = phase === "run" ? live.aheadMs : last?.aheadMs ?? null;
  const beat2 = ahead !== null ? beatWords(ahead) : { line1: "Nothing measured yet", line2: "play the first note to start" };

  if (!measured) {
    return (
      <>
        <div style={{ ...PAGE, display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 16, padding: "22px 32px 22px" }}>
          <div style={{ minHeight: 0, display: "flex", flexDirection: "column", gap: 16 }}>
            <Instruction>Nothing is listening, so the page sits still — play it through twice at your own pace.</Instruction>
            <SheetPanel padding={20} style={{ flex: 1, minHeight: 0 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", maxHeight: "100%", overflow: "auto" }}>
                {lines.map((l) => <Staff key={l.firstBar} systems={l.systems} notes={l.notes} rests={l.rests} layout={{ bars: l.bars, beatsPerBar: ex.timeSig[0], left: 190, right: 40 }} width={780} height={lineH} lineGap={LINE_GAP} />)}
              </div>
            </SheetPanel>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <CardTitle meta={marks.length ? `You marked the first run done at ${fmtClock(marks[0])}.` : "Mark each run when you reach the last bar."}>Times through</CardTitle>
              <Cells count={2} current={marks.length} />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, minHeight: 0 }}>
            <Panel tone="indigo">
              <div style={{ fontSize: 14, fontWeight: 800, color: "var(--kc-indigo-shadow)" }}>Time in this stop</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <span style={{ fontFamily: "var(--kc-font-display)", fontSize: 40, fontWeight: 600, lineHeight: 1, color: "var(--kc-indigo)", fontVariantNumeric: "tabular-nums" }}>{fmtClock(elapsed)}</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: "var(--kc-ink-muted)" }}>of {Math.round(seconds / 60)} minutes planned</span>
              </div>
            </Panel>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <CardTitle size={17}>What gets recorded</CardTitle>
              <CheckItem>Minutes, and the page you read</CheckItem>
              <CheckItem>The level you chose, held or dropped</CheckItem>
              <CheckItem on={false}>Notes right, drift, evenness</CheckItem>
              <div style={SMALL}>Four of the seven stops work this way. Ear and harmony need something listening.</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <CardTitle size={17}>Metronome</CardTitle>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontFamily: "var(--kc-font-display)", fontSize: 34, fontWeight: 600, lineHeight: 1 }}>{tempo}</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: "var(--kc-ink-faint)" }}>bpm</span>
                <div style={{ marginLeft: "auto" }}><MetronomeDots beat={clickOn ? beat ?? 0 : null} /></div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <Button variant="secondary" size="pill" icon="slow_motion_video" onClick={slower} disabled={tempo <= 40}>Slower</Button>
                <Button variant="secondary" size="pill" icon={clickOn ? "stop" : "play_arrow"} onClick={() => void toggleClick()}>{clickOn ? "Stop the click" : "Start the click"}</Button>
              </div>
            </div>
            <div style={{ ...SMALL, marginTop: "auto", color: "var(--kc-ink-faint)" }}>Plug the keyboard in from the header — switching mid-stop keeps the minutes you&apos;ve already played.</div>
          </div>
        </div>
        <BottomBar
          actions={
            <>
              <Button variant="secondary" size="control" icon="refresh" onClick={newExercise} disabled={paused}>New page</Button>
              {marks.length >= 1
                ? <NextStopButton nextTitle={nextTitle} onClick={markThrough} disabled={paused} />
                : <Button size="control" icon="check" onClick={markThrough} disabled={paused}>I played it through</Button>}
            </>
          }
        >
          <StatChip tone="mint" value={marks.length} unit="/2" label={<>times<br />through</>} />
          <StatChip tone="indigo" icon="menu_book" line1={`Level ${level} · ${ex.bars} bars`} line2={`${handsText(ex.hands)} · ${key}`} />
        </BottomBar>
      </>
    );
  }

  return (
    <>
      <div style={PAGE}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Instruction style={{ flex: 1, minWidth: 0 }}>{instruction}</Instruction>
          <Pill tone={phase === "run" ? "mint" : "neutral"}>{phase === "countin" ? `Count ${countLeft}` : `Level ${level}`}</Pill>
          <MetronomeDots beat={beat} />
          <RecordControl recording={recorder.recording} supported={recorder.supported} onToggle={() => void recorder.toggle()} />
          {phase === "idle"
            ? <Button variant="secondary" size="pill" icon="play_arrow" onClick={() => void startWithClick()} disabled={paused}>Start with the click</Button>
            : <Button variant="secondary" size="pill" icon="stop" onClick={stopRun}>Stop</Button>}
        </div>
        <SheetPanel padding={16} style={{ flex: 1, minHeight: 0 }}>
          <div style={{ display: "flex", justifyContent: "center", height: "100%", overflow: "hidden" }}>
            <div style={{ width: STAFF_W, height: shown * lineH, maxHeight: "100%", overflow: "hidden" }}>
              <div style={{ display: "flex", flexDirection: "column", transform: `translateY(${-firstShown * lineH}px)`, transition: SCROLL_EASE, willChange: "transform" }}>
                {lines.map((l) => <Staff key={l.firstBar} systems={l.systems} notes={l.notes} rests={l.rests} regions={regionFor(l.firstBar)} layout={{ bars: l.bars, beatsPerBar: ex.timeSig[0], left: 190, right: 40 }} width={STAFF_W} height={lineH} lineGap={LINE_GAP} />)}
              </div>
            </div>
          </div>
        </SheetPanel>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: "none" }}>
          <CardTitle meta={barMeta}>Bar by bar</CardTitle>
          <Cells count={ex.bars} current={currentBar} missed={missedBars} labels={false} />
        </div>
      </div>
      <BottomBar
        actions={
          <>
            <Button variant="secondary" size="control" icon="slow_motion_video" onClick={slower} disabled={phase !== "idle" || tempo <= 40 || paused}>Slower</Button>
            <Button variant="secondary" size="control" icon="refresh" onClick={newExercise} disabled={paused}>New page</Button>
            <NextStopButton nextTitle={nextTitle} onClick={finishBlock} disabled={paused} />
          </>
        }
      >
        <StatChip tone="mint" value={phase === "run" ? live.right : last ? last.notesRight : "—"} unit={`/${tl.length}`} label={<>notes<br />right</>} />
        <StatChip tone="indigo" icon="speed" line1={beat2.line1} line2={beat2.line2} />
        {cleanCount > 0 && <StatChip tone="sun" icon="star" line1={`${cleanCount} clean run${cleanCount === 1 ? "" : "s"}`} line2={promoted ? `level ${level} now` : `${Math.max(1, PROMOTE_AT - streak)} more to level up`} />}
      </BottomBar>
    </>
  );
}
