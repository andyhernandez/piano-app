"use client";
import * as React from "react";
import type { BlockProps } from "./types";
import type { MidiScore } from "@/lib/types";
import type { NoteState } from "@/components/ds";
import { BottomBar, Button, Choice, LogTable, Metric, Pill, SectionLabel, SheetPanel, Staff, Tempo, rhythmToStaff } from "@/components/ds";
import { useAudio } from "@/lib/hooks/use-audio";
import { useInput } from "@/lib/hooks/use-input";
import { useAppStore } from "@/lib/store/app-store";
import { scoreRhythm, scoreTiming } from "@/lib/engine/scoring";
import { expectedOnsetsMs, generateEcho, generateRhythm, RHYTHM_LEVELS, type RhythmPattern } from "@/lib/generator/rhythm";
import { startBeatClock, audioTimeToPerfMs, meanSd } from "./shared/beat-clock";
import { MetronomeDots, RecordControl, TempoControls, useBlockRecorder } from "./shared/controls";

/*
 * Timing. A written rhythm on one line; the click plays it once, counts in, and the student taps it back — on
 * the pad, the space bar, any key of the keyboard, or into the microphone. Each round is scored for hits, how
 * far ahead of the beat the taps ran, and how steady they were. Echo rounds hide the page: hear it, tap it
 * back, then see it written. Two clean rounds in a row move the level up.
 */

type Game = "clap" | "echo";
type Phase = "idle" | "countin-listen" | "listen" | "countin-tap" | "tap";
const MAX_LEVEL = RHYTHM_LEVELS.length;
const RHYTHM_NOTE = 79;
const STAFF_W = 1050;

interface Round { seed: string; game: Game; level: number; bpm: number; score: MidiScore; hits: number; total: number; aheadMs: number; steadiness: number; clean: boolean; states: Map<number, NoteState> }

const clampLevel = (l: number) => Math.max(1, Math.min(MAX_LEVEL, Math.round(l)));

