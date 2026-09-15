"use client";
import * as React from "react";
import type { BlockProps } from "./types";
import type { MidiScore, NoteEvent } from "@/lib/types";
import type { NoteState, StaffRegion } from "@/components/ds";
import { BottomBar, Button, CheckItem, Metric, Pill, SectionLabel, SegmentBar, SheetPanel, Staff, Tempo, exerciseToLines, keyLabel } from "@/components/ds";
import { useAudio } from "@/lib/hooks/use-audio";
import { useInput } from "@/lib/hooks/use-input";
import { useAppStore } from "@/lib/store/app-store";
import { generateExercise, levelSpec, noteTimeline, LEVELS, type Exercise } from "@/lib/generator/sightreading";
import { scoreReading } from "@/lib/engine/scoring";
import { fmtClock } from "@/lib/engine/record";
import { startBeatClock, audioTimeToPerfMs, meanSd } from "./shared/beat-clock";
import { MetronomeDots, RecordControl, useBlockRecorder } from "./shared/controls";

/*
 * Sight reading (kit PracticeScreen; E2 when nothing is listening). A fresh exercise at the student's level in
 * the session key. The page moves with the click once they start; notes go mint as they land, clay when
 * missed. Continuity is what counts — keep going through mistakes. Two clean runs move the level up.
 */

