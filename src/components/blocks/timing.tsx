"use client";
import * as React from "react";
import type { BlockProps } from "./types";
import type { MidiScore } from "@/lib/types";
import type { NoteState } from "@/components/ds";
import { BottomBar, Button, Choice, Instruction, Pill, SheetPanel, Staff, StatChip, Tempo, rhythmToStaff } from "@/components/ds";
import { useAudio } from "@/lib/hooks/use-audio";
import { useInput } from "@/lib/hooks/use-input";
import { useAppStore } from "@/lib/store/app-store";
import { alignTaps, scoreRhythm, scoreTiming, timingWindowMs } from "@/lib/engine/scoring";
import { eventTimeMs } from "@/lib/input/source";
import { expectedOnsetsMs, generateDifferent, generateEcho, generateRhythm, RHYTHM_LEVELS, type RhythmPattern } from "@/lib/generator/rhythm";
import { startBeatClock, audioTimeToPerfMs, meanSd } from "./shared/beat-clock";
import { CARD, CardTitle, MetronomeDots, NOTE, NextStopButton, PAGE, RecordControl, SMALL, useBlockRecorder } from "./shared/controls";

/*
 * Timing (D2). A written rhythm on one line; the click plays it once, counts in, and the student taps it back —
 * on the pad (the whole taps card), the space bar, any key of the keyboard, or into the microphone. Each tap
 * is shown against its note: mint within 15 ms, lilac when it pulled ahead or dragged. Two clean rounds in a
 * row move the level up. Echo rounds hide the page: hear it, tap it back, then see it written.
 */

type Game = "clap" | "echo";
type Phase = "idle" | "countin-listen" | "listen" | "countin-tap" | "tap";
const MAX_LEVEL = RHYTHM_LEVELS.length;
const RHYTHM_NOTE = 79;
const STAFF_W = 1040;
/** A tap this close to its note is "on the beat". */
const TOL_MS = 15;
/** Only mention rushing/dragging when the whole round sat this far off the click. */
const OFFSET_NOTE_MS = 60;
const GAMES: Game[] = ["clap", "echo"];
const GAME_LABELS: Record<Game, string> = { clap: "With the page", echo: "Echo" };

interface Round { seed: string; game: Game; level: number; bpm: number; score: MidiScore; hits: number; total: number; aheadMs: number; steadiness: number; clean: boolean; states: Map<number, NoteState>; devs: (number | null)[] }

const clampLevel = (l: number) => Math.max(1, Math.min(MAX_LEVEL, Math.round(l)));

/** Greedy nearest matching, for the page: the deviation of the tap each written note got, null when it got none. */
function matchDeviations(expected: number[], actual: number[], windowMs = 120): (number | null)[] {
  const used = new Set<number>();
  return expected.map((e) => {
    let best = -1;
    let bestDelta = Infinity;
    actual.forEach((a, i) => { if (used.has(i)) return; const d = Math.abs(a - e); if (d < bestDelta) { bestDelta = d; best = i; } });
    if (best >= 0 && bestDelta <= windowMs) { used.add(best); return actual[best] - e; }
    return null;
  });
}

/** "the dotted quarter", "the eighths". */
function valueName(beats: number, plural: boolean): string {
  const names: Record<string, string> = { "4": "whole note", "3": "dotted half", "2": "half note", "1.5": "dotted quarter", "1": "quarter", "0.75": "dotted eighth", "0.5": "eighth", "0.25": "sixteenth" };
  const n = names[String(beats)] ?? "note";
  return plural ? `${n}s` : n;
}

