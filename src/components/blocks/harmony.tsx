"use client";
import * as React from "react";
import type { BlockProps } from "./types";
import type { Scale, Triad } from "@/lib/types";
import { Button, ChordChart, Keyboard, LogTable, Metric, Pill, SectionLabel, SegmentBar, SheetPanel, type ChordBar, type KeyTone, type LogRow } from "@/components/ds";
import { useAudio } from "@/lib/hooks/use-audio";
import { useInput } from "@/lib/hooks/use-input";
import { useAppStore } from "@/lib/store/app-store";
import { invertTriad, primaryTriads } from "@/lib/music/scales";
import { chordSymbol, romanToTriad, seventhOf } from "@/lib/music/chords";
import { pcToMidi, prettyPc } from "@/lib/music/notes";
import { hashString, pick, seededRandom } from "@/lib/utils/random";

/*
 * Harmony (design C2). Two halves, both on the cream chart:
 *   1. Hear it, then find it — the engine plays a chord from the key; the student names it on the chart or plays
 *      it (MIDI, on-screen keys, or a mic check). Naming and playing are both required for the point.
 *   2. The changes — a four-bar progression twice through with the metronome; each change scored on the first
 *      beat of its bar. Level 1 asks I, IV, V, vi; ii and iii arrive at level 2, inversions at 3, sevenths at 4.
 */

const ASKED = 8;
const CHART_BARS = 8;
const LATE_MS = 120;
const ORDINAL = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh"];

type Inversion = 0 | 1 | 2;
interface Question { triad: Triad; midis: number[]; inversion: Inversion; seventh: boolean; label: string }
interface Answer { right: boolean; named: string; played: boolean }
type Step = "name" | "play" | "done";
type BarMark = { late: number } | "missed" | null;

function poolFor(scale: Scale, level: number): Triad[] {
  return level <= 1 ? primaryTriads(scale) : scale.triads.slice(0, 6);
}

function invertNotes(midis: number[], inv: number): number[] {
  let out = [...midis];
  for (let k = 0; k < inv; k++) {
    const [first, ...rest] = out;
    out = [...rest, first + 12];
  }
  return out;
}

function chordMidis(t: Triad, scale: Scale, inversion: Inversion, seventh: boolean): number[] {
  return seventh ? invertNotes(seventhOf(t, scale), inversion) : [...invertTriad(t.midi, inversion)];
}

function chordLabel(t: Triad, scale: Scale, seventh: boolean): string {
  if (!seventh) return chordSymbol(t);
  const seven = seventhOf(t, scale);
  const interval = (seven[3] - seven[0]) % 12;
  if (t.quality === "diminished") return `${prettyPc(t.root)}ø7`;
  if (t.quality === "major" && interval === 11) return `${chordSymbol(t)}maj7`;
  return `${chordSymbol(t)}7`;
}

const pc = (m: number) => ((m % 12) + 12) % 12;
function pcs(midis: Iterable<number>): Set<number> {
  const s = new Set<number>();
  for (const m of midis) s.add(pc(m));
  return s;
}
const covers = (have: Set<number>, want: number[]) => want.every((m) => have.has(pc(m)));
const within = (have: Set<number>, want: number[]) => { const w = pcs(want); return Array.from(have).every((p) => w.has(p)); };

function makeQuestions(scale: Scale, level: number, rng: () => number): Question[] {
  const pool = poolFor(scale, level);
  const out: Question[] = [];
  let prev: Triad | null = null;
  for (let i = 0; i < ASKED; i++) {
    const last = prev;
    const t: Triad = pick(rng, last ? pool.filter((x) => x !== last) : pool);
    prev = t;
    const inversion: Inversion = level >= 3 ? pick(rng, [0, 1, 2] as Inversion[]) : 0;
    const seventh = level >= 4 && rng() < (level >= 5 ? 0.5 : 0.3);
    out.push({ triad: t, inversion, seventh, midis: chordMidis(t, scale, inversion, seventh), label: chordLabel(t, scale, seventh) });
  }
  return out;
}

const PROGRESSIONS_1 = [["I", "IV", "V", "I"], ["I", "vi", "IV", "V"], ["I", "V", "vi", "IV"]];
const PROGRESSIONS_2 = [...PROGRESSIONS_1, ["I", "vi", "ii", "V"], ["I", "iii", "IV", "V"], ["vi", "IV", "I", "V"]];

