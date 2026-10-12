"use client";
import * as React from "react";
import { Button, Instruction, NotationGlyph, SheetPanel, Staff, StatChip, rhythmToStaff, type NoteState } from "@/components/ds";
import { useAudio } from "@/lib/hooks/use-audio";
import { useInput } from "@/lib/hooks/use-input";
import { eventTimeMs } from "@/lib/input/source";
import { scorePulseDrift, scoreTiming } from "@/lib/engine/scoring";
import { expectedOnsetsMs, generateRhythm, type RhythmPattern } from "@/lib/generator/rhythm";
import { CARD_TITLE, NOTE, PANEL, PartBar, type PartProps, type PulseResult } from "./shared";

const CLICK_BPM = 76;
const LISTEN_BEATS = 4;
const TAP_BEATS = 8;
const PATTERN_LEVELS = [2, 3, 4];
const STAGES = 1 + PATTERN_LEVELS.length;
type Phase = "idle" | "running" | "result";
interface StageResult { score: number; taps: number; expected: number; meanOffset: number; offsets: number[] }

/**
 * B3 · Timing. Stage one is the click: four beats to listen, eight to tap along. Then three written rhythms,
 * each with a bar of count-in. The pulse number is half the click, half the rhythms.
 */
export function PulsePart({ paused, onDone }: PartProps<PulseResult>) {
  const { audio, unlock } = useAudio();
  const [patterns] = React.useState(() => { const s = Math.floor(Math.random() * 1e9); return PATTERN_LEVELS.map((l, i) => generateRhythm(l, `check-${s}-${i}`)); });
  const [stage, setStage] = React.useState(0);
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [pos, setPos] = React.useState<number | null>(null);
  const [tapping, setTapping] = React.useState(false);
  const [padFlash, setPadFlash] = React.useState(0);
  const [tapCount, setTapCount] = React.useState(0);
  const [liveOffsets, setLiveOffsets] = React.useState<(number | null)[]>([]);
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
      // Live lanes: the nearest expected beat this tap belongs to.
      const exp = expected.current;
      if (exp.length) {
        let bi = 0;
        for (let i = 0; i < exp.length; i++) if (Math.abs(exp[i] - e.time) < Math.abs(exp[bi] - e.time)) bi = i;
        const off = Math.round(e.time - exp[bi]);
        setLiveOffsets((o) => { const n = [...o]; n[bi] = off; return n; });
      }
    },
  });

  // The space bar is a tap pad too.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      e.preventDefault();
      tap.tap(eventTimeMs(e));
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
    setResults((rs) => [...rs, { score, taps: actual.length, expected: exp.length, meanOffset, offsets: r.deviations }]);
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
    setLiveOffsets([]);
    phaseRef.current = "running";
    setPhase("running");
    if (isClick) {
      audio.startMetronome({
        bpm: CLICK_BPM, beatsPerBar: 4,
        onBeat: () => {
          const b = beatCount.current++;
          if (b >= LISTEN_BEATS && b < LISTEN_BEATS + TAP_BEATS) { expected.current.push(performance.now()); setTapping(true); setPos(b - LISTEN_BEATS); }
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
          if (b < p.beatsPerBar) return;
          const at = b - p.beatsPerBar;
          if (at === 0) { startMs.current = performance.now(); expected.current = expectedOnsetsMs(p).map((ms) => startMs.current + ms); setTapping(true); }
          if (at < total) setPos(at);
          if (at === total - 1) { timer.current = setTimeout(() => finishStage(expected.current, p.bpm, false), (60_000 / p.bpm) * 0.75); }
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

  const startOver = () => { audio.stopMetronome(); if (timer.current) clearTimeout(timer.current); phaseRef.current = "idle"; setPhase("idle"); setResults((rs) => rs.slice(0, stage)); setPos(null); setTapCount(0); setLiveOffsets([]); setTapping(false); };

  const next = () => {
    if (stage + 1 < STAGES) { setStage(stage + 1); setPhase("idle"); phaseRef.current = "idle"; setPos(null); setTapCount(0); setLiveOffsets([]); return; }
    const click = results[0];
    const pats = results.slice(1).map((r) => r.score);
    const meanPat = pats.length ? pats.reduce((s, v) => s + v, 0) / pats.length : 0;
    onDone({ score: Math.round(0.5 * (click?.score ?? 0) + 0.5 * meanPat), clickScore: click?.score ?? 0, clickBpm: CLICK_BPM, meanOffsetMs: click?.meanOffset ?? 0, taps: click?.taps ?? 0, expected: click?.expected ?? 0, patternScores: pats });
  };

  const current = results[stage];
  const bpm = isClick ? CLICK_BPM : pattern!.bpm;
  const lanes = isClick ? TAP_BEATS : (pattern ? pattern.bars * pattern.beatsPerBar : 8);
  const offsets: (number | null)[] = current ? current.offsets.map((d) => Math.round(d)) : liveOffsets;
  const spread = current ? Math.round(Math.sqrt(current.offsets.reduce((s, d) => s + (d - current.meanOffset) ** 2, 0) / Math.max(1, current.offsets.length))) : null;

  const instruction = isClick
    ? phase === "running" ? (tapping ? "Tap with every click." : "Listen for the beat…") : "Tap along with the click — any key, or the big pad."
    : phase === "running" ? (tapping ? "Tap what is written." : "One bar of count-in…") : `Rhythm ${stage} of ${PATTERN_LEVELS.length}. Hear it first if you like, then tap it from the page.`;
  const laneNote = current
    ? current.meanOffset === 0 ? "Right on the line, every tap." : `Mint dots are your taps. They sit a little to the ${current.meanOffset < 0 ? "left" : "right"} of each line — ${current.meanOffset < 0 ? "a touch eager" : "a touch late"}${spread !== null && spread <= 25 ? ", and very even about it" : ""}.`
    : phase === "running" ? "Each tap lands on a lane as you go." : "Each lane is one click. Your taps show as mint dots, left for early and right for late.";
  const staff = pattern ? rhythmToStaff(pattern, new Map<number, NoteState>()) : null;

  return (
    <>
      <div style={{ flex: 1, minHeight: 0, padding: "30px 32px", display: "flex", flexDirection: "column", gap: 18 }}>
        <Instruction>{instruction}</Instruction>
        <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "300px minmax(0, 1fr)", gap: 24, alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <button
              type="button"
              aria-label="Tap pad"
              onPointerDown={(e) => { e.preventDefault(); if (phase === "idle" && !paused) { void start(); return; } tap.tap(eventTimeMs(e)); }}
              disabled={paused}
              className="kc-press"
              style={{ width: 260, height: 260, border: "none", borderRadius: "50%", background: "var(--kc-indigo)", color: "#ffffff", fontFamily: "var(--kc-font-display)", fontSize: 44, fontWeight: 600, boxShadow: `0 10px 0 0 var(--kc-indigo-shadow), 0 0 0 ${padFlash % 2 && phase === "running" ? 20 : 14}px var(--kc-indigo-wash)`, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 6, cursor: "pointer", touchAction: "none", userSelect: "none", transform: padFlash % 2 && phase === "running" ? "translateY(4px)" : undefined }}
            >
              {phase === "idle" ? "START" : "TAP"}
              <span style={{ fontSize: 18, fontWeight: 500 }}><NotationGlyph name="note-quarter" context="inline" size={18} color="currentColor" />{bpm}</span>
            </button>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--kc-ink-faint)" }}>or the space bar, or any key</span>
          </div>
          <div style={{ ...PANEL, padding: "22px 24px", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 20, fontWeight: 600, lineHeight: 1.15 }}>{isClick ? "Your taps against the click" : "Tap what is written"}</div>
              <span style={{ marginLeft: "auto", fontSize: 14, fontWeight: 800, color: "var(--kc-ink-faint)" }}>{isClick ? `bars 1–${TAP_BEATS / 4}` : `${pattern!.bars} bars · level ${PATTERN_LEVELS[stage - 1]}`}</span>
            </div>
            {!isClick && staff && (
              <SheetPanel padding={12} style={{ flex: "none", height: 130 }}>
                <Staff notes={staff.notes} rests={staff.rests} systems={[{ clef: "none", top: 34, timeSignature: [4, 4], timeLeft: 20 }]} layout={{ bars: staff.bars, beatsPerBar: 4, left: 70, right: 30 }} regions={pos != null && tapping ? [{ bar: Math.floor(pos / 4), beat: pos % 4, width: 40 }] : []} width={640} height={104} lineGap={14} />
              </SheetPanel>
            )}
            <div style={{ display: "flex" }}>
              {Array.from({ length: lanes }, (_, i) => {
                const off = offsets[i];
                const strong = isClick ? i % 4 === 0 : i % (pattern?.beatsPerBar ?? 4) === 0;
                const live = phase === "running" && pos === i;
                return (
                  <div key={i} style={{ flex: 1, position: "relative", height: 70, display: "flex", justifyContent: "center" }}>
                    <span style={{ position: "absolute", top: 0, bottom: 0, width: 3, borderRadius: 2, background: live ? "var(--kc-indigo)" : strong ? "var(--kc-ink)" : "var(--kc-border)" }} />
                    {off != null && <span style={{ position: "absolute", top: 22, left: `calc(50% + ${Math.max(-40, Math.min(40, off / 5))}px - 12px)`, width: 24, height: 24, borderRadius: "50%", background: "var(--kc-mint)", border: "3px solid #ffffff", boxShadow: "0 0 0 2px var(--kc-mint-ink)" }} />}
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 800, color: "var(--kc-ink-faint)" }}>
              <span>← early</span><span>on the click</span><span>late →</span>
            </div>
            <div style={NOTE}>{laneNote}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ ...CARD_TITLE, fontSize: 17 }}>Next:</div>
          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--kc-ink-muted)" }}>{isClick ? "three written rhythms to tap from the page" : stage < PATTERN_LEVELS.length ? `rhythm ${stage + 1} of ${PATTERN_LEVELS.length}, a little harder` : "your result from all five parts"}</span>
        </div>
      </div>
      <PartBar actions={
        <>
          {!isClick && phase !== "running" && <Button variant="secondary" size="control" icon="volume_up" disabled={paused} onClick={() => void hear()}>Hear it</Button>}
          {phase === "result" && <Button variant="secondary" size="control" icon="restart_alt" disabled={paused} onClick={startOver}>Start over</Button>}
          {phase === "idle" && <Button size="control" icon="play_arrow" disabled={paused} onClick={() => void start()}>{isClick ? "Start the click" : "Start the count-in"}</Button>}
          {phase === "result" && <Button size="control" iconAfter icon="arrow_forward" disabled={paused} onClick={next}>{stage + 1 < STAGES ? "Next rhythm" : "Next — scales"}</Button>}
        </>
      }>
        <StatChip tone="indigo" icon="speed" line1={current ? (current.meanOffset === 0 ? "On the beat" : `${Math.abs(current.meanOffset)} ms ${current.meanOffset < 0 ? "early" : "late"}`) : "Drift"} line2={current ? (spread !== null && spread <= 25 ? "steady, every tap" : spread !== null && spread <= 60 ? "mostly steady" : "wandered a little") : "early and late both count"} />
        <StatChip tone="mint" value={current ? current.taps : tapCount} unit={`/${current ? current.expected : lanes}`} label={<>taps<br />{current ? "landed" : "so far"}</>} />
      </PartBar>
    </>
  );
}