/** Greedy nearest matching, for the page: which written notes got a tap within the window. */
function matchOnsets(expected: number[], actual: number[], windowMs = 120): boolean[] {
  const used = new Set<number>();
  return expected.map((e) => {
    let best = -1;
    let bestDelta = Infinity;
    actual.forEach((a, i) => { if (used.has(i)) return; const d = Math.abs(a - e); if (d < bestDelta) { bestDelta = d; best = i; } });
    if (best >= 0 && bestDelta <= windowMs) { used.add(best); return true; }
    return false;
  });
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
    setMeta?.(<>Level {level} · {spec.title.toLowerCase()} · <Tempo bpm={bpm} /></>);
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
    const actual = tapsRef.current.map((t) => t - startMsRef.current).filter((t) => t >= -250);
    const score = scoreRhythm(expected, actual, inputMode);
    const timing = scoreTiming(expected, actual);
    const { mean, sd } = meanSd(timing.deviations);
    const aheadMs = timing.deviations.length ? -Math.round(mean) : 0;
    const steadiness = timing.deviations.length ? Math.round(100 * (1 - Math.min(1, sd / 120))) : 0;
    const hits = matchOnsets(expected, actual);
    const states = new Map<number, NoteState>();
    let k = 0;
    p.notes.forEach((n, i) => { if (!n.rest) states.set(i, hits[k++] ? "played" : "missed"); });
    const clean = score.badge === "steady-pulse" || (timing.hits === expected.length && timing.extras === 0);
    setRounds((r) => [...r, { seed: p.seed, game, level, bpm, score, hits: timing.hits, total: expected.length, aheadMs, steadiness, clean, states }]);
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
  }, [stopEverything, setPhaseBoth, inputMode, game, level, bpm, updateSettings, child.id]);
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

  const newPattern = (g: Game = game, l = level) => ({ ...(g === "echo" ? generateEcho(l) : generateRhythm(l)), bpm });
  const playNew = () => void startRound(newPattern());
  const stopRound = () => { stopEverything(); setPhaseBoth("idle"); };
  const switchGame = (g: Game) => {
    if (g === game) return;
    stopRound();
    setGame(g);
    setPattern({ ...(g === "echo" ? generateEcho(level) : generateRhythm(level)), bpm });
  };
  const changeLevel = (delta: number) => {
    const next = clampLevel(level + delta);
    if (next === level) return;
    stopRound();
    cleanStreakRef.current = 0;
    setLevel(next);
    setBpm(RHYTHM_LEVELS[next - 1].bpm);
    setPattern({ ...(game === "echo" ? generateEcho(next) : generateRhythm(next)), bpm: RHYTHM_LEVELS[next - 1].bpm });
    void updateSettings(child.id, { rhythmLevel: next });
  };

  const roundActive = phase !== "idle";
  React.useEffect(() => {
    if (!roundActive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      e.preventDefault();
      tap.tap();
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
  const region = activeBeat !== null && (phase === "listen" || phase === "tap") ? [{ bar: Math.floor(activeBeat / pattern.beatsPerBar), beat: activeBeat % pattern.beatsPerBar, width: (STAFF_W - 110) / pattern.bars / pattern.beatsPerBar }] : [];

  const instruction = paused
    ? "Paused."
    : phase === "countin-listen" ? "Count-in. The rhythm plays once on top of the click."
    : phase === "listen" ? (game === "echo" ? "Listen. Don't tap yet." : "Listen — follow the page.")
    : phase === "countin-tap" ? "Now you. Tap it back with the click."
    : phase === "tap" ? "Tap."
    : timeUp ? `Time. Next — ${nextTitle ?? "done"}, or one more round.`
    : rounds.length === 0 ? (game === "echo" ? "Hear a bar, tap it back, then see it written. Press Play." : "The click plays the rhythm once, counts you in, then you tap it back. Press Play.")
    : promoted ? `Two clean rounds. Level ${level} from here — ${spec.title.toLowerCase()}.`
    : last?.clean ? "Clean. One more like that moves the level up."
    : Math.abs(last?.aheadMs ?? 0) >= 25 ? `Taps ran ${Math.abs(last.aheadMs)} ms ${last.aheadMs > 0 ? "ahead of" : "behind"} the click. Count the bar out loud.`
    : `${last.hits} of ${last.total}. Same tempo again.`;

  const rows = rounds.slice(-4).map((r, i, arr) => ({ cells: [`ROUND ${rounds.length - arr.length + i + 1}`, `${r.hits} / ${r.total}`, r.clean ? "CLEAN" : `${r.aheadMs >= 0 ? "+" : "−"}${Math.abs(r.aheadMs)} MS`], marked: r.clean }));
  while (rows.length < 4) rows.push({ cells: [`ROUND ${rows.length + 1}`, "—", "NOT PLAYED"], marked: false });
  const cleanCount = rounds.filter((r) => r.clean).length;

  return (
    <>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", padding: "22px 30px 0", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <p style={{ margin: 0, fontSize: 17, color: "var(--kc-ink-muted)", flex: 1, minWidth: 0 }}>{instruction}</p>
          <Pill tone={phase === "tap" ? "mint" : "neutral"}>{countLabel ? countLabel.toUpperCase() : `LEVEL ${level}`}</Pill>
          <MetronomeDots beat={beat} />
          <TempoControls bpm={bpm} onChange={setBpm} disabled={roundActive} min={50} max={120} />
          <RecordControl recording={recorder.recording} supported={recorder.supported} onToggle={() => void recorder.toggle()} />
          {roundActive
            ? <Button variant="quiet" size="control" icon="stop" onClick={stopRound}>Stop</Button>
            : <Button variant="quiet" size="control" icon="play_arrow" onClick={() => void startRound({ ...pattern, bpm })} disabled={paused}>{rounds.length ? "Again" : "Play"}</Button>}
        </div>
        <SheetPanel padding={18} style={{ flex: "none", height: 200 }}>
          {hidePage ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: "var(--kc-paper-ink-dim)" }}>
              <span style={{ fontFamily: "var(--kc-font-music)", fontSize: 40, lineHeight: 1, color: "var(--kc-paper-ink)" }}>{"\u{1D160}"}</span>
              <span style={{ fontSize: 15 }}>{phase === "listen" || phase === "countin-listen" ? "Listen." : phase === "tap" || phase === "countin-tap" ? "Tap it back." : "One bar. Hear it, tap it back, then see it written."}</span>
            </div>
          ) : (
            <Staff
              systems={[{ clef: "none", top: 40, timeSignature: [pattern.beatsPerBar, 4], timeLeft: 22 }]}
              layout={{ bars: pattern.bars, beatsPerBar: pattern.beatsPerBar, left: 70, right: 40 }}
              notes={staff.notes}
              rests={staff.rests}
              regions={region}
              width={STAFF_W}
              height={150}
            />
          )}
        </SheetPanel>
        <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "1fr 340px", gap: 14, paddingBottom: 22 }}>
          <button
            type="button"
            disabled={paused}
            onPointerDown={(e) => { e.preventDefault(); setPadDown(true); tap.tap(); }}
            onPointerUp={() => setPadDown(false)}
            onPointerCancel={() => setPadDown(false)}
            onPointerLeave={() => setPadDown(false)}
            style={{ background: padDown ? "var(--kc-mint-wash)" : phase === "tap" ? "var(--kc-mint-wash)" : "var(--kc-panel)", border: phase === "tap" || padDown ? "1.5px solid var(--kc-mint)" : "1px solid var(--kc-border)", borderRadius: 11, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, cursor: "pointer", touchAction: "none", userSelect: "none", color: "var(--kc-ink)", padding: 0, minHeight: 0 }}
            aria-label="Tap pad"
          >
            <span style={{ fontFamily: "var(--kc-font-mono)", fontSize: 32, letterSpacing: "0.12em", color: phase === "tap" ? "var(--kc-mint)" : "var(--kc-ink)" }}>TAP</span>
            <span style={{ fontSize: 14, color: "var(--kc-ink-dim)" }}>The pad, the space bar, any key of the keyboard{inputMode === "mic" ? ", or a clap" : ""}.</span>
            {phase === "tap" && <span style={{ fontFamily: "var(--kc-font-mono)", fontSize: 12, letterSpacing: "0.1em", color: "var(--kc-ink-faint)" }}>{tapsShown} TAPPED</span>}
          </button>
          <div style={{ background: "var(--kc-panel)", border: "1px solid var(--kc-border)", borderRadius: 11, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 12, minHeight: 0, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <SectionLabel>THIS BLOCK</SectionLabel>
              <div style={{ marginLeft: "auto" }}>
                <Choice options={["clap", "echo"] as Game[]} value={game} onChange={switchGame} labels={{ clap: "With the page", echo: "Echo" }} />
              </div>
            </div>
            <LogTable rows={rows} emphasize={1} />
            <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14, color: "var(--kc-ink-dim)", flex: 1 }}>Level {level} · {spec.title.toLowerCase()} · {spec.bars} bars</span>
              <Button variant="secondary" size="pill" disabled={roundActive || level <= 1} onClick={() => changeLevel(-1)}>Easier</Button>
              <Button variant="secondary" size="pill" disabled={roundActive || level >= MAX_LEVEL} onClick={() => changeLevel(1)}>Harder</Button>
            </div>
          </div>
        </div>
      </div>
      <BottomBar
        actions={
          <>
            <Button variant="secondary" size="control" onClick={playNew} disabled={roundActive || paused}>New rhythm</Button>
            <Button size="control" onClick={finishBlock} disabled={paused}>{nextTitle ? `Next — ${nextTitle}` : "Finish"}</Button>
          </>
        }
      >
        <div style={{ display: "flex", gap: 26 }}>
          <Metric label="HITS" value={last ? `${last.hits} / ${last.total}` : "—"} tone={last && last.hits === last.total ? "mint" : undefined} />
          <Metric label="AHEAD OF BEAT" value={last ? `${last.aheadMs >= 0 ? "+" : "−"}${Math.abs(last.aheadMs)} ms` : "—"} tone={last && Math.abs(last.aheadMs) >= 25 ? "clay" : undefined} />
          <Metric label="STEADINESS" value={last ? `${last.steadiness}%` : "—"} />
          <Metric label="CLEAN ROUNDS" value={`${cleanCount} / ${Math.max(rounds.length, 1)}`} tone={cleanCount ? "mint" : undefined} />
        </div>
      </BottomBar>
    </>
  );
}
