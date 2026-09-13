"use client";
import * as React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, Gift, Piano, Music4, Sparkles, CalendarDays } from "lucide-react";
import type { Child, NoteEvent, Triad } from "@/lib/types";
import { useAppStore } from "@/lib/store/app-store";
import { useAudio } from "@/lib/hooks/use-audio";
import { useInput } from "@/lib/hooks/use-input";
import { awardBadge, currentRegionId, currentScale } from "@/lib/engine/progression";
import { buildScale, primaryTriads, scaleName } from "@/lib/music/scales";
import { chordSymbol } from "@/lib/music/chords";
import { midiToPc } from "@/lib/music/notes";
import { dateKey, isWeekend, parseDateKey, weekKey } from "@/lib/utils/date";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils/cn";
import { outfitMeta } from "./outfits";

export type ChallengeTaskId = "technique" | "chords" | "improv";
export const CHALLENGE_TASKS: ChallengeTaskId[] = ["technique", "chords", "improv"];

export interface WeeklyChallengeState { regionId: string; tasks: Record<string, boolean>; claimed: boolean }

/** The challenge record for a given week (or an empty one). */
export function challengeFor(child: Child, wk: string): WeeklyChallengeState {
  return child.weeklyChallenges[wk] ?? { regionId: currentRegionId(child), tasks: { technique: false, chords: false, improv: false }, claimed: false };
}

export function challengeDoneCount(state: WeeklyChallengeState): number {
  return CHALLENGE_TASKS.filter((t) => state.tasks[t]).length;
}

/** Days until the chest opens (0 on a weekend). */
export function daysUntilWeekend(today: string): number {
  if (isWeekend(today)) return 0;
  const dow = parseDateKey(today).getDay(); // Mon=1..Fri=5
  return 6 - dow;
}

/** I–IV–V–I progression the live checker listens for (i–iv–V–i in minors). */
function progressionFor(child: Child): Triad[] {
  const scale = buildScale(currentScale(child));
  const [I, IV, V] = primaryTriads(scale);
  return [I, IV, V, I];
}

function pcSet(midis: number[]): string {
  return Array.from(new Set(midis.map((m) => midiToPc(m)))).sort().join(",");
}

