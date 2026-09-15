"use client";
import * as React from "react";
import { Button, Keyboard, Metric, Pill, SectionLabel, SegmentBar, SheetPanel, Staff, exerciseToLines, type NoteState } from "@/components/ds";
import { useAudio } from "@/lib/hooks/use-audio";
import { useInput } from "@/lib/hooks/use-input";
import { generateExercise, noteTimeline, type Exercise, type TimelineNote } from "@/lib/generator/sightreading";
import { buildScale } from "@/lib/music/scales";
import type { ScaleId } from "@/lib/types";
import { PartProps, ReadingLevelResult, ReadingResult, timesWord } from "./shared";

/** Eight rungs, right hand only, two bars each. Generator level and tempo rise together. */
const LADDER = [
  { level: 1, tempo: 66 }, { level: 2, tempo: 72 }, { level: 2, tempo: 80 }, { level: 5, tempo: 72 },
  { level: 5, tempo: 80 }, { level: 6, tempo: 80 }, { level: 7, tempo: 80 }, { level: 7, tempo: 88 },
];
const TOTAL = LADDER.length;
const BARS = 2;
const BEATS = BARS * 4;
const IN_TIME_MS = 150;
type Phase = "ready" | "countin" | "playing" | "result";
interface Match { pitchOk: boolean; dev: number }

function heldLevel(levels: ReadingLevelResult[]): number {
  let held = 0;
  for (const r of levels) { if (r.level === held + 1 && r.held) held = r.level; else break; }
  return held;
}

/**
 * B2 · Reading. One two-bar exercise per level, played once through on a click after a one-bar count-in.
 * Notes are matched live to the page: right pitch in the window is played, wrong pitch is missed, a gap is a stop.
 * A level is held when most notes were right and the playing kept going; then the next one is a little harder.
 */
