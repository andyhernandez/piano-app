"use client";
import * as React from "react";
import { Button, Headline, IconButton, Keyboard, LogTable, Pill, SectionLabel, Waveform, keyLabel, type KeyTone } from "@/components/ds";
import { useAudio } from "@/lib/hooks/use-audio";
import { useInput } from "@/lib/hooks/use-input";
import { lcsLength } from "@/lib/engine/scoring";
import { buildScale, prefersFlats } from "@/lib/music/scales";
import { midiToPc, prettyPc } from "@/lib/music/notes";
import { seededRandom } from "@/lib/utils/random";
import type { ScaleId } from "@/lib/types";
import { capitalize, numberWord } from "../onboarding/chrome";
import { PANEL, SIDE, joinNotes, type EarResult, type EarRow, type EarStatus, type PartProps } from "./shared";

const LENGTHS = [2, 3, 3, 4, 4, 5];
const GAP_SEC = 0.55;
const MAX_TRIES = 3;
const CREDIT_BY_TRY = [1, 0.85, 0.7];

/** Phrases walk the scale by step, with the odd skip from phrase four on. No repeated notes, so up and down mean something. */
function makePhrases(seed: number, pool: number[]): number[][] {
  const rng = seededRandom(seed);
  return LENGTHS.map((n, p) => {
    let i = Math.floor(rng() * pool.length);
    const out = [pool[i]];
    while (out.length < n) {
      const skip = p >= 3 && rng() < 0.3 ? 2 : 1;
      let dir = rng() < 0.5 ? -1 : 1;
      if (i + dir * skip < 0 || i + dir * skip >= pool.length) dir = -dir;
      i += dir * skip;
      out.push(pool[i]);
    }
    return out;
  });
}

function contour(p: number[]): "up" | "down" | "up then down" | "down then up" | "level" {
  const dirs = p.slice(1).map((m, i) => Math.sign(m - p[i]));
  if (dirs.every((d) => d > 0)) return "up";
  if (dirs.every((d) => d < 0)) return "down";
  if (dirs[0] > 0) return "up then down";
  if (dirs[0] < 0) return "down then up";
  return "level";
}

function shape(p: number[], pool: number[]): string {
  const idx = p.map((m) => pool.indexOf(m));
  const stepwise = idx.slice(1).every((v, i) => Math.abs(v - idx[i]) === 1);
  return stepwise ? "stepwise" : "with a skip";
}

/** Twenty bars drawn from the phrase: pitch as height, each note decaying. */
function phraseBars(p: number[], pool: number[]): number[] {
  const per = 20 / p.length;
  return Array.from({ length: 20 }, (_, i) => {
    const n = Math.min(p.length - 1, Math.floor(i / per));
    const within = (i - n * per) / per;
    const h = 34 + (pool.indexOf(p[n]) / Math.max(1, pool.length - 1)) * 50;
    return Math.round(h * (1 - 0.45 * within));
  });
}

/**
 * B1 · Ear. The app plays a phrase; the person plays it back on whatever is connected, or on the keys drawn below.
 * Any number of hearings; up to three tries. Credit falls with the tries, and a phrase that keeps the shape but
 * misses the notes still counts for something.
 */
