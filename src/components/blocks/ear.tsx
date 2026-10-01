"use client";
import * as React from "react";
import type { BlockProps } from "./types";
import { BottomBar, Button, Icon, Panel, PianoStrip, SheetPanel, Staff, StatChip, Small, keySignatureFor, midiToStep, type PianoStripLit, type StaffNote, type StaffRegion } from "@/components/ds";
import { useAudio } from "@/lib/hooks/use-audio";
import { useInput } from "@/lib/hooks/use-input";
import { useAppStore } from "@/lib/store/app-store";
import { contourWords, firstStepHint, generatePhrase, guidance, noteName, ordinal, stepHint, stepName, WORDS, type EarPhrase } from "@/lib/generator/ear";
import { prefersFlats } from "@/lib/music/scales";
import { isBlackKey } from "@/lib/music/notes";

/*
 * Ear. Three phases per phrase: the app plays three to five notes in the key (Listen), the player echoes them
 * on the keys with no page in sight (Play it back), then taps where each note sits on the staff (Find it on
 * the staff). A phrase counts once both halves are done. Nothing is ever red: a wrong note is "higher than B".
 */

const PHRASES = 5;
const LINE_GAP = 22;
const STAFF_TOP = 60;
const STAFF_W = 760;
const STAFF_H = 220;
const CLEF = "treble" as const;

type Phase = "listen" | "play" | "staff";
interface Slot { placed: boolean; shown: boolean }

/** White-key index on a 15-key strip that starts at C4, and whether the note is a black key. */
function stripIndex(midi: number): { white: number; black: boolean } | null {
  if (midi < 60 || midi > 84) return null;
  let white = 0;
  for (let m = 60; m < midi; m++) if (!isBlackKey(m)) white++;
  return isBlackKey(midi) ? { white: white - 1, black: true } : { white, black: false };
}

