"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Drum, Ear, Eye, Home, Play, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Companion } from "@/components/map/companion";
import { InputBadge } from "@/components/session/input-badge";
import { SkillRadar } from "@/components/assessment/skill-radar";
import { EchoTest } from "@/components/assessment/echo-test";
import { FlashTest } from "@/components/assessment/flash-test";
import { PulseTest } from "@/components/assessment/pulse-test";
import { useAppStore, useActiveChild } from "@/lib/store/app-store";
import { useAudio } from "@/lib/hooks/use-audio";
import { getInput } from "@/lib/input/manager";
import { deriveWeights, weightsToPercent } from "@/lib/engine/weights";
import { BLOCK_LABELS, BLOCK_ORDER, type InputMode, type SkillProfile } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

type TestId = "echo" | "flash" | "pulse";
const TESTS: { id: TestId; title: string; skill: string; emoji: string; icon: React.ComponentType<{ className?: string }>; intro: string }[] = [
  { id: "echo", title: "Echo", skill: "Ear", emoji: "👂", icon: Ear, intro: "Listen to a few notes, then play them back or tell us about them. 6 quick rounds." },
  { id: "flash", title: "Flash", skill: "Eyes", emoji: "👀", icon: Eye, intro: "A note pops up on the staff — find it on the keys as fast as you can. 10 notes." },
  { id: "pulse", title: "Pulse", skill: "Pulse", emoji: "🥁", icon: Drum, intro: "Tap along with a click, then tap three short rhythms you can see." },
];

type Phase =
  | { kind: "start" }
  | { kind: "intro"; index: number }
  | { kind: "test"; index: number }
  | { kind: "reveal"; profile: SkillProfile; previous: SkillProfile | null };

const TEST_COMPONENTS: Record<TestId, React.ComponentType<{ inputMode: InputMode; onDone: (score: number, details: Record<string, unknown>) => void }>> = {
  echo: EchoTest,
  flash: FlashTest,
  pulse: PulseTest,
};

function skillCopy(profile: SkillProfile): string {
  const entries: [string, number][] = [["ear", profile.ear], ["eye", profile.eye], ["pulse", profile.pulse]];
  entries.sort((a, b) => b[1] - a[1]);
  const [top] = entries;
  const label = top[0] === "ear" ? "listening ears" : top[0] === "eye" ? "sharp eyes" : "steady pulse";
  return `Your superpower right now: ${label}!`;
}

function changeCopy(profile: SkillProfile, previous: SkillProfile): string {
  const diffs: [string, number][] = [["Ear", profile.ear - previous.ear], ["Eye", profile.eye - previous.eye], ["Pulse", profile.pulse - previous.pulse]];
  const grew = diffs.filter(([, d]) => d >= 5).map(([k]) => k);
  if (grew.length) return `Look how ${grew.join(" and ")} grew since last time! 🎉`;
  return "Your profile is settling in — every practice counts.";
}

/**
 * Skill assessment wizard (§3): Echo → Flash → Pulse, then the Skill Profile reveal. Saves via saveAssessment.
 * Full-screen, no AppShell. Input is auto-detected on the first tap so the tests can use MIDI/mic when available.
 */
