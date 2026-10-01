"use client";
import * as React from "react";
import { Button, Icon, Keyboard, PianoStrip, StatChip, TickSays, type KeyTone, type PianoStripLit } from "@/components/ds";
import { useAudio } from "@/lib/hooks/use-audio";
import { useInput } from "@/lib/hooks/use-input";
import { lcsLength } from "@/lib/engine/scoring";
import { buildScale, prefersFlats } from "@/lib/music/scales";
import { isBlackKey, midiToPc, prettyPc } from "@/lib/music/notes";
import { seededRandom } from "@/lib/utils/random";
import type { ScaleId } from "@/lib/types";
import { numberWord } from "../onboarding/chrome";
import { CARD_TITLE, NOTE, PANEL, PartBar, type EarResult, type EarRow, type EarStatus, type PartProps } from "./shared";

const LENGTHS = [2, 3, 3, 4, 4, 5];
const GAP_SEC = 0.55;
const MAX_TRIES = 2;
const CREDIT_BY_TRY = [1, 0.85];
/** The strip under the phrase: two octaves of white keys from C4. */
const STRIP_FROM = 60;
const STRIP_KEYS = 15;

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

/** Index of a midi note on the white-key strip, or null for a black key or one off the strip. */
function stripIndex(midi: number): number | null {
  if (isBlackKey(midi)) return null;
  let i = 0;
  for (let m = STRIP_FROM; m < midi; m++) if (!isBlackKey(m)) i++;
  return midi >= STRIP_FROM && i < STRIP_KEYS ? i : null;
}

/** Index of a black key by the white key it follows. */
function stripBlackIndex(midi: number): number | null {
  if (!isBlackKey(midi)) return null;
  return stripIndex(midi - 1);
}

/**
 * B1 · Ear. Tick plays a phrase; the person plays it back on whatever is connected, or on the keys drawn below.
 * Any number of hearings; two goes at each. Credit falls a little on the second go, and a phrase that keeps the
 * shape but misses the notes still counts for something.
 */