function makeProgression(scale: Scale, level: number, rng: () => number): Triad[] {
  const romans = pick(rng, level <= 1 ? PROGRESSIONS_1 : PROGRESSIONS_2);
  return romans.map((r) => romanToTriad(r, scale) ?? scale.triads[0]);
}

function describe(q: { triad: Triad; inversion?: Inversion; seventh?: boolean }, scale: Scale): string {
  const t = q.triad;
  const fifth = scale.notes[(t.degree - 1 + 4) % 7];
  const quality = t.quality === "major" ? "major" : t.quality === "minor" ? "minor, the third a half step lower" : t.quality === "diminished" ? "diminished, the fifth flattened" : "augmented";
  const inv = q.inversion === 1 ? ", first inversion with the root on top" : q.inversion === 2 ? ", second inversion with the fifth at the bottom" : "";
  const seventh = q.seventh ? ", seventh added" : "";
  return `Left hand: ${prettyPc(t.root)} and ${prettyPc(fifth)}. ${ORDINAL[t.degree - 1][0].toUpperCase()}${ORDINAL[t.degree - 1].slice(1)} degree of ${prettyPc(scale.key)} — ${quality}${inv}${seventh}.`;
}

function useTimeouts() {
  const ids = React.useRef<Set<number>>(new Set());
  const after = React.useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => { ids.current.delete(id); fn(); }, ms);
    ids.current.add(id);
  }, []);
  const clear = React.useCallback(() => { for (const id of ids.current) clearTimeout(id); ids.current.clear(); }, []);
  React.useEffect(() => clear, [clear]);
  return { after, clear };
}

