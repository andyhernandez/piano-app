"use client";
import * as React from "react";
import type { BlockProps } from "./types";
import type { MidiScore, NoteEvent } from "@/lib/types";
import type { NoteState, StaffNote, StaffRest } from "@/components/ds";
import { BottomBar, Button, Keyboard, LogTable, Metric, Pill, SectionLabel, SheetPanel, Staff, Tempo, keyLabel, keySignatureFor, midiToStep, type KeyTone } from "@/components/ds";
import { useAudio } from "@/lib/hooks/use-audio";
import { useInput } from "@/lib/hooks/use-input";
import { prefersFlats, scaleRunMidi } from "@/lib/music/scales";
import { midiToName } from "@/lib/music/notes";
import { scoreScaleRun } from "@/lib/engine/scoring";
import { startBeatClock, meanSd } from "./shared/beat-clock";
import { MetronomeDots, RecordControl, TempoControls, useBlockRecorder } from "./shared/controls";

/*
 * Technique (design C1). The scale of the week, two octaves up and back, one run at a time: right hand, left
 * hand, then hands together. The click counts in when asked; the staff shows the run with fingerings and the
 * keyboard mirrors the note that should come next. Each run is measured for evenness (the interval between
 * keys), the tempo that was actually held, and whether it was clean — the figure the Progress chart plots.
 */

type HandChoice = "RH" | "LH" | "both";
type Phase = "idle" | "countin" | "run";
type Report = "clean" | "mostly" | "stumbled";
const PLAN: HandChoice[] = ["RH", "LH", "both", "both"];
const COUNT_IN_BEATS = 8;
const STAFF_W = 1050;
const LAYOUT = { bars: 2, beatsPerBar: 4, left: 190, right: 40 };
const FLASH_MS = 400;
const ORDINAL = ["first", "second", "third", "fourth", "fifth"];

interface RunLog {
  hand: HandChoice;
  bpm: number;
  score: MidiScore | null;
  even: number;
  total: number;
  keyToKeyMs: number | null;
  tempoHeld: number | null;
  clean: boolean;
  /** Mean lateness (ms) per octave and finger: index = octave * 5 + finger - 1. NaN where nothing was played. */
  fingers: number[];
  report: Report | null;
}

const handWord = (h: HandChoice) => (h === "RH" ? "right hand" : h === "LH" ? "left hand" : "hands together");

/** The 29 notes of the run for a hand. Hands together is measured on the right hand; the left is heard, not scored. */
function runFor(scale: BlockProps["scale"], hand: HandChoice): number[] {
  return scaleRunMidi(scale, hand === "LH" ? 2 : 4, 2);
}

/** Finger for each note of the run: the two-octave fingering up, then back down. */
function fingersFor(scale: BlockProps["scale"], hand: HandChoice): number[] {
  const f = hand === "LH" ? scale.fingeringLH : scale.fingeringRH;
  return [...f, ...f.slice(0, -1).reverse()];
}

