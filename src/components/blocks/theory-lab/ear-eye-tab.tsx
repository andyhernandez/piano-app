"use client";
import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Ear, Eye, Mic, Play, Volume2 } from "lucide-react";
import type { InputMode, Scale } from "@/lib/types";
import { PianoKeyboard, keyboardRangeFor, type KeyState } from "@/components/keyboard/piano-keyboard";
import { MiniStaff } from "@/components/staff/staff";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAudio } from "@/lib/hooks/use-audio";
import { useInput } from "@/lib/hooks/use-input";
import { prefersFlats } from "@/lib/music/scales";
import { cn } from "@/lib/utils/cn";
import { choiceCountFor, makeRound, matchesPlayed, statsFor, type Round, type RoundRecord } from "./ear-eye";

type Phase = "idle" | "identify" | "quality" | "find" | "reveal";
const PLAY_WINDOW_MS = 1500;

export interface EarEyeTabProps {
  scale: Scale;
  level: number;
  /** Skill profile ear score 0-100. */
  ear: number;
  inputMode: InputMode;
  history: RoundRecord[];
  onRound: (r: RoundRecord) => void;
  onNoteOn: (m: number) => void;
  onNoteOff: (m: number) => void;
}

/**
 * Tab 2 — the linked ear-eye task (§4D). Hear a chord or interval → name it → find it on the staff (or play it).
 * A point needs both halves.
 */