export function HarmonyBlock({ child, session, scale, index, inputMode, nextTitle, paused, timeUp, onDone, setPrimaryLabel }: BlockProps) {
  const { audio, unlock } = useAudio();
  const updateSettings = useAppStore((s) => s.updateSettings);
  const { after, clear } = useTimeouts();
  const level = Math.min(5, Math.max(1, child.settings.theoryLevel || 1));
  const keyName = prettyPc(scale.key);

  const [setup] = React.useState(() => {
    const rng = seededRandom(hashString(`${session.id}:theory:${index}`));
    return { questions: makeQuestions(scale, level, rng), progression: makeProgression(scale, level, rng) };
  });
  const { questions, progression } = setup;
  const pool = React.useMemo(() => poolFor(scale, level), [scale, level]);
  const chartChords = React.useMemo(() => [...progression, ...progression], [progression]);
  const tonic = pcToMidi(scale.key, 4);
  const kbFrom = tonic - 7;
  const kbTo = kbFrom + 35;

  React.useEffect(() => { setPrimaryLabel?.(null); }, [setPrimaryLabel]);

  // ---- hear it, then find it ----
  const [phase, setPhase] = React.useState<"find" | "play">("find");
  const [qIndex, setQIndex] = React.useState(0);
  const [step, setStep] = React.useState<Step>("name");
  const [answers, setAnswers] = React.useState<Answer[]>([]);
  const answersRef = React.useRef<Answer[]>([]);
  const [heard, setHeard] = React.useState(1);
  const [checking, setChecking] = React.useState<"idle" | "listening" | "unheard">("idle");
  const [promoted, setPromoted] = React.useState(false);
  const [held, setHeld] = React.useState<number[]>([]);
  const heldRef = React.useRef<Set<number>>(new Set());
  const recentRef = React.useRef<{ midi: number; time: number }[]>([]);
  const question: Question | undefined = questions[qIndex];

  // The engine plays each new chord once, unprompted.
  React.useEffect(() => {
    if (phase !== "find" || !question) return;
    const id = window.setTimeout(() => audio.playChord(question.midis, 1.4, 0.7), 400);
    return () => clearTimeout(id);
  }, [phase, question, audio]);

  const pushAnswer = (a: Answer) => { answersRef.current = [...answersRef.current, a]; setAnswers(answersRef.current); };

  const nextQuestion = React.useCallback(() => {
    if (qIndex + 1 >= ASKED) {
      const right = answersRef.current.filter((a) => a.right).length;
      if (right === ASKED && level < 5) { setPromoted(true); void updateSettings(child.id, { theoryLevel: level + 1 }); }
      setPhase("play");
      return;
    }
    setQIndex(qIndex + 1);
    setStep("name");
    setHeard(1);
    setChecking("idle");
  }, [qIndex, level, updateSettings, child.id]);

  const completeQuestion = React.useCallback(() => {
    setStep("done");
    after(() => nextQuestion(), 650);
  }, [after, nextQuestion]);

  const answer = (named: string, played: boolean) => {
    if (!question || step !== "name") return;
    const right = named === question.label;
    pushAnswer({ right, named, played: right && played });
    if (right && played) { completeQuestion(); return; }
    setStep("play");
    if (!right) after(() => audio.playChord(question.midis, 1.2, 0.7), 350);
  };

  const finishPlay = (played: boolean) => {
    if (step !== "play") return;
    if (played) { const a = answersRef.current; const last = a[a.length - 1]; if (last) { answersRef.current = [...a.slice(0, -1), { ...last, played: true }]; setAnswers(answersRef.current); } }
    completeQuestion();
  };

  // ---- the changes ----
  const countIn = child.settings.countIn;
  const [running, setRunning] = React.useState(false);
  const [bpm, setBpm] = React.useState(84);
  const bpmRef = React.useRef(bpm);
  const [bar, setBar] = React.useState<number>(countIn ? -1 : 0);
  const [beat, setBeat] = React.useState(-1);
  const [marks, setMarks] = React.useState<BarMark[]>(() => Array<BarMark>(CHART_BARS).fill(null));
  const [choruses, setChoruses] = React.useState(0);
  const [changes, setChanges] = React.useState({ clean: 0, total: 0, lastLate: null as number | null, lastLateBar: null as number | null, worst: 0 });
  const barRef = React.useRef(countIn ? -1 : 0);
  const barStartRef = React.useRef(0);
  const barDoneRef = React.useRef(false);
  const firstOnsetRef = React.useRef<number | null>(null);
  const startedRef = React.useRef(false);

  const markBar = React.useCallback((i: number, late: number) => {
    barDoneRef.current = true;
    setMarks((m) => { const n = [...m]; n[i] = { late }; return n; });
    setChanges((c) => ({ clean: c.clean + (late <= LATE_MS ? 1 : 0), total: c.total + 1, lastLate: late > LATE_MS ? late : c.lastLate, lastLateBar: late > LATE_MS ? i : c.lastLateBar, worst: Math.max(c.worst, late) }));
  }, []);

  const { input, tap } = useInput({
    onNote: (e) => {
      if (e.kind === "on") { heldRef.current.add(e.midi); recentRef.current.push({ midi: e.midi, time: e.time }); } else heldRef.current.delete(e.midi);
      recentRef.current = recentRef.current.filter((r) => e.time - r.time < 700);
      setHeld(Array.from(heldRef.current));
      if (e.kind !== "on" || paused) return;
      const have = pcs([...Array.from(heldRef.current), ...recentRef.current.map((r) => r.midi)]);
      if (phase === "find") {
        if (!question || step === "done") return;
        if (covers(have, question.midis)) { if (step === "name") answer(question.label, true); else finishPlay(true); return; }
        if (step === "name" && !within(have, question.midis)) {
          const other = pool.find((t) => t !== question.triad && covers(have, t.midi));
          if (other) answer(chordLabel(other, scale, question.seventh), true);
        }
        return;
      }
      const i = barRef.current;
      if (i < 0 || barDoneRef.current || !running) return;
      if (firstOnsetRef.current === null) firstOnsetRef.current = e.time;
      if (covers(have, chartChords[i].midi)) markBar(i, Math.max(0, Math.round(firstOnsetRef.current - barStartRef.current)));
    },
  });

  const onBeat = (b: number) => {
    if (b === 0) {
      const prev = barRef.current;
      if (prev >= 0 && !barDoneRef.current) { setMarks((m) => { const n = [...m]; n[prev] = "missed"; return n; }); setChanges((c) => ({ ...c, total: c.total + 1 })); }
      if (prev === CHART_BARS - 1) setChoruses((c) => c + 1);
      const nb = prev + 1 >= CHART_BARS ? 0 : prev + 1;
      barRef.current = nb;
      barStartRef.current = performance.now();
      barDoneRef.current = false;
      firstOnsetRef.current = null;
      setBar(nb);
      if (inputMode === "mic") {
        const midis = chartChords[nb].midi;
        void input.verifyChord([...midis], Math.round((240000 / bpmRef.current) * 0.8)).then((r) => { if (r === "heard" && barRef.current === nb && !barDoneRef.current) markBar(nb, 0); });
      }
    }
    setBeat(b);
  };
  const onBeatRef = React.useRef(onBeat);
  React.useEffect(() => { onBeatRef.current = onBeat; });

  React.useEffect(() => {
    if (phase !== "play" || !running || paused) return;
    audio.startMetronome({ bpm: bpmRef.current, beatsPerBar: 4, onBeat: (b) => onBeatRef.current(b) });
    return () => audio.stopMetronome();
  }, [phase, running, paused, audio]);
  React.useEffect(() => { bpmRef.current = bpm; if (running) audio.setMetronomeBpm(bpm); }, [bpm, running, audio]);

  const toggleChanges = () => {
    void unlock();
    if (running) { setRunning(false); setBeat(-1); return; }
    if (!startedRef.current) { startedRef.current = true; }
    setRunning(true);
  };

  const hearChanges = () => {
    void unlock();
    const barSec = 240 / bpm;
    const now = audio.now();
    progression.forEach((t, i) => audio.playChord(t.midi, barSec * 0.9, 0.7, now + i * barSec));
  };

  const finish = () => {
    clear();
    audio.stopMetronome();
    const a = answersRef.current;
    const right = a.filter((x) => x.right).length;
    const asked = a.length;
    onDone({
      completed: true,
      skipped: false,
      inputMode,
      details: { asked, right, level, promoted, played: a.filter((x) => x.played).length, choruses, changesClean: changes.clean, changesTotal: changes.total, worstLateMs: changes.worst, bpm },
      midiScore: inputMode !== "timer" && asked > 0 ? { score: Math.round((right / asked) * 100), components: { asked, right, changesClean: changes.clean, changesTotal: changes.total }, badge: null, inputMode } : undefined,
    });
  };

  // ---- derived view ----
  const answered = answers.length;
  const rightCount = answers.filter((a) => a.right).length;
  const lastMissIndex = answers.map((a, i) => (a.right ? -1 : i)).filter((i) => i >= 0).pop();
  const revealed = step !== "name";

  const findBars: ChordBar[] = pool.map((t) => ({ chord: chartLabelFor(t, scale, question?.seventh ?? false), current: revealed && !!question && t === question.triad }));
  const playBars: ChordBar[] = chartChords.map((t, i) => ({ chord: chordSymbol(t), current: running && i === bar, played: marks[i] === "missed" ? false : undefined }));

  const tones: Partial<Record<number, KeyTone>> = {};
  if (phase === "find" && step === "play" && question) for (const m of question.midis) tones[m] = "mint";
  if (phase === "play" && running && bar >= 0) for (const m of chartChords[bar].midi) tones[m] = "mint";
  for (const m of held) tones[m] = "mint";

  const rows: LogRow[] = phase === "find"
    ? questions.map((q, i) => {
        const a = answers[i];
        return { cells: [`Q${i + 1}`, a || i === qIndex ? (a || revealed ? q.label : "?") : "—", a ? (a.right ? "RIGHT" : `${a.named}, NOT ${q.label}`) : "—"], marked: !!a?.right };
      })
    : progression.map((t, i) => {
        const m = marks[i + 4] ?? marks[i];
        const state = m === null ? "—" : m === "missed" ? "MISSED" : m.late > LATE_MS ? `${m.late} MS LATE` : "CLEAN";
        return { cells: [`BAR ${i + 1}`, chordSymbol(t), state], marked: m !== null && m !== "missed" && m.late <= LATE_MS };
      });

  const lede = phase === "find"
    ? step === "name"
      ? "Hear it, then find it. Tap the chord on the chart, or play it — root and fifth is enough."
      : answers[answered - 1]?.right
        ? `That was ${question?.label}. Now play it — the keys are marked.`
        : `That was ${question?.label}, not ${answers[answered - 1]?.named}. Play it — the keys are marked.`
    : "Change on the first beat of each bar. Root and fifth is enough — the shape matters more than the voicing.";

  const findNote = answered === 0
    ? `${ASKED} chords from ${keyName} ${scale.mode === "major" ? "major" : "minor"}. Each one counts when you name it and play it.`
    : `${wordCount(rightCount)} of ${wordCount(answered)} named.${lastMissIndex !== undefined ? ` The ${questions[lastMissIndex].label} on question ${lastMissIndex + 1} came back as ${answers[lastMissIndex].named}.` : ""}`;
  const playNote = changes.total === 0
    ? promoted
      ? `${wordCount(ASKED)} of ${wordCount(ASKED)} named. Level ${level + 1} from the next session.`
      : `${wordCount(rightCount)} of ${wordCount(ASKED)} named. Now the changes — twice through the four bars is one chorus.`
    : `${wordCount(changes.clean)} of ${wordCount(changes.total)} clean.${changes.lastLate !== null && changes.lastLateBar !== null ? ` The change into bar ${(changes.lastLateBar % 4) + 1} came ${changes.lastLate} ms late.` : ""}`;

  const railChord = phase === "find" ? (revealed && question ? question.label : "?") : bar >= 0 ? chordSymbol(chartChords[bar]) : "—";
  const railWhere = phase === "find" ? `question ${Math.min(qIndex + 1, ASKED)} of ${ASKED}` : bar >= 0 ? `bar ${(bar % 4) + 1} of 4` : running ? "count in" : "not started";
  const railText = phase === "find"
    ? revealed && question ? describe(question, scale) : "Tap the chord on the chart, or play it on the keys."
    : bar >= 0 ? describe({ triad: chartChords[bar] }, scale) : "Twice through the four bars is one chorus. The keys mark each chord as its bar comes round.";

  const canCheck = inputMode === "mic" && phase === "find" && step === "play";

  return (
    <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px" }}>
      <div style={{ minHeight: 0, padding: "22px 26px 22px 30px", display: "flex", flexDirection: "column", gap: 14 }}>
        <p style={{ margin: 0, fontSize: 17, color: "var(--kc-ink-muted)" }}>{lede}</p>
        <SheetPanel padding={22} style={{ flex: 1, minHeight: 0 }}>
          <ChordChart bars={phase === "find" ? findBars : playBars} perRow={4} cellHeight={96} onBar={phase === "find" && step === "name" ? (i) => { void unlock(); answer(chartLabelFor(pool[i], scale, question?.seventh ?? false), false); } : undefined} />
        </SheetPanel>
        <Keyboard from={kbFrom} to={kbTo} height={120} tones={tones} onNoteOn={(m) => { void unlock(); audio.noteOn(m); tap.note(m, "on"); }} onNoteOff={(m) => { audio.noteOff(m); tap.note(m, "off"); }} style={{ flex: "none" }} />
        <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 22 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
            <SectionLabel>{phase === "find" ? "Named and played" : "Changes in time"}</SectionLabel>
            {phase === "find"
              ? <SegmentBar total={ASKED} filled={answered} current={Math.min(qIndex, ASKED - 1)} height={8} radius={3} />
              : <SegmentBar total={CHART_BARS} filled={running && bar >= 0 ? bar : 0} current={running && bar >= 0 ? bar : undefined} height={8} radius={3} />}
            <span style={{ fontSize: 14, color: "var(--kc-ink-muted)" }}>{phase === "find" ? findNote : playNote}</span>
          </div>
          {phase === "find" ? (
            <div style={{ display: "flex", gap: 26, alignItems: "center" }}>
              <Metric label="Named right" value={`${rightCount} / ${answered}`} tone={answered > 0 && rightCount < answered ? "amber" : undefined} />
              <Metric label="Level" value={level} />
              {canCheck && <Button variant="secondary" size="control" icon="hearing" disabled={checking === "listening"} onClick={async () => { setChecking("listening"); const r = await input.verifyChord(question!.midis, 1500); if (r === "heard") { setChecking("idle"); finishPlay(true); } else setChecking("unheard"); }}>{checking === "listening" ? "Listening" : checking === "unheard" ? "Not heard — check again" : "Check"}</Button>}
              {step === "play" && <Button variant="quiet" size="control" onClick={() => finishPlay(false)}>Move on</Button>}
            </div>
          ) : (
            <div style={{ display: "flex", gap: 26, alignItems: "center" }}>
              <Metric label="Late change" value={changes.lastLate !== null ? `${changes.lastLate} ms` : "—"} tone={changes.lastLate !== null ? "clay" : undefined} />
              <Metric label="Choruses" value={choruses} />
              <Button variant={running ? "secondary" : "primary"} size="control" icon={running ? "stop" : "play_arrow"} onClick={toggleChanges}>{running ? "Stop" : startedRef.current ? "Go again" : "Begin the changes"}</Button>
            </div>
          )}
        </div>
      </div>

      <aside style={{ borderLeft: "1px solid var(--kc-border)", background: "var(--kc-panel)", padding: "26px 24px", display: "flex", flexDirection: "column", gap: 22, minHeight: 0, overflowY: "auto" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <SectionLabel>{phase === "find" ? "The chord you heard" : "The bar you're in"}</SectionLabel>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontFamily: "var(--kc-font-mono)", fontSize: 32, color: "var(--kc-mint)" }}>{railChord}</span>
            <span style={{ fontSize: 15, color: "var(--kc-ink-muted)" }}>{railWhere}</span>
          </div>
          <div style={{ fontSize: 15, color: "var(--kc-ink-muted)", lineHeight: 1.45 }}>{railText}</div>
        </div>

        <div style={{ borderTop: "1px solid var(--kc-border)", paddingTop: 22, display: "flex", flexDirection: "column", gap: 12 }}>
          <SectionLabel>{phase === "find" ? "Hear it" : "Metronome"}</SectionLabel>
          {phase === "find" ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontFamily: "var(--kc-font-mono)", fontSize: 15, color: "var(--kc-ink-muted)" }}>heard {heard}×</span>
              <Button variant="quiet" size="pill" icon="replay" onClick={() => { void unlock(); if (question) { audio.playChord(question.midis, 1.4, 0.7); setHeard((h) => h + 1); } }}>Hear again</Button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontFamily: "var(--kc-font-mono)", fontSize: 32 }}>{bpm}</span>
              <span style={{ fontSize: 15, color: "var(--kc-ink-dim)" }}>bpm</span>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                {[0, 1, 2, 3].map((b) => <span key={b} style={{ width: 10, height: 10, borderRadius: "50%", background: running && beat === b ? "var(--kc-mint)" : "var(--kc-raised)" }} />)}
              </div>
            </div>
          )}
          {phase === "play" && <Button variant="quiet" size="pill" icon="volume_up" onClick={hearChanges} style={{ alignSelf: "flex-start" }}>Hear the changes</Button>}
        </div>

        <div style={{ borderTop: "1px solid var(--kc-border)", paddingTop: 22, display: "flex", flexDirection: "column", gap: 11 }}>
          <SectionLabel>The form</SectionLabel>
          <LogTable rows={rows} emphasize={1} />
        </div>

        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
          {timeUp && <Pill tone="amber" style={{ alignSelf: "flex-start" }}>Time</Pill>}
          <Button size="control" onClick={finish} style={{ width: "100%" }}>{nextTitle ? `Next — ${nextTitle}` : "Finish"}</Button>
          {phase === "find"
            ? <Button variant="quiet" size="control" style={{ width: "100%" }} onClick={() => { void unlock(); if (question) { audio.playChord(question.midis, 1.4, 0.7); setHeard((h) => h + 1); } }}>Hear again</Button>
            : <Button variant="quiet" size="control" style={{ width: "100%" }} onClick={() => setBpm((b) => Math.max(48, b - 8))}>Take it slower</Button>}
        </div>
      </aside>
    </div>
  );
}

function chartLabelFor(t: Triad, scale: Scale, seventh: boolean): string {
  return chordLabel(t, scale, seventh);
}

const WORDS = ["none", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
function wordCount(n: number): string {
  const w = WORDS[n] ?? String(n);
  return w[0].toUpperCase() + w.slice(1);
}