export function TechniqueBlock({ child, session, scale, inputMode, timeUp, paused, nextTitle, onDone, setMeta, setRecording }: BlockProps) {
  const { audio, unlock } = useAudio();
  const flats = prefersFlats(scale);
  const key = keyLabel(scale.key, scale.mode);
  const measured = inputMode !== "timer";

  const [runs, setRuns] = React.useState<RunLog[]>([]);
  const [hand, setHand] = React.useState<HandChoice>(PLAN[0]);
  const [bpm, setBpm] = React.useState(72);
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [beat, setBeat] = React.useState<number | null>(null);
  const [countLeft, setCountLeft] = React.useState(0);
  const [progress, setProgress] = React.useState(0);
  const [states, setStates] = React.useState<Map<number, NoteState>>(() => new Map());
  const [flash, setFlash] = React.useState<Partial<Record<number, KeyTone>>>({});
  const [wrong, setWrong] = React.useState(0);

  const run = React.useMemo(() => runFor(scale, hand), [scale, hand]);
  const fingers = React.useMemo(() => fingersFor(scale, hand), [scale, hand]);
  const clef: "treble" | "bass" = hand === "LH" ? "bass" : "treble";

  // Mutable round state, never read during render.
  const phaseRef = React.useRef<Phase>("idle");
  const progressRef = React.useRef(0);
  const eventsRef = React.useRef<NoteEvent[]>([]);
  const stopClockRef = React.useRef<(() => void) | null>(null);
  const beatsRef = React.useRef(0);
  const timeouts = React.useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const runRef = React.useRef(run);
  const bpmRef = React.useRef(bpm);
  React.useEffect(() => { runRef.current = run; bpmRef.current = bpm; });
  React.useEffect(() => {
    const set = timeouts.current;
    return () => { for (const id of set) clearTimeout(id); set.clear(); stopClockRef.current?.(); };
  }, []);

  React.useEffect(() => {
    setMeta?.(<>{key} · two octaves · {handWord(hand)} · <Tempo bpm={bpm} /></>);
    return () => setMeta?.(null);
  }, [setMeta, key, hand, bpm]);

  const recorder = useBlockRecorder({ child, session, type: "scales", title: `${key} scale`, setRecording });

  const later = React.useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => { timeouts.current.delete(id); fn(); }, ms);
    timeouts.current.add(id);
  }, []);

  const setPhaseBoth = React.useCallback((p: Phase) => { phaseRef.current = p; setPhase(p); }, []);

  const stopClock = React.useCallback(() => {
    stopClockRef.current?.();
    stopClockRef.current = null;
    setBeat(null);
    setCountLeft(0);
  }, []);

  const resetRun = React.useCallback(() => {
    progressRef.current = 0;
    eventsRef.current = [];
    setProgress(0);
    setStates(new Map());
    setWrong(0);
  }, []);

  const flashKey = React.useCallback((midi: number, tone: KeyTone) => {
    setFlash((f) => ({ ...f, [midi]: tone }));
    later(() => setFlash((f) => { const n = { ...f }; delete n[midi]; return n; }), FLASH_MS);
  }, [later]);

  /** Score what was played and log the run. `report` is the self-report in timer mode. */
  const finishRun = React.useCallback((report: Report | null) => {
    stopClock();
    setPhaseBoth("idle");
    const expected = runRef.current;
    const tempo = bpmRef.current;
    const ons = eventsRef.current.filter((e) => e.kind === "on");
    const fingersNow = fingersFor(scale, hand);
    let log: RunLog;
    if (!measured || ons.length < 2) {
      log = { hand, bpm: tempo, score: null, even: 0, total: expected.length, keyToKeyMs: null, tempoHeld: null, clean: report === "clean", fingers: Array(10).fill(NaN), report };
    } else {
      const score = scoreScaleRun(expected, ons, tempo * 2, inputMode);
      const target = 30_000 / tempo; // eighths at the click
      const intervals: number[] = [];
      for (let i = 1; i < ons.length; i++) intervals.push(ons[i].time - ons[i - 1].time);
      const { mean, sd } = meanSd(intervals);
      const even = 1 + intervals.filter((iv) => Math.abs(iv - target) <= target * 0.2).length;
      // Lateness by finger: walk the played notes against the expected run in order.
      const buckets: number[][] = Array.from({ length: 10 }, () => []);
      let p = ons[0].midi === expected[0] ? 1 : 0;
      for (let i = 1; i < ons.length && p < expected.length; i++) {
        const hop = [0, 1].find((k) => expected[p + k] === ons[i].midi);
        if (hop === undefined) continue;
        p += hop;
        const octave = p < 15 ? (p < 8 ? 0 : 1) : p < 22 ? 1 : 0;
        const finger = fingersNow[p];
        if (finger >= 1 && finger <= 5) buckets[octave * 5 + finger - 1].push(intervals[i - 1] - target);
        p++;
      }
      const fingerMeans = buckets.map((b) => (b.length ? b.reduce((a, v) => a + v, 0) / b.length : NaN));
      log = { hand, bpm: tempo, score, even: Math.min(expected.length, even), total: expected.length, keyToKeyMs: Math.round(sd), tempoHeld: mean > 0 ? Math.round(30_000 / mean) : null, clean: score.badge === "clean-scale", fingers: fingerMeans, report };
    }
    setRuns((r) => [...r, log]);
    resetRun();
    setHand(PLAN[Math.min(PLAN.length - 1, runs.length + 1)]);
  }, [stopClock, setPhaseBoth, scale, hand, measured, inputMode, resetRun, runs.length]);

  const finishRef = React.useRef(finishRun);
  React.useEffect(() => { finishRef.current = finishRun; });

  const beginRun = React.useCallback(() => {
    resetRun();
    setPhaseBoth("run");
  }, [resetRun, setPhaseBoth]);

  const { tap } = useInput({
    onNote: (e) => {
      if (paused) return;
      const expected = runRef.current;
      if (phaseRef.current === "idle") {
        if (e.kind !== "on" || e.midi !== expected[0]) return;
        beginRun();
      }
      if (phaseRef.current !== "run") return;
      if (hand === "both" && e.midi < expected[0] - 1) return;
      eventsRef.current.push(e);
      if (e.kind !== "on") return;
      const p = progressRef.current;
      const hop = [0, 1].find((k) => expected[p + k] === e.midi);
      if (hop === undefined) { flashKey(e.midi, "clay"); setWrong((w) => w + 1); return; }
      setStates((s) => {
        const n = new Map(s);
        if (hop === 1) n.set(p, "missed");
        n.set(p + hop, "played");
        return n;
      });
      progressRef.current = p + hop + 1;
      setProgress(progressRef.current);
      if (progressRef.current >= expected.length) later(() => finishRef.current(null), 120);
    },
  });

  /** Start run: the click, with a count-in when the household asked for one. */
  const startRun = async () => {
    await unlock();
    stopClock();
    resetRun();
    beatsRef.current = 0;
    const countIn = child.settings.countIn ? COUNT_IN_BEATS : 0;
    setCountLeft(countIn);
    setPhaseBoth(countIn ? "countin" : "run");
    stopClockRef.current = startBeatClock(audio, bpm, (b) => {
      const n = beatsRef.current++;
      setBeat(b);
      if (n < countIn) { setCountLeft(countIn - n); return; }
      if (n === countIn) { setCountLeft(0); setPhaseBoth("run"); }
    });
  };

  const endRun = () => finishRun(null);

  const cycleHand = () => {
    if (phase !== "idle") return;
    setHand((h) => (h === "RH" ? "LH" : h === "LH" ? "both" : "RH"));
    resetRun();
  };

  const onKeyOn = (midi: number) => { audio.playNote(midi, 0.5, 0.8); tap.note(midi, "on"); };
  const onKeyOff = (midi: number) => tap.note(midi, "off");

  const finishBlock = () => {
    if (phase !== "idle") finishRun(null);
    const cleanRuns = runs.filter((r) => r.clean);
    const best = runs.filter((r) => r.score).sort((a, b) => (b.clean ? 1 : 0) - (a.clean ? 1 : 0) || (b.score?.score ?? 0) - (a.score?.score ?? 0))[0];
    const tempoBest = cleanRuns.length ? Math.max(...cleanRuns.map((r) => r.tempoHeld ?? r.bpm)) : null;
    const worst = worstFinger(runs);
    onDone({
      completed: true,
      skipped: false,
      midiScore: best?.score ?? undefined,
      recordingId: recorder.recordingId,
      inputMode,
      details: {
        scale: scale.name,
        bpm: tempoBest ?? bpm,
        clean: cleanRuns.length,
        tempoBest,
        runs: runs.length,
        hands: runs.map((r) => r.hand),
        reports: runs.map((r) => r.report),
        unevenFinger: worst?.finger ?? null,
      },
    });
  };

  // ---- derived view ----
  const runIdx = runs.length;
  const upPage = progress < 15;
  const pageStart = upPage ? 0 : 14;
  const notes: StaffNote[] = [];
  for (let k = 0; k < 15; k++) {
    const i = pageStart + k;
    const midi = run[i];
    const st: NoteState = states.get(i) ?? (phase === "run" && i === progress ? "current" : i < progress ? "played" : "upcoming");
    notes.push({ bar: Math.floor(k / 8), beat: (k % 8) / 2, step: midiToStep(midi, clef, flats), value: "eighth", beam: `b${Math.floor(k / 2)}`, state: phase === "idle" && runIdx === 0 && !states.size ? undefined : st });
  }
  const rests: StaffRest[] = [{ bar: 1, beat: 3.5, value: "eighth" }];
  const barW = (STAFF_W - LAYOUT.left - LAYOUT.right) / LAYOUT.bars;
  const cur = Math.min(run.length - 1, progress) - pageStart;
  const region = phase !== "idle" && cur >= 0 && cur < 15 ? [{ bar: Math.floor(cur / 8), beat: (cur % 8) / 2, width: 54 }] : [];
  const fingerLabels = Array.from({ length: 15 }, (_, k) => ({ x: LAYOUT.left + (Math.floor(k / 8) + ((k % 8) / 2) / 4) * barW + 13, f: fingers[pageStart + k] }));

  const tones: Partial<Record<number, KeyTone>> = {};
  for (const m of run) tones[m] = "dim";
  if (phase !== "countin" && progress < run.length) tones[run[progress]] = "mint";
  Object.assign(tones, flash);
  const kbFrom = Math.min(...run) - 1;
  const kbTo = Math.max(...run) + 1;

  const last = runs[runs.length - 1];
  const evenBest = runs.reduce<{ i: number; r: RunLog } | null>((acc, r, i) => (r.score && (!acc || r.even > acc.r.even) ? { i, r } : acc), null);
  const worst = worstFinger(runs);
  const chart = fingerChart(runs);
  const cleanCount = runs.filter((r) => r.clean).length;

  const instruction = paused
    ? "Paused."
    : phase === "countin"
      ? `Count-in — ${Math.ceil(countLeft / 4)} bar${Math.ceil(countLeft / 4) === 1 ? "" : "s"} of click, then the ${handWord(hand)}.`
      : phase === "run"
        ? `${hand === "LH" ? "Left" : "Right"} hand, up and back. Next note ${midiToName(run[Math.min(progress, run.length - 1)], flats)}.`
        : timeUp
          ? `Time. Finish this run if you're in one, then Next — ${nextTitle ?? "done"}.`
          : runIdx === 0
            ? `${hand === "LH" ? "Left" : "Right"} hand, up and back. Start on ${midiToName(run[0], flats)}, or press Start run for the click.`
            : worst
              ? `${hand === "both" ? "Hands together" : hand === "LH" ? "Left hand" : "Right hand"}, up and back. Listen for one note later than the rest — that's the ${ORDINAL[worst.finger - 1]} finger.`
              : `${hand === "both" ? "Hands together" : hand === "LH" ? "Left hand" : "Right hand"}, up and back. Same tempo as the last run.`;

  const rows = Array.from({ length: Math.max(PLAN.length, runs.length + (phase !== "idle" ? 1 : 0)) }, (_, i) => {
    const r = runs[i];
    if (r) {
      const third = r.report ? r.report.toUpperCase() : r.score ? `${r.even} / ${r.total} EVEN` : "NOT MEASURED";
      return { cells: [`RUN ${i + 1}`, `${r.bpm} BPM`, third], marked: r.clean };
    }
    if (i === runIdx && phase !== "idle") return { cells: [`RUN ${i + 1}`, `${bpm} BPM`, "PLAYING"] };
    return { cells: [`RUN ${i + 1}`, "—", "NOT PLAYED"] };
  });

  const advice = runs.length === 0
    ? `Play the first run at ${bpm}; the log fills in as you go.`
    : evenBest && runs.length >= 2
      ? `Run ${evenBest.i + 1} was the even one. Play run ${runIdx + 1} at the same tempo rather than faster.`
      : last?.report
        ? `Run ${runIdx} was ${last.report}. ${last.report === "clean" ? `Try run ${runIdx + 1} four clicks faster.` : `Keep run ${runIdx + 1} at the same tempo.`}`
        : `One run in. Play run ${runIdx + 1} at the same tempo rather than faster.`;

  const chartCopy = !measured
    ? "Nothing is listening — the chart needs a keyboard or the microphone."
    : !runs.some((r) => r.score)
      ? "Play a run and each finger's timing shows here, both octaves."
      : worst
        ? `The ${ORDINAL[worst.finger - 1]} finger lands about ${worst.ms} ms later than its neighbours${worst.both ? ", in both octaves" : ""}.`
        : "No finger stands out. Whatever you are doing, keep doing it.";

  return (
    <>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", padding: "22px 30px 0", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <p style={{ margin: 0, fontSize: 17, color: "var(--kc-ink-muted)", flex: 1, minWidth: 0 }}>{instruction}</p>
          <Pill tone={phase === "run" ? "mint" : "neutral"}>{phase === "countin" ? `COUNT ${countLeft}` : `RUN ${Math.min(runIdx + 1, 99)} OF ${Math.max(PLAN.length, runIdx + 1)}`}</Pill>
          <MetronomeDots beat={beat} />
          <TempoControls bpm={bpm} onChange={setBpm} disabled={phase !== "idle"} />
          <RecordControl recording={recorder.recording} supported={recorder.supported} onToggle={() => void recorder.toggle()} />
          {phase === "idle"
            ? <Button variant="quiet" size="control" icon="play_arrow" onClick={() => void startRun()} disabled={paused}>Start run</Button>
            : <Button variant="quiet" size="control" icon="stop" onClick={endRun}>End run</Button>}
        </div>
        <SheetPanel padding={18} style={{ flex: "none", height: 252 }}>
          <div style={{ position: "relative", width: STAFF_W, height: 200 }}>
            <Staff
              systems={[{ clef, top: 46, keySignature: keySignatureFor(scale, clef), timeSignature: "common", timeLeft: 132 }]}
              layout={LAYOUT}
              notes={notes}
              rests={rests}
              regions={region}
              width={STAFF_W}
              height={170}
            />
            {fingerLabels.map((l, i) => (
              <span key={i} style={{ position: "absolute", left: l.x, top: 178, transform: "translateX(-50%)", fontFamily: "var(--kc-font-mono)", fontSize: 11, color: states.get(pageStart + i) === "missed" ? "var(--kc-clay)" : "var(--kc-paper-ink-dim)" }}>{l.f}</span>
            ))}
            <span style={{ position: "absolute", left: 12, top: 178, fontFamily: "var(--kc-font-mono)", fontSize: 10, letterSpacing: "0.07em", color: "var(--kc-paper-ink-dim)" }}>{upPage ? "UP" : "BACK"} · {hand === "LH" ? "LH" : "RH"}</span>
          </div>
        </SheetPanel>
        <Keyboard from={kbFrom} to={kbTo} tones={tones} height={88} onNoteOn={onKeyOn} onNoteOff={onKeyOff} disabled={paused} />
        <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "minmax(0, 1fr) 340px", gap: 14, paddingBottom: 22 }}>
          <div style={{ background: "var(--kc-panel)", border: "1px solid var(--kc-border)", borderRadius: 11, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14, minHeight: 0 }}>
            <SectionLabel>HOW EVEN EACH FINGER WAS</SectionLabel>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 10, flex: 1, minHeight: 0 }}>
              {chart.map((c, i) => (
                <React.Fragment key={i}>
                  {i === 5 && <div style={{ flex: "none", width: 1, height: "100%", background: "var(--kc-border)" }} />}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, justifyContent: "flex-end", height: "100%" }}>
                    <div style={{ width: "100%", height: `${c.pct}%`, background: c.empty ? "var(--kc-raised)" : c.worst ? "var(--kc-clay)" : "var(--kc-mint)", borderRadius: "4px 4px 0 0" }} />
                    <span style={{ fontFamily: "var(--kc-font-mono)", fontSize: 11, color: c.worst ? "var(--kc-clay)" : "var(--kc-ink-dim)" }}>{(i % 5) + 1}</span>
                  </div>
                </React.Fragment>
              ))}
            </div>
            <span style={{ fontSize: 14, color: "var(--kc-ink-muted)" }}>{chartCopy}</span>
          </div>
          <div style={{ background: "var(--kc-panel)", border: "1px solid var(--kc-border)", borderRadius: 11, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 12, minHeight: 0, overflow: "hidden" }}>
            <SectionLabel>THIS BLOCK</SectionLabel>
            <LogTable rows={rows} emphasize={1} />
            <p style={{ margin: "auto 0 0", fontSize: 14, lineHeight: 1.45, color: "var(--kc-ink-dim)" }}>{advice}</p>
          </div>
        </div>
      </div>
      <BottomBar
        actions={
          <>
            <Button variant="secondary" size="control" onClick={cycleHand} disabled={phase !== "idle" || paused}>{hand === "RH" ? "Left hand instead" : hand === "LH" ? "Hands together" : "Right hand instead"}</Button>
            {runIdx >= PLAN.length && phase === "idle" && <Button variant="secondary" size="control" onClick={() => void startRun()} disabled={paused}>One more run</Button>}
            <Button size="control" onClick={finishBlock} disabled={paused}>{nextTitle ? `Next — ${nextTitle}` : "Finish"}</Button>
          </>
        }
      >
        {measured ? (
          <div style={{ display: "flex", gap: 26 }}>
            <Metric label="NOTES EVEN" value={last?.score ? `${last.even} / ${last.total}` : phase === "run" ? `${progress} / ${run.length}` : "—"} />
            <Metric label="KEY TO KEY" value={last?.keyToKeyMs != null ? `±${last.keyToKeyMs} ms` : "—"} tone={last?.keyToKeyMs != null && last.keyToKeyMs > 60 ? "clay" : undefined} />
            <Metric label="TEMPO HELD" value={last?.tempoHeld ? `${last.tempoHeld} bpm` : `${bpm} bpm`} />
            <Metric label="CLEAN RUNS" value={`${cleanCount} / ${Math.max(runIdx, 1)}`} tone={cleanCount ? "mint" : undefined} />
            {wrong > 0 && phase === "run" && <Metric label="WRONG NOTES" value={wrong} tone="clay" />}
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
            <Metric label="RUNS" value={`${runIdx} / ${PLAN.length}`} />
            <Metric label="CLEAN" value={`${cleanCount} / ${Math.max(runIdx, 1)}`} tone={cleanCount ? "mint" : undefined} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <SectionLabel size="meta">HOW DID THAT RUN GO</SectionLabel>
              <div style={{ display: "flex", gap: 6 }}>
                {(["clean", "mostly", "stumbled"] as Report[]).map((r) => (
                  <Button key={r} variant="secondary" size="pill" disabled={paused} onClick={() => finishRun(r)}>{r.charAt(0).toUpperCase() + r.slice(1)}</Button>
                ))}
              </div>
            </div>
            <span style={{ fontSize: 14, color: "var(--kc-ink-faint)" }}>Nothing is listening. Mark each run as you go.</span>
          </div>
        )}
      </BottomBar>
    </>
  );
}