export function ReadingPart({ scale: scaleId, paused, onDone }: PartProps<ReadingResult> & { scale: ScaleId }) {
  const { audio, unlock } = useAudio();
  const scale = React.useMemo(() => buildScale(scaleId), [scaleId]);
  const [seed] = React.useState(() => Math.floor(Math.random() * 1e9));
  const [level, setLevel] = React.useState(1);
  const [phase, setPhase] = React.useState<Phase>("ready");
  const [count, setCount] = React.useState(0);
  const [states, setStates] = React.useState<Map<number, NoteState>>(() => new Map());
  const [pos, setPos] = React.useState<number | null>(null);
  const [levels, setLevels] = React.useState<ReadingLevelResult[]>([]);
  const [over, setOver] = React.useState(false);
  const exercise: Exercise = React.useMemo(() => generateExercise({ level: LADDER[level - 1].level, scale: scaleId, seed: `check-${seed}-${level}`, bars: BARS, hands: "RH", tempo: LADDER[level - 1].tempo }), [scaleId, seed, level]);
  const timeline = React.useMemo(() => noteTimeline(exercise), [exercise]);
  const beatMs = 60_000 / exercise.tempo;

  const phaseRef = React.useRef<Phase>("ready");
  const startMs = React.useRef(0);
  const beatCount = React.useRef(0);
  const posRef = React.useRef(0);
  const cursor = React.useRef(0);
  const matches = React.useRef(new Map<number, Match>());
  const timelineRef = React.useRef<TimelineNote[]>(timeline);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => { timelineRef.current = timeline; }, [timeline]);
  React.useEffect(() => () => { audio.stopMetronome(); if (timer.current) clearTimeout(timer.current); }, [audio]);

  const computeStates = (p: number): Map<number, NoteState> => {
    const out = new Map<number, NoteState>();
    for (const n of timelineRef.current) {
      const m = matches.current.get(n.index);
      if (m) out.set(n.index, m.pitchOk ? "played" : "missed");
      else if (n.beat + n.beats <= p - 1) out.set(n.index, "missed");
      else if (n.beat <= p && p < n.beat + n.beats) out.set(n.index, "current");
      else out.set(n.index, "upcoming");
    }
    return out;
  };

  const finish = React.useCallback(() => {
    audio.stopMetronome();
    phaseRef.current = "result";
    const tl = timelineRef.current;
    const total = tl.length;
    let right = 0, matched = 0, inTime = 0, stopped = 0, gap = 0;
    for (const n of tl) {
      const m = matches.current.get(n.index);
      if (m) { matched++; if (m.pitchOk) right++; if (Math.abs(m.dev) <= IN_TIME_MS) inTime++; if (gap >= 2) stopped++; gap = 0; }
      else gap++;
    }
    if (gap >= 2) stopped++;
    const held = total > 0 && right / total >= 0.7 && matched / total >= 0.75;
    setLevels((ls) => [...ls, { level, total, right, matched, inTime, stopped, held }]);
    setStates(computeStates(BEATS + 2));
    setPos(null);
    setPhase("result");
    if (!held || level === TOTAL) setOver(true);
  }, [audio, level]);

  const start = async () => {
    if (paused || phase === "countin" || phase === "playing") return;
    await unlock();
    matches.current = new Map();
    cursor.current = 0;
    beatCount.current = 0;
    posRef.current = 0;
    setStates(computeStates(-1));
    setPos(null);
    setCount(1);
    phaseRef.current = "countin";
    setPhase("countin");
    audio.startMetronome({
      bpm: exercise.tempo,
      beatsPerBar: 4,
      onBeat: () => {
        const b = beatCount.current++;
        if (b < 4) { setCount(b + 1); return; }
        const p = b - 4;
        if (p === 0) { startMs.current = performance.now(); phaseRef.current = "playing"; setPhase("playing"); }
        if (p < BEATS) {
          posRef.current = p;
          setPos(p);
          setStates(computeStates(p));
        } else {
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(finish, beatMs * 0.75);
        }
      },
    });
    if (!audio.ready) { setPhase("ready"); phaseRef.current = "ready"; }
  };

  const { tap, mode } = useInput({
    onNote: (e) => {
      if (e.kind !== "on" || phaseRef.current !== "playing") return;
      const t = e.time - startMs.current;
      const tl = timelineRef.current;
      for (let i = cursor.current; i < Math.min(tl.length, cursor.current + 4); i++) {
        const expT = tl[i].beat * beatMs;
        if (t > expT + beatMs) continue; // that note is gone
        if (Math.abs(t - expT) <= beatMs) {
          matches.current.set(tl[i].index, { pitchOk: e.midi % 12 === tl[i].midi % 12, dev: t - expT });
          cursor.current = i + 1;
        }
        break;
      }
      setStates(computeStates(posRef.current));
    },
  });

  const nextLevel = () => { setLevel(level + 1); setPhase("ready"); phaseRef.current = "ready"; setStates(new Map()); };
  const endLadder = () => { audio.stopMetronome(); phaseRef.current = "result"; setPhase("result"); setOver(true); };
  const done = () => {
    const held = heldLevel(levels);
    const acc = levels.length ? levels.reduce((s, r) => s + (r.total ? r.right / r.total : 0), 0) / levels.length : 0;
    const score = Math.round(100 * (0.7 * (held / TOTAL) + 0.3 * acc));
    onDone({ score, heldLevel: held, stoppedAt: held < TOTAL ? held + 1 : null, levels });
  };

  const held = heldLevel(levels);
  const current = levels.find((r) => r.level === level);
  const line = exerciseToLines(exercise, scale, { barsPerLine: BARS, states })[0];
  const barOf = pos != null ? Math.floor(pos / 4) : null;
  const status = over
    ? held === 0 ? "Level 1 is where it stopped." : held === TOTAL ? `Level ${held} held. That's the top of the ladder.` : `Level ${held} held. Level ${held + 1} is where it stopped.`
    : phase === "result" ? `Level ${level} held.` : phase === "ready" ? (level === 1 ? "Level 1 first. Hold it and the next is a little harder." : `Level ${held} held. Level ${level} next.`) : phase === "countin" ? `Count-in — ${count}.` : `Level ${level} — playing.`;

  return (
    <>
      <div style={{ flex: 1, minHeight: 0, padding: "30px 38px 0", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
          <p style={{ margin: 0, fontSize: 17, color: "var(--kc-ink-muted)" }}>Play it once through. Don&apos;t stop to fix a note — if you lose your place, wait for the next bar.</p>
          <Pill tone="mint" style={{ marginLeft: "auto" }}>Level {level} of {TOTAL}</Pill>
        </div>
        <SheetPanel padding={18} style={{ flex: "none", height: 300 }}>
          <Staff systems={line.systems} notes={line.notes} rests={line.rests} layout={{ bars: line.bars, beatsPerBar: 4, left: 190, right: 40 }} regions={barOf != null ? [{ bar: barOf, beat: (pos ?? 0) % 4, width: 54 }] : []} width={1050} height={180} />
        </SheetPanel>
        {mode !== "midi" && (
          <Keyboard from={60} to={83} height={120} disabled={paused || phase === "result"} onNoteOn={(m) => tap.note(m, "on")} onNoteOff={(m) => tap.note(m, "off")} />
        )}
      </div>
      <div style={{ flex: "none", borderTop: "1px solid var(--kc-border)", background: "var(--kc-panel)", padding: "18px 38px 22px", display: "flex", alignItems: "center", gap: 28, marginTop: 16 }}>
        <div style={{ width: 300, display: "flex", flexDirection: "column", gap: 6 }}>
          <SectionLabel>How far you got</SectionLabel>
          <SegmentBar total={TOTAL} filled={held} current={over ? undefined : level - 1} height={8} radius={3} />
          <span style={{ fontSize: 14, color: "var(--kc-ink-muted)" }}>{status}</span>
        </div>
        <div style={{ display: "flex", gap: 26 }}>
          <Metric label="Notes right" value={current ? `${current.right} / ${current.total}` : `— / ${timeline.length}`} />
          <Metric label="In time" value={current ? `${current.inTime} / ${current.total}` : `— / ${timeline.length}`} />
          <Metric label="Stopped" value={current ? timesWord(current.stopped) : "—"} tone={current && current.stopped ? "clay" : undefined} />
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
          {over ? (
            <Button size="control" onClick={done}>Next — timing</Button>
          ) : phase === "ready" ? (
            <>
              {level > 1 && <Button variant="secondary" size="control" onClick={endLadder}>That was too hard</Button>}
              <Button size="control" icon="play_arrow" disabled={paused} onClick={() => void start()}>Play level {level}</Button>
            </>
          ) : phase === "result" ? (
            <>
              <Button variant="secondary" size="control" onClick={endLadder}>That was too hard</Button>
              <Button size="control" onClick={nextLevel}>Next level</Button>
            </>
          ) : (
            <Button size="control" disabled>{phase === "countin" ? `Count-in ${count}` : "Listening"}</Button>
          )}
        </div>
      </div>
    </>
  );
}