export function EarPart({ scale: scaleId, paused, onDone }: PartProps<EarResult> & { scale: ScaleId }) {
  const { audio, unlock } = useAudio();
  const scale = React.useMemo(() => buildScale(scaleId), [scaleId]);
  const pool = scale.midiOneOctave;
  const flats = prefersFlats(scaleId);
  const [phrases] = React.useState(() => makePhrases(Math.floor(Math.random() * 1e9), pool));
  const [index, setIndex] = React.useState(0);
  const [phase, setPhase] = React.useState<"idle" | "playing" | "answer">("idle");
  const [heard, setHeard] = React.useState(0);
  const [tries, setTries] = React.useState(0);
  const [captured, setCaptured] = React.useState<number[]>([]);
  const [attemptDone, setAttemptDone] = React.useState(false);
  const [rows, setRows] = React.useState<EarRow[]>([]);
  const capturedRef = React.useRef<number[]>([]);
  const triesRef = React.useRef(0);
  const bestRef = React.useRef(0);
  const doneRef = React.useRef(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const pausedRef = React.useRef(paused);
  React.useEffect(() => { pausedRef.current = paused; });
  React.useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const phrase = phrases[index];
  const n = phrase.length;
  const done = rows.length > index;
  const last = index === phrases.length - 1;

  const finishPhrase = (status: EarStatus, credit: number) => {
    doneRef.current = true;
    setRows((r) => [...r, { phrase, notes: n, status, credit, tries: triesRef.current }]);
  };

  const { tap, mode } = useInput({
    onNote: (e) => {
      if (e.kind !== "on" || pausedRef.current || doneRef.current || phase === "playing") return;
      if (capturedRef.current.length >= n) capturedRef.current = [];
      capturedRef.current = [...capturedRef.current, e.midi];
      setCaptured(capturedRef.current);
      setAttemptDone(false);
      if (capturedRef.current.length < n) return;
      // An attempt is complete: exact match earns the credit for this try, otherwise try again.
      const match = lcsLength(phrase.map((m) => m % 12), capturedRef.current.map((m) => m % 12)) / n;
      bestRef.current = Math.max(bestRef.current, match);
      triesRef.current += 1;
      setTries(triesRef.current);
      setAttemptDone(true);
      if (match === 1) {
        finishPhrase(triesRef.current === 1 ? "FIRST TRY" : triesRef.current === 2 ? "SECOND TRY" : "THIRD TRY", CREDIT_BY_TRY[Math.min(2, triesRef.current - 1)]);
      } else if (triesRef.current >= MAX_TRIES) {
        const sameShape = contour(capturedRef.current) === contour(phrase);
        finishPhrase(sameShape ? "DIRECTION" : "MISSED", Math.round(bestRef.current * 50) / 100);
      }
    },
  });

  const play = async () => {
    if (paused || phase === "playing") return;
    await unlock();
    const total = audio.playSequence(phrase, GAP_SEC, 0.5, 0.8) || n * GAP_SEC;
    setPhase("playing");
    setHeard((h) => h + 1);
    capturedRef.current = [];
    setCaptured([]);
    setAttemptDone(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setPhase("answer"), total * 1000 + 250);
  };

  const next = () => {
    if (phase === "playing") return;
    let allRows = rows;
    if (!done) {
      const sameShape = capturedRef.current.length >= 2 && contour(capturedRef.current) === contour(phrase);
      const row: EarRow = { phrase, notes: n, status: sameShape ? "DIRECTION" : "MISSED", credit: Math.round(bestRef.current * 50) / 100, tries: triesRef.current };
      allRows = [...rows, row];
      setRows(allRows);
    }
    if (last) {
      const score = Math.round((allRows.reduce((s, r) => s + r.credit, 0) / allRows.length) * 100);
      onDone({ score, rows: allRows, firstOrSecond: allRows.filter((r) => r.credit >= 0.85).length, total: allRows.length });
      return;
    }
    doneRef.current = false;
    capturedRef.current = [];
    triesRef.current = 0;
    bestRef.current = 0;
    setIndex(index + 1);
    setPhase("idle");
    setHeard(0);
    setTries(0);
    setCaptured([]);
    setAttemptDone(false);
  };

  const names = (ms: number[]) => ms.map((m) => prettyPc(midiToPc(m, flats)));
  const key = keyLabel(scale.key, scale.mode);
  const tones: Partial<Record<number, KeyTone>> = {};
  captured.forEach((m, i) => { tones[m] = attemptDone && phrase[i] % 12 !== m % 12 ? "clay" : "mint"; });

  const feedback = (() => {
    if (phase === "playing") return <>Playing the phrase.</>;
    if (done && rows[index].credit >= 0.7) return <>You played <b>{joinNotes(names(captured))}</b>. That&apos;s the phrase.</>;
    if (done) return <>It was <b>{joinNotes(names(phrase))}</b>. Moving on — that one is a fact, not a problem.</>;
    if (attemptDone) return <>You played <b>{joinNotes(names(captured))}</b>. Not the phrase yet — hear it again if you like, then once more.</>;
    if (captured.length) return <>{joinNotes(names(captured))} …</>;
    if (heard === 0) return <>Press play, then find it on the keys{mode === "midi" ? " — the keyboard is listening" : ""}.</>;
    return <>Now play it back. {n === 2 ? "Two" : capitalize(numberWord(n))} notes.</>;
  })();

  const logRows = LENGTHS.map((len, i) => {
    const r = rows[i];
    const status: EarStatus = r ? r.status : i === index ? "PLAYING" : "—";
    return { cells: [String(i + 1), `${len} NOTES`, status], marked: !!r && r.credit >= 0.85 };
  });
  const lastMiss = [...rows].reverse().find((r) => r.credit < 0.85);
  const note = lastMiss
    ? lastMiss.status === "DIRECTION"
      ? `Phrase ${rows.indexOf(lastMiss) + 1} had the shape but not the notes — the interval was the hard part, and not a problem.`
      : `Phrase ${rows.indexOf(lastMiss) + 1} went ${contour(lastMiss.phrase) === "up" ? "down where the tune went up" : "up where the tune went down"} — a common miss, and not a problem.`
    : rows.length ? "Every phrase so far back on the first or second hearing." : "Six phrases. The first two are two notes long; the last is five.";

  return (
    <div style={{ flex: 1, minHeight: 0, padding: "34px 38px", display: "flex", flexDirection: "column", gap: 24 }}>
      <Headline size={34} title="Listen, then play it back." lede="Nothing is written down for this one. Play it as many times as you like — the check is whether you find it, not how fast." />
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "minmax(0, 1fr) 300px", gap: 18 }}>
        <div style={PANEL}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <IconButton icon={phase === "playing" ? "volume_up" : "play_arrow"} size={52} label="Play the phrase" onClick={() => void play()} style={phase === "playing" ? { border: "1px solid var(--kc-mint)", color: "var(--kc-mint)" } : undefined} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 17, fontWeight: 600 }}>Phrase {index + 1} of {phrases.length}</div>
              <div style={{ fontSize: 14, color: "var(--kc-ink-dim)" }}>{capitalize(numberWord(n))} notes, {shape(phrase, pool)}, in {key}{heard ? ` · played ${heard === 1 ? "once" : heard === 2 ? "twice" : `${heard} times`}` : ""}</div>
            </div>
            <Pill>{heard ? `Heard ${heard}×` : "Not yet heard"}{tries && !done ? ` · try ${Math.min(MAX_TRIES, tries + 1)}` : ""}</Pill>
          </div>
          <Waveform bars={phraseBars(phrase, pool)} height={40} tone={heard ? "mint" : "resting"} />
          <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center" }}>
            <Keyboard from={60} to={83} height={132} tones={tones} disabled={paused || phase === "playing" || done} onNoteOn={(m) => tap.note(m, "on")} onNoteOff={(m) => tap.note(m, "off")} />
          </div>
          <div style={{ fontSize: 15, color: "var(--kc-ink-muted)" }}>{feedback}</div>
        </div>
        <div style={SIDE}>
          <SectionLabel>So far</SectionLabel>
          <LogTable rows={logRows} emphasize={1} />
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45, color: "var(--kc-ink-dim)" }}>{note}</p>
          <div style={{ marginTop: "auto" }}>
            <Button style={{ width: "100%" }} disabled={paused || phase === "playing" || (!done && heard === 0)} onClick={next}>{last ? "Next — reading" : "Next phrase"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