function worstFinger(runs: RunLog[]): { finger: number; ms: number; both: boolean } | null {
  const per: number[][] = Array.from({ length: 5 }, () => []);
  const perOct: number[][][] = [Array.from({ length: 5 }, () => []), Array.from({ length: 5 }, () => [])];
  for (const r of runs) r.fingers.forEach((v, i) => { if (Number.isFinite(v)) { per[i % 5].push(v); perOct[Math.floor(i / 5)][i % 5].push(v); } });
  const means = per.map((b) => (b.length ? b.reduce((a, v) => a + v, 0) / b.length : NaN));
  const valid = means.filter((m) => Number.isFinite(m));
  if (valid.length < 3) return null;
  const sorted = [...valid].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  let finger = -1;
  let worst = -Infinity;
  means.forEach((m, i) => { if (Number.isFinite(m) && m > worst) { worst = m; finger = i; } });
  const excess = worst - median;
  if (finger < 0 || excess < 25) return null;
  const both = perOct.every((o) => o[finger].length > 0);
  return { finger: finger + 1, ms: Math.round(excess / 5) * 5, both };
}

function fingerChart(runs: RunLog[]): { pct: number; worst: boolean; empty: boolean }[] {
  const acc: number[][] = Array.from({ length: 10 }, () => []);
  for (const r of runs) r.fingers.forEach((v, i) => { if (Number.isFinite(v)) acc[i].push(v); });
  const means = acc.map((b) => (b.length ? b.reduce((a, v) => a + v, 0) / b.length : NaN));
  const valid = means.filter((m) => Number.isFinite(m));
  if (!valid.length) return Array.from({ length: 10 }, () => ({ pct: 8, worst: false, empty: true }));
  const lo = Math.min(...valid);
  const hi = Math.max(...valid);
  const w = worstFinger(runs);
  return means.map((m, i) => (Number.isFinite(m)
    ? { pct: hi > lo ? 55 + Math.round(((m - lo) / (hi - lo)) * 41) : 70, worst: !!w && w.finger === (i % 5) + 1, empty: false }
    : { pct: 8, worst: false, empty: true }));
}