export function TimingBlock({ child, session, inputMode, timeUp, paused, nextTitle, onDone, setMeta, setRecording }: BlockProps) {
  const { audio, unlock } = useAudio();
  const updateSettings = useAppStore((s) => s.updateSettings);

  const [game, setGame] = React.useState<Game>("clap");
  const [level, setLevel] = React.useState(() => clampLevel(child.settings.rhythmLevel || 1));
  const [bpm, setBpm] = React.useState(() => RHYTHM_LEVELS[clampLevel(child.settings.rhythmLevel || 1) - 1].bpm);
  const [pattern, setPattern] = React.useState<RhythmPattern>(() => generateRhythm(clampLevel(child.settings.rhythmLevel || 1)));
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [beat, setBeat] = React.useState<number | null>(null);
  const [countLabel, setCountLabel] = React.useState<string | null>(null);
  const [activeBeat, setActiveBeat] = React.useState<number | null>(null);
  const [rounds, setRounds] = React.useState<Round[]>([]);
  const [tapsShown, setTapsShown] = React.useState(0);
  const [promoted, setPromoted] = React.useState(false);
  const [padDown, setPadDown] = React.useState(false);

  const phaseRef = React.useRef<Phase>("idle");
  const patternRef = React.useRef(pattern);
  const tapsRef = React.useRef<number[]>([]);
  const startMsRef = React.useRef(0);
  const beatCounterRef = React.useRef(-1);
  const stopClockRef = React.useRef<(() => void) | null>(null);
  const timeouts = React.useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const cleanStreakRef = React.useRef(0);
  React.useEffect(() => { patternRef.current = pattern; });
  React.useEffect(() => {
    const set = timeouts.current;
    return () => { for (const id of set) clearTimeout(id); set.clear(); stopClockRef.current?.(); };
  }, []);

  const spec = RHYTHM_LEVELS[level - 1];
  React.useEffect(() => {
    setMeta?.(<>{spec.title} · level {level} · <Tempo bpm={bpm} /></>);
    return () => setMeta?.(null);
  }, [setMeta, level, spec.title, bpm]);

  const recorder = useBlockRecorder({ child, session, type: "rhythm", title: `Timing, level ${level}`, setRecording });

  const later = React.useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => { timeouts.current.delete(id); fn(); }, ms);
    timeouts.current.add(id);
  }, []);
  const setPhaseBoth = React.useCallback((p: Phase) => { phaseRef.current = p; setPhase(p); }, []);
  const stopEverything = React.useCallback(() => {
    stopClockRef.current?.();
    stopClockRef.current = null;
    setBeat(null);
    setCountLabel(null);
    setActiveBeat(null);
  }, []);

  const { tap } = useInput({
    onOnset: (e) => {
      const p = phaseRef.current;
      if (p === "tap" || p === "countin-tap") { tapsRef.current.push(e.time); setTapsShown(tapsRef.current.length); }
    },
  });

  const finishRound = React.useCallback(() => {
    const p = patternRef.current;
    stopEverything();
    setPhaseBoth("idle");
    const expected = expectedOnsetsMs(p);
    // Taps are stamped when the finger lands; the click reached the ear outputLatency later than scheduled.
    const latency = audio.outputLatencyMs();
    const raw = tapsRef.current.map((t) => t - startMsRef.current - latency).filter((t) => t >= -250);
    // Grade the shape of the rhythm, not the constant offset a kid (or the iPad's speaker) adds to every tap.
    const { actual, offsetMs } = alignTaps(expected, raw);
    const windowMs = timingWindowMs(expected);
    const score = scoreRhythm(expected, actual, inputMode, windowMs);
    const timing = scoreTiming(expected, actual, windowMs);
    const { sd } = meanSd(timing.deviations);
    const aheadMs = timing.deviations.length ? -Math.round(offsetMs) : 0;
    const steadiness = timing.deviations.length ? Math.round(100 * (1 - Math.min(1, sd / 120))) : 0;
    const devs = matchDeviations(expected, actual, windowMs);
    const states = new Map<number, NoteState>();
    let k = 0;
    p.notes.forEach((n, i) => { if (!n.rest) states.set(i, devs[k++] !== null ? "played" : "missed"); });
    const clean = score.badge === "steady-pulse" || (timing.hits === expected.length && timing.extras === 0);
    setRounds((r) => [...r, { seed: p.seed, game, level, bpm, score, hits: timing.hits, total: expected.length, aheadMs, steadiness, clean, states, devs }]);
    if (clean) {
      cleanStreakRef.current += 1;
      if (cleanStreakRef.current >= 2 && level < MAX_LEVEL) {
        const next = level + 1;
        cleanStreakRef.current = 0;
        setLevel(next);
        setBpm(RHYTHM_LEVELS[next - 1].bpm);
        setPromoted(true);
        void updateSettings(child.id, { rhythmLevel: next });
      }
    } else {
      cleanStreakRef.current = 0;
    }
  }, [stopEverything, setPhaseBoth, inputMode, game, level, bpm, updateSettings, child.id, audio]);
  const finishRef = React.useRef(finishRound);
  React.useEffect(() => { finishRef.current = finishRound; });

  const startRound = async (p: RhythmPattern) => {
    await unlock();
    stopEverything();
    patternRef.current = p;
    setPattern(p);
    tapsRef.current = [];
    setTapsShown(0);
    beatCounterRef.current = -1;
    const countIn = child.settings.countIn ? 4 : 0;
    const patBeats = p.bars * p.beatsPerBar;
    const beatSec = 60 / p.bpm;
    const listenStart = countIn;
    const tapCountStart = listenStart + patBeats;
    const tapStart = tapCountStart + Math.max(countIn, 0);
    const end = tapStart + patBeats;
    setPhaseBoth(countIn ? "countin-listen" : "listen");
    stopClockRef.current = startBeatClock(audio, p.bpm, (b, time) => {
      beatCounterRef.current += 1;
      const n = beatCounterRef.current;
      setBeat(b);
      if (n < listenStart) {
        setPhaseBoth("countin-listen");
        setCountLabel(String(n + 1));
        setActiveBeat(null);
      } else if (n < tapCountStart) {
        const pb = n - listenStart;
        setPhaseBoth("listen");
        setCountLabel("Listen");
        setActiveBeat(pb);
        p.notes.forEach((note) => {
          if (note.rest || note.onset < pb || note.onset >= pb + 1) return;
          audio.playNote(RHYTHM_NOTE, 0.12, 0.9, time + (note.onset - pb) * beatSec);
        });
      } else if (n < tapStart) {
        if (n === tapCountStart) { tapsRef.current = []; setTapsShown(0); }
        setPhaseBoth("countin-tap");
        setCountLabel(String(n - tapCountStart + 1));
        setActiveBeat(null);
      } else if (n < end) {
        if (n === tapStart) {
          startMsRef.current = audioTimeToPerfMs(audio, time);
          setPhaseBoth("tap");
        }
        setCountLabel("Tap");
        setActiveBeat(n - tapStart);
      } else if (n === end) {
        setCountLabel(null);
        setActiveBeat(null);
        later(() => finishRef.current(), 300);
      }
    });
  };

  const newPattern = (g: Game = game, l = level, tempo = bpm) =>
    ({ ...generateDifferent(() => (g === "echo" ? generateEcho(l) : generateRhythm(l)), patternRef.current), bpm: tempo });
  const playNew = () => void startRound(newPattern());
  const stopRound = () => { stopEverything(); setPhaseBoth("idle"); };
  const switchGame = (g: Game) => {
    if (g === game) return;
    stopRound();
    setGame(g);
    setPattern(newPattern(g));
  };
  const changeLevel = (delta: number) => {
    const next = clampLevel(level + delta);
    if (next === level) return;
    stopRound();
    cleanStreakRef.current = 0;
    setLevel(next);
    setBpm(RHYTHM_LEVELS[next - 1].bpm);
    setPattern(newPattern(game, next, RHYTHM_LEVELS[next - 1].bpm));
    void updateSettings(child.id, { rhythmLevel: next });
  };
  const slower = () => setBpm((b) => Math.max(50, b - 4));

  const roundActive = phase !== "idle";
  React.useEffect(() => {
    if (!roundActive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      e.preventDefault();
      tap.tap(eventTimeMs(e));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [roundActive, tap]);

  // The runner paused the block: stop the click and the round.
  React.useEffect(() => {
    if (!paused) return;
    stopClockRef.current?.();
    stopClockRef.current = null;
    const id = setTimeout(() => { stopEverything(); setPhaseBoth("idle"); }, 0);
    return () => clearTimeout(id);
  }, [paused, stopEverything, setPhaseBoth]);

  const finishBlock = () => {
    stopRound();
    const best = rounds.slice().sort((a, b) => b.score.score - a.score.score)[0];
    const measured = rounds.filter((r) => r.total > 0);
    const aheadMs = measured.length ? Math.round(measured.reduce((a, r) => a + r.aheadMs, 0) / measured.length) : null;
    onDone({
      completed: true,
      skipped: false,
      midiScore: best?.score,
      recordingId: recorder.recordingId,
      inputMode,
      details: { level, bpm, rounds: rounds.length, clean: rounds.filter((r) => r.clean).length, aheadMs, game, promoted },
    });
  };

  // ---- view ----
  const last = rounds[rounds.length - 1];
  const showLast = phase === "idle" && last && last.states.size && last.seed === pattern.seed;
  const liveStates = React.useMemo(() => {
    const m = new Map<number, NoteState>();
    if (phase === "listen" || phase === "tap") pattern.notes.forEach((n, i) => { if (!n.rest && activeBeat !== null && n.onset >= activeBeat && n.onset < activeBeat + 1) m.set(i, "current"); });
    return m;
  }, [phase, pattern, activeBeat]);
  const staff = rhythmToStaff(pattern, showLast ? last.states : liveStates);
  const hidePage = game === "echo" && (roundActive || (!rounds.length && phase === "idle"));
  const region = activeBeat !== null && (phase === "listen" || phase === "tap") ? [{ bar: Math.floor(activeBeat / pattern.beatsPerBar), beat: activeBeat % pattern.beatsPerBar, width: (STAFF_W - 136) / pattern.bars / pattern.beatsPerBar }] : [];

  // The taps against the beat: one column per written note, the dot where its tap landed.
  const played = pattern.notes.filter((n) => !n.rest);
  const devs: (number | null)[] = showLast ? last.devs : played.map(() => null);
  const ballAt = activeBeat !== null && (phase === "listen" || phase === "tap") ? played.findIndex((n) => n.onset >= activeBeat && n.onset < activeBeat + 1) : -1;
  const offNotes = showLast ? played.map((n, i) => ({ n, d: devs[i] })).filter((x) => x.d !== null && Math.abs(x.d) > TOL_MS) : [];
  const early = offNotes.length ? offNotes.reduce((s, x) => s + (x.d as number), 0) < 0 : (last?.aheadMs ?? 0) > 0;
  const offValue = offNotes.length
    ? Object.entries(offNotes.reduce<Record<string, number>>((acc, x) => { acc[x.n.beats] = (acc[x.n.beats] ?? 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1])[0]
    : null;
  const offName = offValue ? valueName(Number(offValue[0]), offValue[1] > 1) : null;

  const instruction = paused
    ? "Paused."
    : phase === "countin-listen" ? "Count-in. The rhythm plays once on top of the click."
    : phase === "listen" ? (game === "echo" ? "Listen. Don't tap yet." : "Listen — ride the bouncing ball.")
    : phase === "countin-tap" ? "Now you. Tap it back with the click."
    : phase === "tap" ? "Tap it back — any key, or the card below."
    : timeUp ? `Time. One more round, or on to ${nextTitle ?? "the summary"}.`
    : rounds.length === 0 ? (game === "echo" ? "Hear a bar, tap it back, then see it written." : "Tap the pattern — any key, or the card below. Ride the bouncing ball.")
    : promoted ? `Two clean rounds. Level ${level} from here — ${spec.title.toLowerCase()}.`
    : last?.clean ? "Clean. One more like that moves the level up."
    : Math.abs(last?.aheadMs ?? 0) >= OFFSET_NOTE_MS ? `Taps ran ${Math.abs(last.aheadMs)} ms ${last.aheadMs > 0 ? "ahead of" : "behind"} the click. Count the bar out loud.`
    : `${last.hits} of ${last.total}. Same tempo again.`;

  const tapsNote = !showLast
    ? roundActive ? `${tapsShown} tapped so far.` : "Each dot shows where a tap landed against its note. Hear it first, then tap it back."
    : offNotes.length === 0
      ? last.hits === last.total ? "Every tap within 15 ms of its note. That's a steady pulse." : `${last.total - last.hits} note${last.total - last.hits === 1 ? "" : "s"} got no tap. The dots you have are on the beat.`
      : `The ${offName} ${early ? "pull ahead" : "drag"} — lilac dots are more than 15 ms ${early ? "early" : "late"}. ${early ? "Lean back on the dot." : "Lean into the dot."}`;

  const cleanCount = rounds.filter((r) => r.clean).length;
  const chipAhead = last ? Math.abs(last.aheadMs) : 0;

  return (
    <>
      <div style={PAGE}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Instruction style={{ flex: 1, minWidth: 0 }}>{instruction}</Instruction>
          <Pill tone={phase === "tap" ? "mint" : "neutral"}>{countLabel ? countLabel : `Level ${level}`}</Pill>
          <MetronomeDots beat={beat} />
          <Choice options={GAMES} value={game} onChange={switchGame} labels={GAME_LABELS} />
          <Button variant="secondary" size="pill" disabled={roundActive || level <= 1} onClick={() => changeLevel(-1)}>Easier</Button>
          <Button variant="secondary" size="pill" disabled={roundActive || level >= MAX_LEVEL} onClick={() => changeLevel(1)}>Harder</Button>
          <RecordControl recording={recorder.recording} supported={recorder.supported} onToggle={() => void recorder.toggle()} />
        </div>
        <SheetPanel padding={16} style={{ flex: "none", height: 190 }}>
          {hidePage ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: "var(--kc-ink-faint)" }}>
              <span style={{ fontFamily: "var(--kc-font-music)", fontSize: 40, lineHeight: 1, color: "var(--kc-ink)" }}>{"\u{1D160}"}</span>
              <span style={{ fontSize: 15, fontWeight: 700 }}>{phase === "listen" || phase === "countin-listen" ? "Listen." : phase === "tap" || phase === "countin-tap" ? "Tap it back." : "One bar. Hear it, tap it back, then see it written."}</span>
            </div>
          ) : (
            <Staff
              systems={[{ clef: "none", top: 40, timeSignature: [pattern.beatsPerBar, 4], timeLeft: 22 }]}
              layout={{ bars: pattern.bars, beatsPerBar: pattern.beatsPerBar, left: 96, right: 40 }}
              notes={staff.notes}
              rests={staff.rests}
              regions={region}
              width={STAFF_W}
              height={150}
            />
          )}
        </SheetPanel>
        <div
          role="button"
          aria-label="Tap pad"
          tabIndex={-1}
          onPointerDown={(e) => { if (paused) return; e.preventDefault(); setPadDown(true); tap.tap(eventTimeMs(e)); }}
          onPointerUp={() => setPadDown(false)}
          onPointerCancel={() => setPadDown(false)}
          onPointerLeave={() => setPadDown(false)}
          style={{ ...CARD, flex: 1, justifyContent: "space-between", touchAction: "none", userSelect: "none", cursor: "pointer", borderColor: padDown || phase === "tap" ? "var(--kc-indigo)" : "var(--kc-border)", background: padDown ? "var(--kc-indigo-wash)" : "var(--kc-panel)" }}
        >
          <CardTitle meta={<>← early · late →{rounds.length ? ` · round ${rounds.length}` : ""}</>}>Your taps against the beat</CardTitle>
          <div style={{ display: "flex", minHeight: 96 }}>
            {played.map((n, i) => {
              const d = devs[i];
              const down = Number.isInteger(n.onset) && n.onset % pattern.beatsPerBar === 0;
              const off = d !== null && Math.abs(d) > TOL_MS;
              const x = d === null ? 0 : Math.max(-44, Math.min(44, d));
              return (
                <div key={i} style={{ flex: 1, position: "relative", height: 96 }}>
                  {ballAt === i && <span style={{ position: "absolute", top: 0, left: "50%", marginLeft: -16, width: 32, height: 32, borderRadius: "50%", background: "var(--kc-sun)", boxShadow: "0 4px 0 0 var(--kc-sun-shadow)" }} />}
                  <span style={{ position: "absolute", left: "50%", marginLeft: -2, top: 40, bottom: 0, width: 4, borderRadius: 2, background: down ? "var(--kc-ink)" : "var(--kc-border)" }} />
                  {d !== null && <span style={{ position: "absolute", top: 58, left: `calc(50% + ${x}px - 13px)`, width: 26, height: 26, borderRadius: "50%", background: off ? "var(--kc-lilac)" : "var(--kc-mint)", border: "3px solid #ffffff", boxShadow: `0 0 0 2px ${off ? "var(--kc-indigo)" : "var(--kc-mint-ink)"}`, boxSizing: "border-box" }} />}
                  {showLast && d === null && <span style={{ position: "absolute", top: 58, left: "50%", marginLeft: -13, width: 26, height: 26, borderRadius: "50%", border: "3px dashed var(--kc-border-dashed)", boxSizing: "border-box" }} />}
                </div>
              );
            })}
          </div>
          <div style={offNotes.length ? NOTE : SMALL}>{tapsNote}</div>
        </div>
      </div>
      <BottomBar
        actions={
          <>
            {roundActive
              ? <Button variant="secondary" size="control" icon="stop" onClick={stopRound}>Stop</Button>
              : <Button variant="secondary" size="control" icon="hearing" onClick={() => void startRound({ ...pattern, bpm })} disabled={paused}>{rounds.length ? "Hear it again" : "Hear it first"}</Button>}
            <Button variant="secondary" size="control" icon="slow_motion_video" onClick={slower} disabled={roundActive || paused || bpm <= 50}>Slower</Button>
            <Button variant="secondary" size="control" icon="refresh" onClick={playNew} disabled={roundActive || paused}>New rhythm</Button>
            <NextStopButton nextTitle={nextTitle} onClick={finishBlock} disabled={paused} />
          </>
        }
      >
        <StatChip tone="indigo" icon="speed" line1={last ? (chipAhead < TOL_MS ? "Right on the beat" : `${chipAhead} ms ${last.aheadMs > 0 ? "early" : "late"}`) : "No round yet"} line2={last ? (offName ? `on the ${offName}` : `steadiness ${last.steadiness}%`) : `${spec.title.toLowerCase()} · ${spec.bars} bars`} />
        <StatChip tone="mint" value={last ? last.hits : "—"} unit={last ? `/${last.total}` : ""} label={<>on the<br />beat</>} />
        {cleanCount > 0 && <StatChip tone="sun" icon="star" line1={`${cleanCount} clean round${cleanCount === 1 ? "" : "s"}`} line2={promoted ? `level ${level} now` : "two in a row levels up"} />}
      </BottomBar>
    </>
  );
}