const BARS_PER_LINE = 4;
const STAFF_W = 1000;
const PROMOTE_AT = 2;
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
    setMeta?.(<>Level {level} · {handsText(ex.hands)} · {key} · <Tempo bpm={tempo} /></>);
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

  // E2: a metronome on the rail, nothing else listening.
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
  const lines = React.useMemo(() => exerciseToLines(ex, scale, { barsPerLine: BARS_PER_LINE, states: measured ? live.states : undefined, lhChord: levelSpec(level).lhChords }), [ex, scale, live.states, measured, level]);
  const currentNote = live.current !== null ? ex.notes[live.current] : null;
  const currentLine = currentNote ? Math.floor(currentNote.bar / BARS_PER_LINE) : 0;
  const grand = ex.hands === "together" || ex.hands === "alternating";
  const lineGap = 18;
  const lineH = grand ? 264 : 132;
  const visible = measured ? lines.slice(currentLine, currentLine + (grand ? 2 : 3)) : lines;
  const regionFor = (firstBar: number): StaffRegion[] => (currentNote && currentNote.bar >= firstBar && currentNote.bar < firstBar + BARS_PER_LINE ? [{ bar: currentNote.bar - firstBar, beat: currentNote.beat, width: 48 }] : []);

  const last = runs[runs.length - 1];
  const cleanCount = runs.filter((r) => r.clean).length;
  const continuity = phase === "run" ? (live.passed ? live.moving / live.passed : 1) : last ? last.score.components.continuity / 100 : 0;
  const heldThrough = live.firstMiss !== null ? Math.max(0, ex.notes[live.firstMiss].bar) : currentNote ? currentNote.bar + 1 : last ? ex.bars : 0;
  const continuityCopy = phase === "run"
    ? live.firstMiss !== null ? `A miss in bar ${ex.notes[live.firstMiss].bar + 1} — keep going` : `Moving through bar ${(currentNote?.bar ?? 0) + 1}`
    : last
      ? last.clean ? `You held the pulse through bar ${ex.bars}` : heldThrough > 0 ? `You held the pulse through bar ${heldThrough}` : "The pulse slipped in bar 1"
      : "Nothing measured yet";

  const instruction = paused
    ? "Paused."
    : phase === "countin" ? `Count-in — ${Math.ceil(countLeft / 4)} bar${Math.ceil(countLeft / 4) === 1 ? "" : "s"}, then the page moves.`
    : phase === "run" ? "Keep going through mistakes — don't stop to fix a note."
    : timeUp ? `Time. Finish this page, then Next — ${nextTitle ?? "done"}.`
    : promoted ? `Two clean runs. Level ${level} from here — ${levelSpec(level).title.toLowerCase()}.`
    : runs.length === 0 ? "Keep going through mistakes — don't stop to fix a note. Play the first note, or start with the click."
    : last?.clean ? `Clean. ${PROMOTE_AT - streak === 1 ? "One more" : `${PROMOTE_AT - streak} more`} like that moves the level up.`
    : `${last.notesRight} of ${last.total} right. Same page again, or a new one.`;

  if (!measured) {
    return (
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px" }}>
        <div style={{ minHeight: 0, padding: "22px 26px 22px 30px", display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ margin: 0, fontSize: 17, color: "var(--kc-ink-muted)" }}>Nothing is listening, so the page doesn&apos;t move on its own — play it through twice at your own pace.</p>
          <SheetPanel padding={22} style={{ flex: 1, minHeight: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", maxHeight: "100%", overflow: "auto" }}>
              {lines.map((l) => <Staff key={l.firstBar} systems={l.systems} notes={l.notes} rests={l.rests} layout={{ bars: l.bars, beatsPerBar: ex.timeSig[0], left: 190, right: 40 }} width={820} height={grand ? 280 : 150} />)}
            </div>
          </SheetPanel>
          <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 22 }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              <SectionLabel>TIMES THROUGH</SectionLabel>
              <SegmentBar total={2} filled={marks.length} current={Math.min(marks.length, 1)} height={8} radius={3} />
              <span style={{ fontSize: 14, color: "var(--kc-ink-muted)" }}>{marks.length ? `You marked the first run done at ${fmtClock(marks[0])}.` : "Mark each run when you reach the last bar."}</span>
            </div>
            <Button variant="secondary" size="control" onClick={newExercise} disabled={paused}>New exercise</Button>
            <Button size="control" icon="check" onClick={markThrough} disabled={paused}>{marks.length >= 1 ? (nextTitle ? `Next — ${nextTitle}` : "Finish") : "I played it through"}</Button>
          </div>
        </div>
        <div style={{ borderLeft: "1px solid var(--kc-border)", background: "var(--kc-panel)", padding: "26px 24px", display: "flex", flexDirection: "column", gap: 14, minHeight: 0 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <SectionLabel>TIME IN THIS BLOCK</SectionLabel>
            <span style={{ fontFamily: "var(--kc-font-mono)", fontSize: 32, fontVariantNumeric: "tabular-nums" }}>{fmtClock(elapsed)}</span>
            <span style={{ fontSize: 14, color: "var(--kc-ink-dim)" }}>of {Math.round(seconds / 60)} minutes planned</span>
          </div>
          <div style={{ borderTop: "1px solid var(--kc-border)", paddingTop: 14, display: "flex", flexDirection: "column", gap: 11 }}>
            <SectionLabel>WHAT GETS RECORDED</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              <CheckItem>Minutes, and the page you read</CheckItem>
              <CheckItem>The level you chose, held or dropped</CheckItem>
              <CheckItem on={false}>Notes right, drift, evenness</CheckItem>
            </div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45, color: "var(--kc-ink-faint)" }}>Four of the six blocks work this way. Ear and harmony need something listening.</p>
          </div>
          <div style={{ borderTop: "1px solid var(--kc-border)", paddingTop: 22, display: "flex", flexDirection: "column", gap: 12 }}>
            <SectionLabel>METRONOME</SectionLabel>
            <div style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }} onClick={() => void toggleClick()} role="button" aria-pressed={clickOn}>
              <span style={{ fontFamily: "var(--kc-font-mono)", fontSize: 32 }}>{tempo}</span>
              <span style={{ fontSize: 15, color: "var(--kc-ink-dim)" }}>bpm</span>
              <div style={{ marginLeft: "auto" }}><MetronomeDots beat={clickOn ? beat ?? 0 : null} /></div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <Button variant="secondary" size="pill" onClick={slower} disabled={tempo <= 40}>Slower</Button>
              <Button variant="secondary" size="pill" onClick={() => void toggleClick()}>{clickOn ? "Stop the click" : "Start the click"}</Button>
            </div>
          </div>
          <span style={{ marginTop: "auto", fontSize: 14, color: "var(--kc-ink-faint)" }}>Plug the keyboard in from the header — switching mid-block keeps the minutes you&apos;ve already played.</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", padding: "22px 30px 0", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <p style={{ margin: 0, fontSize: 17, color: "var(--kc-ink-muted)", flex: 1, minWidth: 0 }}>{instruction}</p>
          <Pill tone={phase === "run" ? "mint" : "neutral"}>{phase === "countin" ? `COUNT ${countLeft}` : phase === "run" ? `BAR ${(currentNote?.bar ?? 0) + 1} OF ${ex.bars}` : `LEVEL ${level} · ${ex.bars} BARS`}</Pill>
          <MetronomeDots beat={beat} />
          <RecordControl recording={recorder.recording} supported={recorder.supported} onToggle={() => void recorder.toggle()} />
          {phase === "idle"
            ? <Button variant="quiet" size="control" icon="play_arrow" onClick={() => void startWithClick()} disabled={paused}>Start with the click</Button>
            : <Button variant="quiet" size="control" icon="stop" onClick={stopRun}>Stop</Button>}
        </div>
        <SheetPanel padding={18} style={{ flex: 1, minHeight: 0 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", maxHeight: "100%", overflow: "hidden" }}>
            {visible.map((l) => <Staff key={l.firstBar} systems={l.systems} notes={l.notes} rests={l.rests} regions={regionFor(l.firstBar)} layout={{ bars: l.bars, beatsPerBar: ex.timeSig[0], left: 190, right: 40 }} width={STAFF_W} height={lineH} lineGap={lineGap} />)}
          </div>
        </SheetPanel>
        <div style={{ height: 8, flex: "none" }} />
      </div>
      <BottomBar
        actions={
          <>
            <Button variant="secondary" size="control" onClick={slower} disabled={phase !== "idle" || tempo <= 40 || paused}>Slower</Button>
            <Button variant="secondary" size="control" onClick={newExercise} disabled={paused}>New exercise</Button>
            <Button size="control" onClick={finishBlock} disabled={paused}>{nextTitle ? `Next — ${nextTitle}` : "Finish"}</Button>
          </>
        }
      >
        <div style={{ width: 280, display: "flex", flexDirection: "column", gap: 6 }}>
          <SectionLabel>CONTINUITY</SectionLabel>
          <div style={{ height: 8, background: "var(--kc-raised)", borderRadius: 4 }}>
            <div style={{ width: `${Math.round(Math.max(0, Math.min(1, continuity)) * 100)}%`, height: "100%", background: "var(--kc-mint)", borderRadius: 4 }} />
          </div>
          <span style={{ fontSize: 14, color: "var(--kc-ink-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{continuityCopy}</span>
        </div>
        <div style={{ display: "flex", gap: 26 }}>
          <Metric label="NOTES RIGHT" value={phase === "run" ? `${live.right} / ${tl.length}` : last ? `${last.notesRight} / ${last.total}` : "—"} />
          <Metric label="AHEAD OF BEAT" value={phase === "run" || last ? `${(phase === "run" ? live.aheadMs : last.aheadMs) >= 0 ? "" : "−"}${Math.abs(phase === "run" ? live.aheadMs : last.aheadMs)} ms` : "—"} tone={Math.abs(phase === "run" ? live.aheadMs : last?.aheadMs ?? 0) >= 25 ? "clay" : undefined} />
          <Metric label="CLEAN RUNS" value={`${cleanCount} / ${PROMOTE_AT}`} tone={cleanCount ? "mint" : undefined} />
        </div>
      </BottomBar>
    </>
  );
}