export function EarEyeTab({ scale, level, ear, inputMode, history, onRound, onNoteOn, onNoteOff }: EarEyeTabProps) {
  const { audio } = useAudio();
  const flats = prefersFlats(scale);
  const [round, setRound] = React.useState<Round | null>(null);
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [step1, setStep1] = React.useState<boolean | null>(null);
  const [chosen, setChosen] = React.useState<string | null>(null);
  const [qualityRight, setQualityRight] = React.useState<boolean | null>(null);
  const [chosenQuality, setChosenQuality] = React.useState<string | null>(null);
  const [step2, setStep2] = React.useState<boolean | null>(null);
  const [chosenStaff, setChosenStaff] = React.useState<string | null>(null);
  const [hint, setHint] = React.useState<string | null>(null);
  const [micBusy, setMicBusy] = React.useState(false);
  const attempts = React.useRef(0);
  const buffer = React.useRef<{ midi: number; time: number }[]>([]);
  const timeouts = React.useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  React.useEffect(() => {
    const set = timeouts.current;
    return () => { for (const id of set) clearTimeout(id); set.clear(); };
  }, []);
  const later = React.useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => { timeouts.current.delete(id); fn(); }, ms);
    timeouts.current.add(id);
  }, []);

  const playRound = React.useCallback((r: Round) => {
    if (r.kind === "chord") {
      audio.playChord(r.midis, 1.5, 0.85);
    } else {
      // Melodic, then harmonic.
      audio.playSequence(r.midis, 0.7, 0.65, 0.8);
      audio.playChord(r.midis, 1.3, 0.85, audio.now() + 1.7);
    }
  }, [audio]);

  const startRound = () => {
    const r = makeRound(scale, level, { choiceCount: choiceCountFor(level, ear, history.length) });
    setRound(r);
    setPhase("identify");
    setStep1(null); setChosen(null); setQualityRight(null); setChosenQuality(null); setStep2(null); setChosenStaff(null); setHint(null);
    attempts.current = 0;
    buffer.current = [];
    playRound(r);
  };

  const finishRound = React.useCallback((r: Round, s1: boolean, q: boolean | null, s2: boolean, played: boolean) => {
    setStep2(s2);
    setPhase("reveal");
    const point = s1 && s2;
    audio.stinger(point ? "success" : s2 ? "pop" : "fail");
    onRound({ kind: r.kind, answer: r.answerLabel, step1: s1, step2: s2, point, quality: q ?? undefined, played });
  }, [audio, onRound]);

  const answer = (id: string) => {
    if (!round || phase !== "identify") return;
    const right = id === round.answerId;
    setChosen(id);
    setStep1(right);
    audio.stinger(right ? "pop" : "fail");
    later(() => setPhase(round.quality ? "quality" : "find"), 900);
  };

  const answerQuality = (q: "major" | "minor") => {
    if (!round || phase !== "quality") return;
    const right = q === round.quality;
    setChosenQuality(q);
    setQualityRight(right);
    audio.stinger(right ? "pop" : "fail");
    later(() => setPhase("find"), 900);
  };

  const pickStaff = (id: string) => {
    if (!round || phase !== "find" || step1 === null) return;
    setChosenStaff(id);
    finishRound(round, step1, qualityRight, id === round.answerId, false);
  };

  const { input } = useInput({
    onNote: (e) => {
      if (!round || phase !== "find" || e.kind !== "on" || step1 === null) return;
      const now = e.time;
      buffer.current = buffer.current.filter((n) => now - n.time <= PLAY_WINDOW_MS);
      buffer.current.push({ midi: e.midi, time: now });
      const distinct = Array.from(new Set(buffer.current.map((n) => n.midi)));
      if (distinct.length < round.midis.length) return;
      if (matchesPlayed(round, distinct)) { finishRound(round, step1, qualityRight, true, true); return; }
      attempts.current += 1;
      buffer.current = [];
      if (attempts.current >= 2) finishRound(round, step1, qualityRight, false, true);
      else setHint("Not quite — try once more, or tap the staff.");
    },
  });

  const verifyMic = async () => {
    if (!round || phase !== "find" || step1 === null || micBusy) return;
    setMicBusy(true);
    const heard = await input.verifyChord(round.midis, PLAY_WINDOW_MS);
    setMicBusy(false);
    if (heard === "heard") finishRound(round, step1, qualityRight, true, true);
    else setHint("Couldn't hear it clearly — hold the notes and try again, or tap the staff.");
  };

  const stats = statsFor(history);
  const range = React.useMemo(() => (round ? keyboardRangeFor(round.midis) : [60, 84] as [number, number]), [round]);
  const revealHighlights = React.useMemo(() => {
    const h: Partial<Record<number, KeyState>> = {};
    if (round && phase === "reveal") for (const m of round.midis) h[m] = "correct";
    return h;
  }, [round, phase]);
  const point = step1 && step2;
  const kindLabel = round?.kind === "chord" ? "chord" : "interval";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
        <span className="rounded-full bg-muted px-3 py-1">Round {stats.rounds + (phase !== "idle" && phase !== "reveal" ? 1 : 0)}</span>
        <span className="rounded-full bg-secondary px-3 py-1 text-secondary-foreground">⭐ {stats.points} point{stats.points === 1 ? "" : "s"}</span>
        <span className="rounded-full bg-muted px-3 py-1 text-muted-foreground">Level {level}</span>
        {round && phase !== "idle" && (
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => playRound(round)}><Volume2 className="h-4 w-4" /> Hear it again</Button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {phase === "idle" && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card>
              <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
                <div className="flex items-center gap-3 text-4xl" aria-hidden><Ear className="h-10 w-10 text-primary" /> <ArrowRight className="h-6 w-6 text-muted-foreground" /> <Eye className="h-10 w-10 text-accent" /></div>
                <div className="font-display text-2xl font-bold">Listen, then look</div>
                <p className="max-w-md text-muted-foreground">You&apos;ll hear a chord or two notes. Name what you hear, then find it on the staff{inputMode === "timer" ? " or tap it on the keyboard" : " or play it"}. Both halves make a point!</p>
                <Button size="xl" onClick={startRound}><Play className="h-7 w-7" /> {stats.rounds ? "Next round" : "Start"}</Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {round && (phase === "identify" || phase === "quality") && (
          <motion.div key="identify" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <Card>
              <CardContent className="flex flex-col gap-4 p-4">
                <div className="flex items-center gap-2 font-display text-xl font-bold"><Ear className="h-6 w-6 text-primary" /> Step 1 · What did you hear?</div>
                {phase === "identify" && (
                  <div className={cn("grid gap-3", round.choices.length <= 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4")}>
                    {round.choices.map((c) => {
                      const picked = chosen === c.id;
                      const show = chosen !== null;
                      const isAnswer = c.id === round.answerId;
                      return (
                        <motion.button
                          key={c.id}
                          type="button"
                          whileTap={{ scale: 0.95 }}
                          disabled={show}
                          onClick={() => answer(c.id)}
                          className={cn(
                            "h-20 rounded-3xl border-2 bg-card font-display text-xl font-bold shadow-[0_4px_0_0_rgba(0,0,0,0.08)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            !show && "hover:bg-muted",
                            show && isAnswer && "border-accent bg-accent text-accent-foreground",
                            show && picked && !isAnswer && "border-destructive bg-destructive text-destructive-foreground",
                          )}
                        >
                          {c.label}
                        </motion.button>
                      );
                    })}
                  </div>
                )}
                {phase === "quality" && (
                  <div className="flex flex-col gap-3">
                    <div className="font-bold">Is <span className="text-primary">{round.answerLabel}</span> major or minor?</div>
                    <div className="grid grid-cols-2 gap-3">
                      {(["major", "minor"] as const).map((q) => {
                        const show = chosenQuality !== null;
                        const isAnswer = q === round.quality;
                        return (
                          <Button key={q} size="lg" variant={show && isAnswer ? "accent" : show && chosenQuality === q ? "destructive" : "outline"} disabled={show} onClick={() => answerQuality(q)} className="h-20 font-display text-xl">
                            {q === "major" ? "😊 Major" : "🌙 Minor"}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {step1 !== null && phase === "identify" && (
                  <div className="font-bold" role="status">{step1 ? "Yes! " : "It was "}<span className="text-primary">{round.answerLabel}</span>{step1 ? "" : " — let's find it anyway."}</div>
                )}
                {qualityRight !== null && phase === "quality" && (
                  <div className="font-bold" role="status">{qualityRight ? "Right — it's " : "It's actually "}{round.quality}.</div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {round && phase === "find" && (
          <motion.div key="find" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex flex-col gap-4">
            <Card>
              <CardContent className="flex flex-col gap-4 p-4">
                <div className="flex items-center gap-2 font-display text-xl font-bold"><Eye className="h-6 w-6 text-accent" /> Step 2 · Now find <span className="text-primary">{round.answerLabel}</span></div>
                <p className="text-sm text-muted-foreground">Tap the staff that shows it{inputMode === "mic" ? ", or play it on your piano and press the mic button" : inputMode === "midi" ? ", or play it on your piano" : ", or tap the notes on the keyboard below"}.</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {round.staffOptions.map((o, i) => (
                    <motion.button
                      key={o.id}
                      type="button"
                      whileTap={{ scale: 0.97 }}
                      onClick={() => pickStaff(o.id)}
                      aria-label={`Staff option ${i + 1}`}
                      className="flex flex-col items-center gap-1 rounded-3xl border-2 bg-card p-2 shadow-[0_4px_0_0_rgba(0,0,0,0.08)] hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="pointer-events-none w-full overflow-hidden [&_svg]:mx-auto">
                        <MiniStaff midis={o.midis} keySig={scale.vexKey} preferFlats={flats} clef={Math.min(...o.midis) >= 60 ? "treble" : "bass"} />
                      </div>
                      <span className="text-sm font-bold text-muted-foreground">Option {i + 1}</span>
                    </motion.button>
                  ))}
                </div>
                {inputMode === "mic" && (
                  <Button size="lg" variant="secondary" onClick={verifyMic} disabled={micBusy} className="self-start">
                    <Mic className={cn("h-5 w-5", micBusy && "animate-pulse")} /> {micBusy ? "Listening…" : "I'm playing it"}
                  </Button>
                )}
                {hint && <div className="rounded-2xl bg-muted px-3 py-2 text-sm font-bold" role="status">{hint}</div>}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-4">
                <PianoKeyboard from={range[0]} to={range[1]} preferFlats={flats} showNoteNames onNoteOn={onNoteOn} onNoteOff={onNoteOff} height={140} />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {round && phase === "reveal" && (
          <motion.div key="reveal" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">
            <Card className={cn(point ? "border-accent" : step1 || step2 ? "border-secondary" : "")}>
              <CardContent className="flex flex-col gap-4 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <motion.span initial={{ scale: 0.5, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 260, damping: 14 }} className="text-5xl" aria-hidden>
                    {point ? "🌟" : step1 || step2 ? "👍" : "🔍"}
                  </motion.span>
                  <div className="flex flex-col">
                    <div className="font-display text-2xl font-bold">
                      {point ? "Both halves right — 1 point!" : step1 || step2 ? "Half way there!" : "Not this time."}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      The {kindLabel} was <span className="font-bold text-foreground">{round.answerLabel}</span>
                      {round.kind === "chord" && round.inversion ? ` (${round.inversion === 1 ? "1st" : "2nd"} inversion)` : ""}.
                      {" "}Ear: {step1 ? "✅" : "❌"} · Eye: {step2 ? "✅" : "❌"}{chosenStaff && !step2 ? " (that staff was a different one)" : ""}
                    </div>
                  </div>
                  <Button size="lg" variant="accent" onClick={startRound} className="ml-auto"><ArrowRight className="h-6 w-6" /> Next round</Button>
                </div>
                <div className="grid gap-4 md:grid-cols-[240px_1fr] md:items-center">
                  <div className="flex justify-center rounded-2xl bg-card">
                    <MiniStaff midis={round.midis} keySig={scale.vexKey} preferFlats={flats} state="correct" clef={Math.min(...round.midis) >= 60 ? "treble" : "bass"} />
                  </div>
                  <PianoKeyboard from={range[0]} to={range[1]} highlights={revealHighlights} preferFlats={flats} showNoteNames onNoteOn={onNoteOn} onNoteOff={onNoteOff} height={140} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
