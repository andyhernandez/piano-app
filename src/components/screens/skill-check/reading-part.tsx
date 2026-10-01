"use client";
import * as React from "react";
import { Button, Icon, Instruction, Keyboard, SheetPanel, Staff, StatChip, exerciseToLines, type NoteState } from "@/components/ds";
import { useAudio } from "@/lib/hooks/use-audio";
import { useInput } from "@/lib/hooks/use-input";
import { generateExercise, noteTimeline, type Exercise, type TimelineNote } from "@/lib/generator/sightreading";
import { buildScale } from "@/lib/music/scales";
import type { Experience, ScaleId } from "@/lib/types";
import { CARD_TITLE, NOTE, PartBar, type PartProps, type ReadingLevelResult, type ReadingResult } from "./shared";

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

const EXPERIENCE_WORDS: Record<Experience, string> = { starting: "you're just starting", "under-year": "you said under a year", "one-to-three": "you said one to three years", "more-than-three": "you said more than three years", returning: "you said you're coming back" };

/** The highest rung held in an unbroken run from the start rung; rungs below the start count as held. */
function heldLevel(levels: ReadingLevelResult[], start: number): number {
  let held = start - 1;
  for (const r of levels) { if (r.level === held + 1 && r.held) held = r.level; else break; }
  return held;
}

/**
 * B2 · Reading. One two-bar exercise per rung, played once through on a click after a one-bar count-in.
 * Notes are matched live to the page: right pitch in the window is played, wrong pitch is missed, a gap is a stop.
 * A rung is held when most notes were right and the playing kept going; then the next one is a little harder.
 * The ladder starts where the player's experience says.
 */