export function EarPart({ scale: scaleId, paused, onDone }: PartProps<EarResult> & { scale: ScaleId }) {
  const { audio, ready, unlock } = useAudio();
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
      const match = lcsLength(phrase.map((m) => m % 12), capturedRef.current.map((m) => m % 12)) / n;
      bestRef.current = Math.max(bestRef.current, match);
      triesRef.current += 1;
      setTries(triesRef.current);
      setAttemptDone(true);
      if (match === 1) {
        finishPhrase(triesRef.current === 1 ? "FIRST TRY" : "SECOND TRY", CREDIT_BY_TRY[Math.min(CREDIT_BY_TRY.length - 1, triesRef.current - 1)]);
      } else if (triesRef.current >= MAX_TRIES) {
        const sameShape = contour(capturedRef.current) === contour(phrase);
        finishPhrase(sameShape ? "DIRECTION" : "MISSED", Math.round(bestRef.current * 50) / 100);
      }
    },
  });

  // An answer in progress: notes are down, the try is not complete, the phrase is not settled.
  const midAttempt = captured.length > 0 && captured.length < n && !done;

  const play = async () => {
    if (paused || phase === "playing" || midAttempt) return;
    await unlock();
    const total = audio.playSequence(phrase, GAP_SEC, 0.5, 0.8) || n * GAP_SEC;
    setPhase("playing");
    setHeard((h) => h + 1);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setPhase("answer"), total * 1000 + 250);
  };
  const playRef = React.useRef(play);
  React.useEffect(() => { playRef.current = play; });

  // Each phrase plays itself on arrival once audio is unlocked (the tap that opened the check does that on iOS).
  const autoPlayed = React.useRef(-1);
  React.useEffect(() => {
    if (phase !== "idle" || paused || !ready || autoPlayed.current === index) return;
    autoPlayed.current = index;
    void playRef.current();
  }, [phase, paused, ready, index]);

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

  const name = (m: number) => prettyPc(midiToPc(m, flats));
  const back = rows.filter((r) => r.credit >= 0.85).length;
  const hearing = heard === 0 ? "not yet heard" : heard === 1 ? "first hearing" : heard === 2 ? "second hearing" : `${numberWord(heard)} hearings`;

  // The strip lights what was played: mint for a note that matched its slot, indigo wash for the current slot's guess.
  const lit: PianoStripLit = { whites: {}, blacks: {}, labels: {} };
  captured.forEach((m, i) => {
    const ok = !attemptDone || phrase[i] % 12 === m % 12;
    const w = stripIndex(m), b = stripBlackIndex(m);
    const color = ok ? "var(--kc-mint)" : "var(--kc-lilac)";
    if (w !== null) { lit.whites![w] = color; lit.labels![w] = name(m); }
    if (b !== null) lit.blacks![b] = color;
  });
  const tones: Partial<Record<number, KeyTone>> = {};
  captured.forEach((m, i) => { tones[m] = attemptDone && phrase[i] % 12 !== m % 12 ? "clay" : "mint"; });

  const tickLine = phase === "playing" ? "Listen…"
    : done && rows[index].credit >= 0.7 ? `That's it — ${phrase.map(name).join(", ")}.`
    : done ? `It was ${phrase.map(name).join(", ")}. Moving on — that one is a fact, not a problem.`
    : attemptDone ? "Not quite the tune yet. Hear it again if you like, then one more go."
    : captured.length > 0 && captured.length < n ? `${n - captured.length === 1 ? "One more note" : `${numberWord(n - captured.length).charAt(0).toUpperCase() + numberWord(n - captured.length).slice(1)} more notes`} to finish this try.`
    : heard === 0 ? "I'll play a short tune. Play it back — no page this time. Two goes at each, and there's no wrong answer."
    : `Now play it back. ${n === 2 ? "Two" : numberWord(n).charAt(0).toUpperCase() + numberWord(n).slice(1)} notes.`;

  const slot = (i: number): React.CSSProperties => {
    const base: React.CSSProperties = { width: 62, height: 62, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--kc-font-display)", fontSize: 20, fontWeight: 600, boxSizing: "border-box" };
    const played = captured[i];
    if (played !== undefined && (done || attemptDone)) {
      const ok = phrase[i] % 12 === played % 12;
      return { ...base, background: ok ? "var(--kc-mint)" : "var(--kc-lilac)", color: "var(--kc-ink)", border: ok ? "none" : "2px solid var(--kc-indigo)" };
    }
    if (played !== undefined) return { ...base, background: "var(--kc-mint)", color: "var(--kc-ink)" };
    if (i === captured.length && heard > 0 && !done) return { ...base, background: "var(--kc-panel)", border: "3px solid var(--kc-indigo)", color: "var(--kc-indigo)" };
    return { ...base, background: "var(--kc-panel)", border: "2px dashed var(--kc-border-dashed)", color: "var(--kc-ink-faint)" };
  };
  const slotText = (i: number) => {
    const played = captured[i];
    if (played !== undefined) return name(played);
    if (done) return name(phrase[i]);
    if (i === captured.length && heard > 0) return "?";
    return "";
  };

  return (
    <>
      <div style={{ flex: 1, minHeight: 0, padding: "30px 32px", display: "flex", flexDirection: "column", gap: 20 }}>
        <TickSays>{tickLine}</TickSays>
        <div style={PANEL}>
          <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
            <button type="button" aria-label="Play the phrase" onClick={() => void play()} disabled={paused || phase === "playing"} className="kc-press kc-btn-primary" style={{ width: 120, height: 120, flex: "none", border: "none", borderRadius: "50%", background: "var(--kc-indigo)", color: "#ffffff", boxShadow: "0 6px 0 0 var(--kc-indigo-shadow)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: paused ? 0.5 : 1 }}>
              <Icon name={phase === "playing" ? "volume_up" : heard ? "replay" : "play_arrow"} size={56} />
            </button>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 26, fontWeight: 600, lineHeight: 1.15 }}>Phrase {index + 1} of {phrases.length}</div>
                <span style={{ fontSize: 15, fontWeight: 800, color: "var(--kc-ink-faint)" }}>{numberWord(n)} notes · {hearing}{tries && !done ? ` · go ${Math.min(MAX_TRIES, tries + 1)} of ${MAX_TRIES}` : ""}</span>
              </div>
              <div style={{ display: "flex", gap: 14 }}>
                {phrase.map((_, i) => <span key={i} style={slot(i)}>{slotText(i)}</span>)}
              </div>
            </div>
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 10, justifyContent: "flex-end" }}>
          <div style={CARD_TITLE}>What you&apos;ve played</div>
          {mode === "midi"
            ? <PianoStrip keys={STRIP_KEYS} height={150} lit={lit} />
            : <Keyboard from={STRIP_FROM} to={STRIP_FROM + 24} height={150} tones={tones} disabled={paused || phase === "playing" || done} onNoteOn={(m) => tap.note(m, "on")} onNoteOff={(m) => tap.note(m, "off")} />}
        </div>
      </div>
      <PartBar actions={
        <>
          {!done && <Button variant="secondary" size="control" icon="replay" disabled={paused || phase === "playing" || midAttempt} onClick={() => void play()}>{heard ? "Hear it again" : "Hear it"}</Button>}
          {done
            ? <Button size="control" iconAfter icon="arrow_forward" disabled={paused} onClick={next}>{last ? "Next — reading" : "Next phrase"}</Button>
            : <Button variant="secondary" size="control" icon="skip_next" disabled={paused || phase === "playing"} onClick={next}>Skip this one</Button>}
        </>
      }>
        <StatChip tone="mint" value={back} unit={`/${Math.max(rows.length, 1)}`} label={<>phrases<br />back</>} />
        <div style={{ ...NOTE, maxWidth: 220 }}>First or second hearing counts the same.</div>
      </PartBar>
    </>
  );
}
