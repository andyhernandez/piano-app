"use client";
import * as React from "react";
import { Button, Headline, IconButton, LogTable, Pill, SectionLabel, SheetPanel, Staff, Tempo, rhythmToStaff, type NoteState } from "@/components/ds";
import { useAudio } from "@/lib/hooks/use-audio";
import { useInput } from "@/lib/hooks/use-input";
import { scorePulseDrift, scoreTiming } from "@/lib/engine/scoring";
import { expectedOnsetsMs, generateRhythm, type RhythmPattern } from "@/lib/generator/rhythm";
import { PANEL, SIDE, type PartProps, type PulseResult } from "./shared";

const CLICK_BPM = 80;
const LISTEN_BEATS = 4;
const TAP_BEATS = 12;
const PATTERN_LEVELS = [2, 3, 4];
const STAGES = 1 + PATTERN_LEVELS.length;
type Phase = "idle" | "running" | "result";
interface StageResult { score: number; taps: number; expected: number; meanOffset: number }

/**
 * Timing, in the ear check's chrome. Stage one is the click: four beats to listen, twelve to tap along.
 * Then three written rhythms, each with a bar of count-in. The pulse number is half the click, half the rhythms.
 */
export function PulsePart({ paused, onDone }: PartProps<PulseResult>) {
  const { audio, unlock } = useAudio();
  const [patterns] = React.useState(() => { const s = Math.floor(Math.random() * 1e9); return PATTERN_LEVELS.map((l, i) => generateRhythm(l, `check-${s}-${i}`)); });
  const [stage, setStage] = React.useState(0);
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [beat, setBeat] = React.useState<number | null>(null);
  const [pos, setPos] = React.useState<number | null>(null);
  const [tapping, setTapping] = React.useState(false);
  const [padFlash, setPadFlash] = React.useState(0);
  const [tapCount, setTapCount] = React.useState(0);
  const [results, setResults] = React.useState<StageResult[]>([]);
  const phaseRef = React.useRef<Phase>("idle");
  const beatCount = React.useRef(0);
  const expected = React.useRef<number[]>([]);
  const taps = React.useRef<number[]>([]);
  const startMs = React.useRef(0);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => () => { audio.stopMetronome(); if (timer.current) clearTimeout(timer.current); }, [audio]);

  const pattern: RhythmPattern | null = stage > 0 ? patterns[stage - 1] : null;
  const isClick = stage === 0;

  const { tap } = useInput({
    onOnset: (e) => {
      if (phaseRef.current !== "running") return;
      taps.current.push(e.time);
      setTapCount((c) => c + 1);
      setPadFlash((f) => f + 1);
    },
  });

  // The space bar is a tap pad too.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      e.preventDefault();
      tap.tap();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tap]);

  const finishStage = React.useCallback((exp: number[], bpm: number, click: boolean) => {
    audio.stopMetronome();
    phaseRef.current = "result";
    const beatMs = 60_000 / bpm;
    const lo = (exp[0] ?? 0) - beatMs / 2;
    const hi = (exp[exp.length - 1] ?? 0) + beatMs / 2;
    const actual = taps.current.filter((t) => t >= lo && t <= hi);
    const r = scoreTiming(exp, actual, click ? 100 : 120);
    const score = click ? scorePulseDrift(exp, actual) : r.score;
    const meanOffset = r.deviations.length ? Math.round(r.deviations.reduce((s, d) => s + d, 0) / r.deviations.length) : 0;
    setResults((rs) => [...rs, { score, taps: actual.length, expected: exp.length, meanOffset }]);
    setBeat(null);
    setPos(null);
    setTapping(false);
    setPhase("result");
  }, [audio]);

  const start = async () => {
    if (paused || phase === "running") return;
    await unlock();
    if (!audio.ready) return;
    beatCount.current = 0;
    expected.current = [];
    taps.current = [];
    setTapCount(0);
    setTapping(false);
    setPos(null);
    phaseRef.current = "running";
    setPhase("running");
    if (isClick) {
      audio.startMetronome({
        bpm: CLICK_BPM, beatsPerBar: 4,
        onBeat: () => {
          const b = beatCount.current++;
          setBeat(b % 4);
          if (b >= LISTEN_BEATS && b < LISTEN_BEATS + TAP_BEATS) { expected.current.push(performance.now()); setTapping(true); }
          if (b === LISTEN_BEATS + TAP_BEATS - 1) { timer.current = setTimeout(() => finishStage(expected.current, CLICK_BPM, true), (60_000 / CLICK_BPM) * 0.6); }
        },
      });
    } else if (pattern) {
      const p = pattern;
      const total = p.bars * p.beatsPerBar;
      audio.startMetronome({
        bpm: p.bpm, beatsPerBar: p.beatsPerBar,
        onBeat: () => {
          const b = beatCount.current++;
          setBeat(b % p.beatsPerBar);
          if (b < p.beatsPerBar) return;
          const pos = b - p.beatsPerBar;
          if (pos === 0) { startMs.current = performance.now(); expected.current = expectedOnsetsMs(p).map((ms) => startMs.current + ms); setTapping(true); }
          if (pos < total) setPos(pos);
          if (pos === total - 1) { timer.current = setTimeout(() => finishStage(expected.current, p.bpm, false), (60_000 / p.bpm) * 0.75); }
        },
      });
    }
  };

  const hear = async () => {
    if (!pattern || paused || phase === "running") return;
    await unlock();
    const t0 = audio.now() + 0.1;
    const beatSec = 60 / pattern.bpm;
    for (let b = 0; b < pattern.bars * pattern.beatsPerBar; b++) audio.click(b % pattern.beatsPerBar === 0, t0 + b * beatSec);
    for (const ms of expectedOnsetsMs(pattern)) audio.playNote(71, 0.25, 0.9, t0 + ms / 1000);
  };

  const next = () => {
    if (stage + 1 < STAGES) { setStage(stage + 1); setPhase("idle"); phaseRef.current = "idle"; setBeat(null); setPos(null); setTapCount(0); return; }
    const click = results[0];
    const pats = results.slice(1).map((r) => r.score);
    const meanPat = pats.length ? pats.reduce((s, v) => s + v, 0) / pats.length : 0;
    onDone({ score: Math.round(0.5 * (click?.score ?? 0) + 0.5 * meanPat), clickScore: click?.score ?? 0, clickBpm: CLICK_BPM, meanOffsetMs: click?.meanOffset ?? 0, taps: click?.taps ?? 0, expected: click?.expected ?? 0, patternScores: pats });
  };

  const current = results[stage];
  const stageLabel = (i: number) => (i === 0 ? "CLICK" : `LEVEL ${PATTERN_LEVELS[i - 1]}`);
  const logRows = Array.from({ length: STAGES }, (_, i) => {
    const r = results[i];
    const status = r ? String(r.score) : i === stage ? (phase === "running" ? "TAPPING" : "NEXT") : "—";
    return { cells: [String(i + 1), stageLabel(i), status], marked: !!r && r.score >= 70 };
  });
  const lastResult = results[results.length - 1];
  const note = !lastResult
    ? "Four beats to listen, twelve to tap. Then three written rhythms, each after a bar of count-in."
    : lastResult.meanOffset === 0 ? `${lastResult.taps} of ${lastResult.expected} taps inside the window.`
      : `${lastResult.taps} of ${lastResult.expected} taps inside the window, ${Math.abs(lastResult.meanOffset)} ms ${lastResult.meanOffset < 0 ? "ahead of" : "behind"} the beat on average.`;

  const staff = pattern ? rhythmToStaff(pattern, new Map<number, NoteState>()) : null;
  const title = isClick ? <>Tap along · <Tempo bpm={CLICK_BPM} /></> : <>Rhythm {stage} of {PATTERN_LEVELS.length} · <Tempo bpm={pattern!.bpm} /></>;
  const sub = isClick ? "Four beats to listen, then twelve to tap" : "One bar of count-in, then tap what is written";
  const pill = phase === "running" ? (tapping ? "Tap" : "Listen") : phase === "result" ? `Scored ${current?.score ?? 0}` : "Ready";
  const feedback = phase === "running" ? (tapping ? `${tapCount} tap${tapCount === 1 ? "" : "s"} so far.` : "Listen for the beat.") : current ? note : isClick ? "Press play to start the click. Tap the pad, the space bar, or any key on the keyboard." : "Hear it first if you like, then press play for the count-in.";

  return (
    <div style={{ flex: 1, minHeight: 0, padding: "34px 38px", display: "flex", flexDirection: "column", gap: 24 }}>
      <Headline size={34} title="Tap with the click." lede="Keep the beat with whatever is under your hand: a key, the pad below, or the space bar. Early and late both count as drift." />
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "1fr 300px", gap: 18 }}>
        <div style={PANEL}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <IconButton icon={phase === "running" ? "graphic_eq" : "play_arrow"} size={52} label={isClick ? "Start the click" : "Start the count-in"} disabled={paused || phase === "running"} onClick={() => void start()} style={phase === "running" ? { borderColor: "var(--kc-mint)", color: "var(--kc-mint)" } : undefined} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 17, fontWeight: 600 }}>{title}</div>
              <div style={{ fontSize: 14, color: "var(--kc-ink-dim)" }}>{sub}</div>
            </div>
            {!isClick && phase !== "running" && <Button variant="secondary" size="control" icon="volume_up" onClick={() => void hear()}>Hear it</Button>}
            <Pill tone={phase === "running" && tapping ? "mint" : "neutral"}>{pill}</Pill>
          </div>
          {isClick ? (
            <div style={{ display: "flex", gap: 10 }}>
              {[0, 1, 2, 3].map((b) => (
                <div key={b} style={{ flex: 1, height: 64, borderRadius: 10, boxSizing: "border-box", background: beat === b ? "var(--kc-mint-wash)" : "var(--kc-base)", border: beat === b ? "1.5px solid var(--kc-mint)" : "1px solid var(--kc-border)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--kc-font-mono)", fontSize: 20, color: beat === b ? "var(--kc-mint)" : "var(--kc-ink-faint)" }}>{b + 1}</div>
              ))}
            </div>
          ) : (
            <SheetPanel padding={14} style={{ flex: "none", height: 150 }}>
              <Staff notes={staff!.notes} rests={staff!.rests} systems={[{ clef: "none", top: 40, timeSignature: [4, 4], timeLeft: 20 }]} layout={{ bars: staff!.bars, beatsPerBar: 4, left: 70, right: 30 }} regions={pos != null && tapping ? [{ bar: Math.floor(pos / 4), beat: pos % 4, width: 40 }] : []} width={980} height={120} lineGap={18} />
            </SheetPanel>
          )}
          <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center" }}>
            <button type="button" aria-label="Tap pad" onPointerDown={(e) => { e.preventDefault(); tap.tap(); }} disabled={paused} style={{ width: "100%", height: 132, borderRadius: 10, background: padFlash % 2 && phase === "running" ? "var(--kc-mint-wash)" : "var(--kc-raised)", border: "1px solid var(--kc-border)", color: "var(--kc-ink-muted)", fontFamily: "var(--kc-font-mono)", fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer", touchAction: "none", userSelect: "none" }}>
              Tap · or press space
            </button>
          </div>
          <div style={{ fontSize: 15, color: "var(--kc-ink-muted)" }}>{feedback}</div>
        </div>
        <div style={SIDE}>
          <SectionLabel>So far</SectionLabel>
          <LogTable rows={logRows} emphasize={1} />
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45, color: "var(--kc-ink-dim)" }}>{note}</p>
          <div style={{ marginTop: "auto" }}>
            <Button style={{ width: "100%" }} disabled={paused || phase === "running" || !current} onClick={next}>{stage + 1 < STAGES ? "Next rhythm" : "See the result"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