export function ReadingPart({ scale: scaleId, start, experience, paused, onDone }: PartProps<ReadingResult> & { scale: ScaleId; start: number; experience?: Experience }) {
  const { audio, unlock } = useAudio();
  const scale = React.useMemo(() => buildScale(scaleId), [scaleId]);
  const [seed] = React.useState(() => Math.floor(Math.random() * 1e9));
  const [level, setLevel] = React.useState(start);
  const [phase, setPhase] = React.useState<Phase>("ready");
  const [count, setCount] = React.useState(0);
  const [states, setStates] = React.useState<Map<number, NoteState>>(() => new Map());
  const [pos, setPos] = React.useState<number | null>(null);
  const [levels, setLevels] = React.useState<ReadingLevelResult[]>([]);
  const [over, setOver] = React.useState(false);
  const [heldBar, setHeldBar] = React.useState<number | null>(null);
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
    // How far the beat was held: the last bar before a note was late or missed.
    let bar = 0;
    for (const n of tl) { const m = matches.current.get(n.index); if (!m || Math.abs(m.dev) > IN_TIME_MS) break; bar = Math.floor(n.beat / 4) + 1; }
    setHeldBar(bar);
    setLevels((ls) => [...ls, { level, total, right, matched, inTime, stopped, held }]);
    setStates(computeStates(BEATS + 2));
    setPos(null);
    setPhase("result");
    if (!held || level === TOTAL) setOver(true);
  }, [audio, level]);

  const begin = async () => {
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
        if (t > expT + beatMs) continue;
        if (Math.abs(t - expT) <= beatMs) {
          matches.current.set(tl[i].index, { pitchOk: e.midi % 12 === tl[i].midi % 12, dev: t - expT });
          cursor.current = i + 1;
        }
        break;
      }
      setStates(computeStates(posRef.current));
    },
  });

  const nextLevel = () => { setLevel(level + 1); setPhase("ready"); phaseRef.current = "ready"; setStates(new Map()); setHeldBar(null); };
  const endLadder = () => { audio.stopMetronome(); phaseRef.current = "result"; setPhase("result"); setOver(true); };
  const done = () => {
    const held = heldLevel(levels, start);
    const acc = levels.length ? levels.reduce((s, r) => s + (r.total ? r.right / r.total : 0), 0) / levels.length : 0;
    const score = Math.round(100 * (0.7 * (held / TOTAL) + 0.3 * acc));
    onDone({ score, heldLevel: held, stoppedAt: held < TOTAL ? held + 1 : null, levels, startedAt: start });
  };

  const held = heldLevel(levels, start);
  const current = levels.find((r) => r.level === level);
  const line = exerciseToLines(exercise, scale, { barsPerLine: BARS, states, tops: { treble: 36, bass: 132 } })[0];
  const barOf = pos != null ? Math.floor(pos / 4) : null;
  const instruction = over
    ? held === 0 ? "Level 1 is where it stopped. That's where the page starts." : held === TOTAL ? `Level ${held} held. That's the top of the ladder.` : `Level ${held} held. Level ${held + 1} is where it stopped.`
    : phase === "countin" ? `Count-in — ${count}.` : phase === "playing" ? "Keep going — don't stop to fix a note." : phase === "result" ? `Level ${level} held. One rung up.` : "Play what you see. It gets harder until you stop.";
  const startLine = `Started at level ${start} because ${experience ? EXPERIENCE_WORDS[experience] : "the ladder starts there"}. Right hand only — keep going through mistakes.`;

  // The ladder shows the rungs around the one being played: held mint, now indigo, upcoming outlined.
  const lo = Math.max(1, Math.min(level - 3, TOTAL - 5));
  const rungs = Array.from({ length: Math.min(6, TOTAL - lo + 1) }, (_, i) => lo + i);

  return (
    <>
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "minmax(0, 1fr) 260px", gap: 20, padding: "24px 32px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minHeight: 0 }}>
          <Instruction>{instruction}</Instruction>
          <SheetPanel padding={16} style={{ flex: 1, minHeight: 0 }}>
            <Staff systems={line.systems} notes={line.notes} rests={line.rests} layout={{ bars: line.bars, beatsPerBar: 4, left: 190, right: 40 }} regions={barOf != null ? [{ bar: barOf, beat: (pos ?? 0) % 4, width: 54 }] : []} width={780} height={150} lineGap={14} />
          </SheetPanel>
          {mode !== "midi" && <Keyboard from={60} to={83} height={110} disabled={paused || phase === "result"} onNoteOn={(m) => tap.note(m, "on")} onNoteOff={(m) => tap.note(m, "off")} style={{ flex: "none" }} />}
          <div style={NOTE}>{startLine}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, justifyContent: "flex-end", minHeight: 0 }}>
          <div style={CARD_TITLE}>The ladder</div>
          <div style={{ display: "flex", flexDirection: "column-reverse", gap: 6 }}>
            {rungs.map((r) => {
              const isHeld = r <= held || (r < start);
              const now = r === level && !over;
              const style: React.CSSProperties = { height: 44, borderRadius: 14, display: "flex", alignItems: "center", gap: 10, padding: "0 14px", boxSizing: "border-box", fontFamily: "var(--kc-font-display)", fontSize: 17, fontWeight: 600 };
              const look: React.CSSProperties = now ? { background: "var(--kc-indigo)", color: "#ffffff", boxShadow: "0 3px 0 0 var(--kc-indigo-shadow)" } : isHeld ? { background: "var(--kc-mint)", color: "var(--kc-ink)" } : { background: "var(--kc-panel)", border: "2px solid var(--kc-border)", color: "var(--kc-ink-faint)" };
              return (
                <div key={r} style={{ ...style, ...look }}>
                  <Icon name={now ? "arrow_right" : isHeld ? "check" : "lock_open"} size={20} />
                  <span>Level {r}</span>
                  {now && <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 800, fontFamily: "var(--kc-font-sans)" }}>NOW</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <PartBar actions={
        over ? (
          <Button size="control" iconAfter icon="arrow_forward" onClick={done}>Next — timing</Button>
        ) : phase === "ready" ? (
          <>
            {levels.length > 0 && <Button variant="secondary" size="control" icon="flag" onClick={endLadder}>That&apos;s my limit</Button>}
            <Button size="control" icon="play_arrow" disabled={paused} onClick={() => void begin()}>Play level {level}</Button>
          </>
        ) : phase === "result" ? (
          <>
            <Button variant="secondary" size="control" icon="flag" onClick={endLadder}>That&apos;s my limit</Button>
            <Button size="control" iconAfter icon="arrow_forward" onClick={nextLevel}>Next level</Button>
          </>
        ) : (
          <Button size="control" disabled>{phase === "countin" ? `Count-in ${count}` : "Listening"}</Button>
        )
      }>
        <StatChip tone="mint" value={current ? current.right : "—"} unit={`/${current ? current.total : timeline.length}`} label={<>notes<br />right</>} />
        <StatChip tone="indigo" icon="timer" line1={current ? `${current.inTime} of ${current.total} in time` : "In time"} line2={current ? (heldBar ? `held the beat to bar ${heldBar}` : "lost the beat early") : "after the count-in"} />
      </PartBar>
    </>
  );
}