export default function AssessmentPage() {
  const router = useRouter();
  const child = useActiveChild();
  const saveAssessment = useAppStore((s) => s.saveAssessment);
  const { unlock } = useAudio();
  const [phase, setPhase] = React.useState<Phase>({ kind: "start" });
  const [inputMode, setInputMode] = React.useState<InputMode>("timer");
  const [inputLabel, setInputLabel] = React.useState("Tap pad");
  const [detecting, setDetecting] = React.useState(false);
  const [scores, setScores] = React.useState<Partial<Record<TestId, number>>>({});
  const details = React.useRef<Record<string, unknown>>({});
  const saving = React.useRef(false);

  React.useEffect(() => { if (!child) router.replace("/onboarding"); }, [child, router]);
  // Release the microphone / MIDI when leaving the page.
  React.useEffect(() => () => { getInput().stop(); }, []);

  const begin = async () => {
    if (!child) return;
    setDetecting(true);
    try { await unlock(); } catch { /* keep going without sound */ }
    const input = getInput();
    const mode = await input.autoDetect(child.settings.inputModePreference, child.settings.micCalibration);
    setInputMode(mode);
    setInputLabel(input.label);
    setDetecting(false);
    setPhase({ kind: "intro", index: 0 });
  };

  const handleTestDone = async (index: number, score: number, d: Record<string, unknown>) => {
    if (!child) return;
    const id = TESTS[index].id;
    const clamped = Math.max(0, Math.min(100, Math.round(score)));
    const nextScores = { ...scores, [id]: clamped };
    details.current[id] = d;
    setScores(nextScores);
    if (index + 1 < TESTS.length) { setPhase({ kind: "intro", index: index + 1 }); return; }
    if (saving.current) return;
    saving.current = true;
    const previous = child.skillProfile;
    const profile = await saveAssessment(child.id, {
      echo: nextScores.echo ?? 0,
      flash: nextScores.flash ?? 0,
      pulse: nextScores.pulse ?? 0,
      details: { ...details.current, inputMode },
    });
    getInput().stop();
    setPhase({ kind: "reveal", profile, previous });
  };

  const quit = () => { getInput().stop(); router.push("/"); };

  if (!child) return null;

  const focus = phase.kind === "reveal" ? (() => {
    const pct = weightsToPercent(deriveWeights(phase.profile));
    return [...BLOCK_ORDER].sort((a, b) => pct[b] - pct[a]).slice(0, 2).map((b) => ({ type: b, pct: pct[b] }));
  })() : [];

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-4">
      <header className="mb-2 flex items-center gap-3 text-sm text-muted-foreground">
        <span className="font-display text-lg text-foreground">🎹 Skill check</span>
        {phase.kind !== "start" && <InputBadge mode={inputMode} label={inputLabel} />}
        <div className="ml-auto">
          {phase.kind !== "reveal" && <Button variant="ghost" size="sm" onClick={quit}><X className="h-4 w-4" /> {phase.kind === "start" ? "Not now" : "Stop"}</Button>}
        </div>
      </header>

      {/* Progress dots: one per test. */}
      <ol className="mb-4 flex justify-center gap-3" aria-label="progress">
        {TESTS.map((t, i) => {
          const done = scores[t.id] !== undefined || phase.kind === "reveal";
          const active = (phase.kind === "intro" || phase.kind === "test") && phase.index === i;
          return (
            <li key={t.id} className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
              <span className={cn("flex h-7 w-7 items-center justify-center rounded-full border-2 text-sm transition-colors", done ? "border-accent bg-accent/30" : active ? "border-primary bg-primary/10" : "bg-muted")} aria-hidden>{done ? "✓" : t.emoji}</span>
              <span className={cn(active && "text-foreground")}>{t.title}</span>
            </li>
          );
        })}
      </ol>

      <AnimatePresence mode="wait">
        {phase.kind === "start" && (
          <motion.div key="start" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-1 items-center justify-center">
            <div className="flex w-full max-w-xl flex-col items-center gap-5 rounded-3xl border-2 bg-card p-6 text-center">
              <Companion state={child.companion} mood="wave" size={120} />
              <h1 className="font-display text-3xl">Let&apos;s find your superpowers, {child.name}!</h1>
              <p className="text-muted-foreground">Three tiny games — about 5 minutes. There are no wrong answers; we&apos;re just listening to how you play today.</p>
              <ul className="grid w-full grid-cols-3 gap-2 text-sm">
                {TESTS.map((t) => (
                  <li key={t.id} className="rounded-2xl bg-muted p-3"><div className="text-2xl" aria-hidden>{t.emoji}</div><div className="font-bold">{t.title}</div><div className="text-muted-foreground">{t.skill}</div></li>
                ))}
              </ul>
              {child.skillProfile && <p className="text-xs text-muted-foreground">You&apos;ve done this before — let&apos;s see how you&apos;ve grown.</p>}
              <Button size="xl" onClick={begin} disabled={detecting}>{detecting ? "Listening for your piano…" : "Let's go!"} <ArrowRight className="h-6 w-6" /></Button>
            </div>
          </motion.div>
        )}

        {phase.kind === "intro" && (
          <motion.div key={`intro-${phase.index}`} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="flex flex-1 items-center justify-center">
            <div className="flex w-full max-w-lg flex-col items-center gap-4 rounded-3xl border-2 bg-card p-6 text-center">
              <div className="text-6xl" aria-hidden>{TESTS[phase.index].emoji}</div>
              <p className="text-sm font-bold text-muted-foreground">Game {phase.index + 1} of {TESTS.length}</p>
              <h2 className="font-display text-3xl">{TESTS[phase.index].title}</h2>
              <p className="text-muted-foreground">{TESTS[phase.index].intro}</p>
              <Button size="xl" onClick={() => setPhase({ kind: "test", index: phase.index })}><Play className="h-6 w-6" /> Ready!</Button>
            </div>
          </motion.div>
        )}

        {phase.kind === "test" && (
          <motion.div key={`test-${phase.index}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 rounded-3xl border-2 bg-card p-4 sm:p-6">
            {(() => {
              const Test = TEST_COMPONENTS[TESTS[phase.index].id];
              return <Test inputMode={inputMode} onDone={(score, d) => handleTestDone(phase.index, score, d)} />;
            })()}
          </motion.div>
        )}

        {phase.kind === "reveal" && (
          <motion.div key="reveal" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-1 items-center justify-center">
            <div className="flex w-full max-w-2xl flex-col items-center gap-5 rounded-3xl border-2 bg-card p-6 text-center">
              <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18 }} className="flex items-center gap-3">
                <Companion state={child.companion} mood="cheer" size={84} />
                <h1 className="font-display text-3xl sm:text-4xl">Here&apos;s your Skill Profile!</h1>
              </motion.div>
              <SkillRadar profile={phase.profile} previous={phase.previous} size={260} animate />
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }} className="text-lg font-bold">{skillCopy(phase.profile)}</motion.p>
              {phase.previous && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }} className="text-sm text-muted-foreground">
                  {changeCopy(phase.profile, phase.previous)} <span className="opacity-70">(dashed line = last time)</span>
                </motion.p>
              )}
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5 }} className="w-full rounded-2xl bg-muted/60 p-4 text-left">
                <p className="mb-2 flex items-center gap-1 text-sm font-bold text-muted-foreground"><Sparkles className="h-4 w-4" /> Your sessions will give extra time to:</p>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {focus.map((f) => (
                    <li key={f.type} className="flex items-center justify-between rounded-xl border-2 bg-card px-3 py-2"><span className="font-bold">{BLOCK_LABELS[f.type]}</span><span className="font-display text-lg">{f.pct}%</span></li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-muted-foreground">You can retake the skill check any time from Today — we check in again every 4 weeks.</p>
              </motion.div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.7 }} className="flex flex-wrap justify-center gap-2">
                <Button size="xl" onClick={() => router.push("/session")}><Play className="h-6 w-6" /> Start practising</Button>
                <Button variant="outline" size="lg" onClick={() => router.push("/")}><Home className="h-5 w-5" /> Home</Button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