export function EarBlock({ child, session, scale, inputMode, timeUp, paused, nextTitle, onDone, setMeta }: BlockProps) {
  const { audio, unlock } = useAudio();
  const updateSettings = useAppStore((s) => s.updateSettings);
  const flats = prefersFlats(scale);
  const level = Math.max(1, Math.min(5, child.settings.theoryLevel || 1));

  // ---- the phrases ----
  const [index, setIndex] = React.useState(0);
  const phrase: EarPhrase = React.useMemo(() => generatePhrase(level, scale, `${session.id}-ear-${index}`), [level, scale, session.id, index]);
  const total = phrase.midis.length;
  const [phase, setPhase] = React.useState<Phase>("listen");
  const [heard, setHeard] = React.useState(0);
  const [slow, setSlow] = React.useState(false);
  const [played, setPlayed] = React.useState<number[]>([]);
  const [lastWrong, setLastWrong] = React.useState<number | null>(null);
  const [firstTry, setFirstTry] = React.useState(true);
  const [revealed, setRevealed] = React.useState(false);
  const [slots, setSlots] = React.useState<Slot[]>([]);
  /** The staff step a wrong tap landed on, so the message can name that spot. */
  const [missTap, setMissTap] = React.useState<number | null>(null);
  // ---- the tally ----
  const [done, setDone] = React.useState(0);
  const [byEar, setByEar] = React.useState(0);
  const [found, setFound] = React.useState(0);
  const [cleanStaff, setCleanStaff] = React.useState(0);
  const unavailable = inputMode === "timer";

  const steps = React.useMemo(() => phrase.midis.map((m) => midiToStep(m, CLEF, flats)), [phrase, flats]);
  const placedCount = slots.filter((s) => s.placed).length;
  const slot = Math.min(placedCount, total - 1);
  const phraseLabel = `Phrase ${index + 1} of ${PHRASES}`;

  React.useEffect(() => {
    setMeta?.(phase === "staff" ? `${phraseLabel} · find it on the staff` : <>Echo · three to five notes · {scale.name}</>);
    return () => setMeta?.(null);
  }, [setMeta, phase, phraseLabel, scale.name]);

  // ---- listen ----
  const play = React.useCallback(async (which: "all" | "first" = "all") => {
    await unlock();
    const gap = (60 / phrase.bpm) * (slow ? 2 : 1);
    audio.playSequence(which === "first" ? [phrase.midis[0]] : phrase.midis, gap, Math.min(0.9, gap * 0.9), 0.85);
    if (which === "all") setHeard((h) => h + 1);
  }, [audio, unlock, phrase, slow]);
  // A new phrase plays itself once, then listening for the echo starts. (Cleanup-safe under StrictMode.)
  React.useEffect(() => {
    if (unavailable || paused || phase !== "listen") return;
    const id = setTimeout(() => { void play(); setPhase("play"); }, 350);
    return () => clearTimeout(id);
  }, [phrase.seed, phase, paused, play, unavailable]);

  // ---- play it back ----
  const expectedRef = React.useRef({ phase, played, total, slot: 0 });
  React.useEffect(() => { expectedRef.current = { phase, played, total, slot }; });
  const { tap } = useInput({
    onNote: (e) => {
      if (e.kind !== "on" || paused) return;
      const cur = expectedRef.current;
      if (cur.phase === "play") {
        const k = cur.played.length;
        if (k >= cur.total) return;
        if (e.midi === phrase.midis[k]) {
          const next = [...cur.played, e.midi];
          setPlayed(next);
          setLastWrong(null);
          if (next.length === cur.total) {
            if (firstTryRef.current) setByEar((n) => n + 1);
            setSlots(phrase.midis.map(() => ({ placed: false, shown: false })));
          }
        } else {
          setLastWrong(e.midi);
          firstTryRef.current = false;
          setFirstTry(false);
        }
      } else if (cur.phase === "staff") {
        placeIfRight(e.midi === phrase.midis[cur.slot] ? "note" : "miss", midiToStep(e.midi, CLEF, flats));
      }
    },
  });
  void tap;
  const firstTryRef = React.useRef(true);
  const echoed = played.length === total && total > 0;

  // ---- find it on the staff ----
  const placeIfRight = (how: "tap" | "note" | "show" | "miss", value?: number) => {
    setSlots((s) => {
      const k = s.findIndex((x) => !x.placed);
      if (k < 0) return s;
      if (how === "miss") { setMissTap(value ?? null); return s; }
      const next = s.map((x, i) => (i === k ? { placed: true, shown: how === "show" } : x));
      setMissTap(null);
      if (next.every((x) => x.placed)) {
        setFound((n) => n + 1);
        setDone((n) => n + 1);
        if (next.every((x) => !x.shown)) setCleanStaff((n) => n + 1);
      }
      return next;
    });
  };
  const onStaffTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (phase !== "staff" || placedCount >= total) return;
    const box = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - box.top - (box.height - STAFF_H) / 2;
    const step = Math.round((y - STAFF_TOP) / (LINE_GAP / 2));
    const want = steps[slot];
    if (step === want) placeIfRight("tap");
    else placeIfRight("miss", step);
  };
  const allPlaced = total > 0 && placedCount >= total;

  const nextPhrase = () => {
    if (index + 1 >= PHRASES) { finish(); return; }
    setIndex(index + 1);
    setPhase("listen");
    setHeard(0);
    setPlayed([]);
    setLastWrong(null);
    setFirstTry(true);
    firstTryRef.current = true;
    setRevealed(false);
    setSlots([]);
    setMissTap(null);
  };
  const finish = () => {
    const promoted = done >= PHRASES - 1 && byEar >= PHRASES - 1 && cleanStaff >= PHRASES - 1 && level < 5;
    if (promoted) void updateSettings(child.id, { theoryLevel: level + 1 });
    onDone({ completed: true, skipped: false, inputMode, details: { phrases: done, byEarFirstTry: byEar, foundOnStaff: found, level, seed: phrase.seed, promoted } });
  };

  if (unavailable) {
    return (
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, minHeight: 0, padding: "20px 32px", display: "flex", flexDirection: "column", gap: 14 }}>
          <Panel padding="roomy" style={{ maxWidth: 640, gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span style={{ width: 56, height: 56, flex: "none", borderRadius: 16, background: "var(--kc-indigo-wash)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="hearing" size={30} color="var(--kc-indigo)" /></span>
              <div>
                <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 22, fontWeight: 600, lineHeight: 1.15 }}>Plug the keyboard in, or use the microphone</div>
                <Small>The app plays three to five notes and listens for them back. The timer can’t hear you, so this stop waits for next time.</Small>
              </div>
            </div>
            <Small color="var(--kc-ink-faint)">Timer-only sessions still get the other four stops that work this way.</Small>
          </Panel>
        </div>
        <BottomBar actions={<Button size="control" icon="arrow_forward" iconAfter onClick={() => onDone({ completed: true, skipped: false, inputMode, details: { phrases: 0, byEarFirstTry: 0, foundOnStaff: 0, level, unavailable: true } })}>{nextTitle ? `Next — ${nextTitle}` : "Finish"}</Button>} />
      </div>
    );
  }

  // ---- copy ----
  const shape = contourWords(played);
  const contourLine = lastWrong !== null
    ? `${played.length ? `Right shape so far — ${shape}. ` : ""}${guidance(phrase.midis[played.length], lastWrong, scale, played.length, total)}`
    : echoed ? `${WORDS[total][0].toUpperCase()}${WORDS[total].slice(1)} for ${WORDS[total]} — ${shape}.`
    : played.length ? `Right shape so far — ${shape}.`
    : revealed ? `It starts on ${noteName(phrase.midis[0], scale)}. Play it, then the rest.` : "Play the first note when you’re ready.";
  const heardLine = heard === 0 ? "Playing it now." : heard === 1 ? "Heard once so far. Hearing it more doesn’t cost anything." : `Heard ${WORDS[heard] ?? heard} times so far. Hearing it more doesn’t cost anything.`;

  const lit: PianoStripLit = { whites: {}, blacks: {}, labels: {} };
  for (const m of played) {
    const s = stripIndex(m);
    if (!s) continue;
    if (s.black) lit.blacks![s.white] = "var(--kc-mint)";
    else { lit.whites![s.white] = "var(--kc-mint)"; lit.labels![s.white] = noteName(m, scale); }
  }

  // ---- phase cards ----
  const phaseCard = (n: number, title: string, detail: string, state: "done" | "current" | "pending") => (
    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 12, borderRadius: 18, padding: "12px 16px", boxSizing: "border-box", ...(state === "done" ? { background: "var(--kc-mint-wash)" } : state === "current" ? { background: "var(--kc-indigo)", color: "#ffffff", boxShadow: "0 4px 0 0 var(--kc-indigo-shadow)" } : { background: "var(--kc-panel)", border: "2px solid var(--kc-border)" }) }}>
      <span style={{ width: 36, height: 36, flex: "none", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--kc-font-display)", fontSize: 18, fontWeight: 600, ...(state === "done" ? { background: "var(--kc-mint)", color: "var(--kc-ink)" } : state === "current" ? { background: "#ffffff", color: "var(--kc-indigo)" } : { background: "var(--kc-cream)", color: "var(--kc-ink-faint)" }) }}>
        {state === "done" ? <Icon name="check" size={20} /> : n}
      </span>
      <div>
        <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 17, fontWeight: 600, lineHeight: 1.15 }}>{title}</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: state === "current" ? "#ffffff" : "var(--kc-ink-muted)" }}>{detail}</div>
      </div>
    </div>
  );
  const arrow = <Icon name="arrow_forward" size={24} color="var(--kc-ink-faint)" />;
  const listenState = heard > 0 || phase !== "listen" ? "done" : "current";
  const playState = phase === "staff" ? "done" : echoed ? "done" : listenState === "done" ? "current" : "pending";
  const staffState = phase === "staff" ? "current" : "pending";
  const phaseRow = (
    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
      {phaseCard(1, "Listen", listenState === "done" ? "The app played it" : "The app plays it", listenState)}
      {arrow}
      {phaseCard(2, "Play it back", playState === "done" ? (firstTry ? "First try" : "Done") : "By ear — no page", playState)}
      {arrow}
      {phaseCard(3, "Find it on the staff", phase === "staff" ? "Tap a line or a space" : "Tap the notes you played", staffState)}
    </div>
  );

  // ---- D3: listen and play it back ----
  if (phase !== "staff") {
    const lo = Math.min(...phrase.midis);
    const hi = Math.max(...phrase.midis);
    const dotTop = (m: number) => (hi === lo ? 46 : 4 + ((hi - m) / (hi - lo)) * 78);
    const dotLeft = (i: number) => 20 + i * 130;
    return (
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, minHeight: 0, padding: "20px 32px", display: "flex", flexDirection: "column", gap: 14 }}>
          {phaseRow}
          <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "300px minmax(0, 1fr)", gap: 16 }}>
            <Panel style={{ padding: "18px 20px", minHeight: 0 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 20, fontWeight: 600, lineHeight: 1.15 }}>{phraseLabel}</div>
                <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 800, color: "var(--kc-ink-faint)" }}>{WORDS[total]} notes</span>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
                <button type="button" aria-label="Hear it again" onClick={() => void play()} className="kc-press kc-btn-primary" style={{ width: 132, height: 132, border: "none", borderRadius: "50%", background: "var(--kc-indigo)", color: "#ffffff", boxShadow: "0 7px 0 0 var(--kc-indigo-shadow), 0 0 0 12px var(--kc-indigo-wash)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="volume_up" size={60} />
                </button>
                <span style={{ fontFamily: "var(--kc-font-display)", fontSize: 18, fontWeight: 600 }}>Hear it again</span>
              </div>
              <Small color="var(--kc-ink-faint)">{heardLine}{slow ? " Playing at half speed." : ""}</Small>
            </Panel>
            <Panel style={{ padding: "18px 20px", minHeight: 0, justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 20, fontWeight: 600, lineHeight: 1.15 }}>What you’ve played back</div>
                <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 800, color: "var(--kc-ink-faint)" }}>higher ↑</span>
              </div>
              <div style={{ position: "relative", height: 150 }}>
                {phrase.midis.map((m, i) => {
                  const got = i < played.length;
                  const current = i === played.length;
                  if (!got && !current) return null;
                  const name = got ? noteName(m, scale) : revealed && i === 0 ? noteName(m, scale) : "?";
                  const top = got ? dotTop(m) : lastWrong !== null ? dotTop(Math.max(lo, Math.min(hi, lastWrong))) : 46;
                  return (
                    <span key={i} style={{ position: "absolute", left: dotLeft(i), top, width: 58, height: 58, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--kc-font-display)", fontSize: 21, fontWeight: 600, transition: "top 160ms ease-out", ...(got ? { background: "var(--kc-mint)", color: "var(--kc-ink)", boxShadow: "0 4px 0 0 #04a37a" } : lastWrong !== null ? { background: "var(--kc-lilac)", border: "3px solid var(--kc-indigo)", color: "var(--kc-indigo-shadow)" } : { background: "var(--kc-panel)", border: "3px solid var(--kc-indigo)", color: "var(--kc-indigo)" }) }}>
                      {got ? name : lastWrong !== null ? noteName(lastWrong, scale) : name}
                    </span>
                  );
                })}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.4, color: "var(--kc-indigo-shadow)" }}>{contourLine}</div>
            </Panel>
          </div>
          <PianoStrip keys={15} height={110} lit={lit} style={{ flex: "none" }} />
        </div>
        <BottomBar actions={<>
          <Button variant="secondary" size="control" icon="slow_motion_video" onClick={() => { setSlow((s) => !s); }} style={slow ? { borderColor: "var(--kc-indigo)", color: "var(--kc-indigo)" } : undefined}>{slow ? "Normal speed" : "Play it slower"}</Button>
          <Button variant="secondary" size="control" icon="lightbulb" disabled={echoed || revealed} onClick={() => { setRevealed(true); firstTryRef.current = false; setFirstTry(false); void play("first"); }}>Give me the first note</Button>
          <Button size="control" icon="arrow_forward" iconAfter disabled={!echoed} onClick={() => setPhase("staff")}>Find it on the staff</Button>
        </>}>
          <StatChip tone="mint" value={byEar} unit={`/${index + (echoed ? 1 : 0)}`} label={<>phrases<br />by ear</>} />
          <StatChip tone="indigo" icon="hearing" line1={firstTry ? "First try" : "Second try"} line2={byEar === index && index > 0 ? "on all so far" : index === 0 ? "this is the first" : `on ${WORDS[byEar]} so far`} />
          {timeUp && <StatChip tone="sun" icon="timer" line1="Time" line2="finish this phrase" />}
        </BottomBar>
      </div>
    );
  }

  // ---- D3b: find it on the staff ----
  const staffNotes: StaffNote[] = phrase.midis.map((m, i): StaffNote => ({ bar: 0, beat: i, step: steps[i], value: "quarter", state: i < placedCount ? "played" : i === slot ? "current" : "upcoming" })).filter((_, i) => i < placedCount || (i === slot && (slots[i]?.shown || false)));
  const regions: StaffRegion[] = allPlaced ? [] : [{ bar: 0, beat: slot, width: (STAFF_W - 160) / total }];
  const hint = slot === 0 ? firstStepHint(phrase.midis[0], steps[0], scale) : stepHint(phrase.midis[slot - 1], phrase.midis[slot], steps[slot - 1], steps[slot], scale) + (slot === 1 ? " — the note you started on." : "");
  const curName = noteName(phrase.midis[slot], scale);
  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, minHeight: 0, padding: "20px 32px", display: "flex", flexDirection: "column", gap: 14 }}>
        {phaseRow}
        <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "minmax(0, 1fr) 300px", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
            <SheetPanel padding={0} style={{ cursor: allPlaced ? "default" : "pointer" }}>
              <div onClick={onStaffTap} role={allPlaced ? undefined : "button"} aria-label={allPlaced ? undefined : `Tap where ${curName} sits on the staff`} style={{ width: STAFF_W, height: STAFF_H, display: "flex", alignItems: "center" }}>
                <Staff
                  systems={[{ clef: CLEF, top: STAFF_TOP, keySignature: keySignatureFor(scale, CLEF), timeLeft: 120 }]}
                  notes={staffNotes}
                  regions={regions}
                  layout={{ bars: 1, beatsPerBar: total, left: 160, right: 40 }}
                  width={STAFF_W}
                  height={STAFF_H}
                  lineGap={LINE_GAP}
                />
              </div>
            </SheetPanel>
            <div style={{ display: "flex", gap: 10, padding: "0 40px" }}>
              {phrase.midis.map((m, i) => {
                const s = slots[i];
                const state = s?.placed ? "done" : i === slot && !allPlaced ? "current" : "pending";
                return (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 52, height: 52, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--kc-font-display)", fontSize: 20, fontWeight: 600, boxSizing: "border-box", ...(state === "done" ? { background: "var(--kc-mint)", color: "var(--kc-ink)" } : state === "current" ? { background: "var(--kc-indigo)", color: "#ffffff", boxShadow: "0 4px 0 0 var(--kc-indigo-shadow)" } : { border: "3px dashed var(--kc-border-dashed)", color: "var(--kc-ink-faint)" }) }}>
                      {state === "done" ? <Icon name="check" size={24} /> : state === "current" ? "?" : ""}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: state === "current" ? "var(--kc-indigo)" : "var(--kc-ink-faint)" }}>{ordinal(i + 1)}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
            <Panel tone="indigo">
              <div style={{ fontSize: 14, fontWeight: 800, color: "var(--kc-indigo-shadow)" }}>{allPlaced ? "All placed" : `The ${ordinal(slot + 1).replace(/(\d+)(st|nd|rd|th)/, (_, n, suf) => ["first", "second", "third", "fourth", "fifth"][Number(n) - 1] ?? n + suf)} note`}</div>
              <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 26, fontWeight: 600, lineHeight: 1.15 }}>{allPlaced ? `${WORDS[total][0].toUpperCase()}${WORDS[total].slice(1)} notes, heard and found.` : `You played ${curName}`}</div>
              <Small>{allPlaced ? "That phrase counts. Next phrase when you’re ready." : missTap !== null ? `That spot is ${stepName(missTap, scale)}. ${curName} is ${missTap < steps[slot] ? "lower" : "higher"} on the page.` : `Tap the staff where ${curName} goes, or play it again on the keys to see it appear.`}</Small>
            </Panel>
            {!allPlaced && (
              <Panel tone="sun">
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <Icon name="lightbulb" size={24} color="var(--kc-sun-ink)" />
                  <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.4 }}>{hint}</div>
                </div>
              </Panel>
            )}
            <Panel style={{ marginTop: "auto", padding: "16px 18px", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 17, fontWeight: 600, lineHeight: 1.15 }}>Phrases</div>
                <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 800, color: "var(--kc-ink-faint)" }}>{index + 1} of {PHRASES}</span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {Array.from({ length: PHRASES }, (_, i) => <span key={i} style={{ flex: 1, height: 12, borderRadius: 999, background: i < done ? "var(--kc-mint)" : i === index ? "var(--kc-indigo)" : "var(--kc-border)" }} />)}
              </div>
              <Small color="var(--kc-ink-faint)">A phrase counts once it’s heard <b>and</b> found.</Small>
            </Panel>
          </div>
        </div>
      </div>
      <BottomBar actions={<>
        <Button variant="secondary" size="control" icon="volume_up" onClick={() => void play()}>Hear it again</Button>
        <Button variant="secondary" size="control" icon="visibility" disabled={allPlaced} onClick={() => placeIfRight("show")}>Show me this one</Button>
        <Button size="control" icon="arrow_forward" iconAfter disabled={!allPlaced && !timeUp} onClick={() => (allPlaced ? nextPhrase() : finish())}>{index + 1 >= PHRASES || (timeUp && !allPlaced) ? (nextTitle ? `Next — ${nextTitle}` : "Finish") : "Next phrase"}</Button>
      </>}>
        <StatChip tone="mint" value={placedCount} unit={`/${total}`} label={<>notes<br />placed</>} />
        <StatChip tone="indigo" icon="menu_book" line1="Both halves count" line2="heard it · found it" />
      </BottomBar>
    </div>
  );
}