export function WeeklyChallenge({ child, open, onOpenChange }: { child: Child; open: boolean; onOpenChange: (v: boolean) => void }) {
  const updateChild = useAppStore((s) => s.updateChild);
  const pushCelebration = useAppStore((s) => s.pushCelebration);
  const { audio, unlock } = useAudio();
  const [today] = React.useState(() => dateKey());
  const wk = weekKey(today);
  const weekend = isWeekend(today);
  const state = challengeFor(child, wk);
  const scaleLabel = scaleName(currentScale(child));
  const progression = React.useMemo(() => progressionFor(child), [child]);
  const done = challengeDoneCount(state);
  const allDone = done === CHALLENGE_TASKS.length;
  const [claiming, setClaiming] = React.useState(false);

  // ---- live chord check (MIDI only) ----
  const { mode } = useInput({ onNote: (e) => handleNote(e) });
  const held = React.useRef<Set<number>>(new Set());
  const [chordStep, setChordStep] = React.useState(0);
  const chordStepRef = React.useRef(0);
  const listening = open && weekend && mode === "midi" && !state.tasks.chords && !state.claimed;

  function handleNote(e: NoteEvent) {
    if (!listening) return;
    if (e.kind === "off") { held.current.delete(e.midi); return; }
    held.current.add(e.midi);
    const target = progression[chordStepRef.current];
    if (!target) return;
    const heldMidis = Array.from(held.current);
    if (heldMidis.length < 3) return;
    if (pcSet(heldMidis) === pcSet(target.midi)) {
      const next = chordStepRef.current + 1;
      chordStepRef.current = next;
      setChordStep(next);
      audio.stinger("pop");
      held.current.clear();
      if (next >= progression.length) void setTask("chords", true);
    }
  }

  async function setTask(id: ChallengeTaskId, value: boolean) {
    await updateChild(child.id, (c) => {
      const cur = challengeFor(c, wk);
      if (cur.claimed) return c;
      return { ...c, weeklyChallenges: { ...c.weeklyChallenges, [wk]: { ...cur, tasks: { ...cur.tasks, [id]: value } } } };
    });
  }

  async function claim() {
    if (!allDone || state.claimed || claiming) return;
    setClaiming(true);
    try {
      await unlock();
      audio.stinger("levelup");
    } catch { /* audio is optional */ }
    const outfitId = `outfit-chest-${wk}`;
    const regionId = state.regionId;
    await updateChild(child.id, (c) => {
      const cur = challengeFor(c, wk);
      if (cur.claimed) return c;
      let next: Child = awardBadge(c, "weekly-challenge");
      next = {
        ...next,
        mapProgress: next.mapProgress.map((r) => (r.regionId === regionId ? { ...r, chestOpened: true } : r)),
        unlocks: { ...next.unlocks, outfits: next.unlocks.outfits.includes(outfitId) ? next.unlocks.outfits : [...next.unlocks.outfits, outfitId] },
        weeklyChallenges: { ...next.weeklyChallenges, [wk]: { ...cur, claimed: true } },
      };
      return next;
    });
    const outfit = outfitMeta(outfitId);
    pushCelebration({ kind: "badge", title: "Chest opened!", detail: "Chest Opener badge earned", emoji: "💎" });
    pushCelebration({ kind: "unlock", title: `New outfit: ${outfit.name}`, detail: `${child.companion.name} can wear it in the Wardrobe`, emoji: outfit.emoji });
    setClaiming(false);
  }

  const tasks: { id: ChallengeTaskId; title: string; text: string; icon: React.ReactNode }[] = [
    { id: "technique", title: "Technique", text: `Play the ${scaleLabel} scale hands together, slowly.`, icon: <Piano className="h-6 w-6" /> },
    { id: "chords", title: "Chords", text: `Play ${progression.slice(0, 3).map((t) => t.roman).join("–")}–${progression[3].roman} in ${scaleLabel}.`, icon: <Music4 className="h-6 w-6" /> },
    { id: "improv", title: "Improv", text: "Make up a 4-bar tune over the pop groove.", icon: <Sparkles className="h-6 w-6" /> },
  ];

  const daysLeft = daysUntilWeekend(today);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Gift className="h-6 w-6 text-primary" /> Weekly bonus chest</DialogTitle>
          <DialogDescription>Three short tasks for the weekend. It&apos;s a bonus — it never holds you back.</DialogDescription>
        </DialogHeader>

        {!weekend && !state.claimed ? (
          <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl bg-muted p-6 text-center">
            <CalendarDays className="h-10 w-10 text-primary" />
            <p className="font-display text-2xl font-semibold">Opens Saturday</p>
            <p className="text-muted-foreground">{daysLeft === 1 ? "Just 1 more day!" : `${daysLeft} more days to go.`} Keep practising and the chest will be waiting.</p>
            <ul className="mt-2 w-full text-left text-sm text-muted-foreground">
              {tasks.map((t) => <li key={t.id} className="flex items-center gap-2 py-1">{t.icon}<span><b>{t.title}:</b> {t.text}</span></li>)}
            </ul>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {tasks.map((t) => {
              const checked = !!state.tasks[t.id];
              return (
                <div key={t.id} className={cn("flex flex-col gap-2 rounded-2xl border-2 p-3 transition-colors", checked ? "border-accent bg-accent/10" : "border-border bg-card")}>
                  <div className="flex items-center gap-3">
                    <span className={cn("text-primary", checked && "text-accent-foreground")}>{t.icon}</span>
                    <div className="flex-1">
                      <div className="font-display text-lg font-semibold">{t.title}</div>
                      <div className="text-sm text-muted-foreground">{t.text}</div>
                    </div>
                    <Button
                      variant={checked ? "accent" : "outline"}
                      size="sm"
                      className="h-12 min-w-24"
                      disabled={state.claimed}
                      onClick={() => setTask(t.id, !checked)}
                      aria-pressed={checked}
                    >
                      {checked ? <><CheckCircle2 className="h-5 w-5" /> Done!</> : <><Circle className="h-5 w-5" /> Done?</>}
                    </Button>
                  </div>
                  {t.id === "chords" && mode === "midi" && !checked && !state.claimed && (
                    <div className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-sm">
                      <span className="text-muted-foreground">Listening on your keyboard:</span>
                      <div className="flex gap-1">
                        {progression.map((tr, i) => (
                          <span key={i} className={cn("rounded-lg border-2 px-2 py-0.5 font-bold", i < chordStep ? "border-accent bg-accent text-accent-foreground" : i === chordStep ? "border-primary" : "border-border text-muted-foreground")}>
                            {chordSymbol(tr)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            <div className="mt-2 flex flex-col items-center gap-2">
              {state.claimed ? (
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-1 rounded-2xl bg-secondary/40 p-4 text-center">
                  <span className="text-4xl">💎</span>
                  <p className="font-display text-xl font-semibold">Chest opened!</p>
                  <p className="text-sm text-muted-foreground">You earned the Chest Opener badge and a new outfit. See you next weekend!</p>
                </motion.div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">{done} of {CHALLENGE_TASKS.length} done</p>
                  <Button size="lg" className="w-full" disabled={!allDone || claiming} onClick={claim}>
                    <Gift className="h-6 w-6" /> {allDone ? "Open the chest!" : "Finish all three to open"}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
