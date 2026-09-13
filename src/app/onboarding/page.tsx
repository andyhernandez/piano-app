"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Mic, Piano, Shuffle, Sparkles, Timer, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Companion } from "@/components/map/companion";
import { MicCalibration, type MicCalibrationResult } from "@/components/assessment/mic-calibration";
import { probeMidiName } from "@/components/assessment/input-probe";
import { useAppStore } from "@/lib/store/app-store";
import { useAudio } from "@/lib/hooks/use-audio";
import type { Child, CompanionState, InputMode } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

type Step = "welcome" | "grownup" | "profile" | "practice" | "assessment";
const STEPS: Step[] = ["welcome", "grownup", "profile", "practice", "assessment"];

const AVATARS = ["🦊", "🐼", "🦄", "🐸", "🐯", "🦖", "🐙", "🦋", "🐨", "🦁", "🐧", "🌟"];

const SPECIES: { id: CompanionState["species"]; label: string; blurb: string }[] = [
  { id: "note-sprite", label: "Note Sprite", blurb: "Tiny, quick and full of sparkle." },
  { id: "metronome-mouse", label: "Metronome Mouse", blurb: "Never misses a beat." },
  { id: "clef-cat", label: "Clef Cat", blurb: "Cool, curious and a great reader." },
  { id: "drum-dragon", label: "Drum Dragon", blurb: "Big heart, bigger rhythm." },
];

const COMPANION_NAMES = ["Pip", "Tempo", "Melody", "Bongo", "Fifi", "Allegro", "Dot", "Jazz", "Coda", "Trill", "Ziggy", "Nova", "Bebop", "Twinkle", "Rondo", "Sol"];

function pinValid(pin: string) { return /^\d{4}$/.test(pin); }

/**
 * First-launch wizard (no AppShell). Welcome → optional grown-up PIN → child profile + companion → input mode & schedule →
 * take the skill check or skip. Also used to add a sibling (the grown-up step is skipped when a parent already exists).
 */
export default function OnboardingPage() {
  const router = useRouter();
  const { unlock } = useAudio();
  const parent = useAppStore((s) => s.parent);
  const existingChildren = useAppStore((s) => s.children);
  const createParent = useAppStore((s) => s.createParent);
  const createChild = useAppStore((s) => s.createChild);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const [step, setStep] = React.useState<Step>("welcome");
  const [dir, setDir] = React.useState<1 | -1>(1);
  const [busy, setBusy] = React.useState(false);

  // Grown-up
  const [pin, setPin] = React.useState("");
  const [pin2, setPin2] = React.useState("");

  // Profile
  const [name, setName] = React.useState("");
  const [avatar, setAvatar] = React.useState(AVATARS[0]);
  const [species, setSpecies] = React.useState<CompanionState["species"]>("note-sprite");
  const [companionName, setCompanionName] = React.useState("Pip");
  const [child, setChild] = React.useState<Child | null>(null);

  // Practice
  const [inputPref, setInputPref] = React.useState<InputMode | null>(null);
  const [midi, setMidi] = React.useState<{ found: boolean; name: string | null } | null>(null);
  const [calibrating, setCalibrating] = React.useState(false);
  const [micCal, setMicCal] = React.useState<MicCalibrationResult | null>(null);
  const [minutes, setMinutes] = React.useState(20);
  const [days, setDays] = React.useState(5);

  const addingSibling = existingChildren.length > 0;
  const hasParent = !!parent;

  const go = (next: Step, direction: 1 | -1 = 1) => { setDir(direction); setStep(next); };

  const startSetup = async () => {
    setBusy(true);
    try { await unlock(); } catch { /* audio can be unlocked later inside a session */ }
    setBusy(false);
    go(hasParent ? "profile" : "grownup");
  };

  const finishGrownup = async (withPin: boolean) => {
    if (hasParent) { go("profile"); return; }
    setBusy(true);
    await createParent(withPin && pinValid(pin) ? pin : null);
    setBusy(false);
    go("profile");
  };

  const finishProfile = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    const created = await createChild({ name: trimmed, avatar, companion: { species, name: companionName.trim() || "Pip", level: 1, outfit: "default" } });
    setChild(created);
    setBusy(false);
    go("practice");
  };

  // Probe for a MIDI device once we reach the practice step.
  React.useEffect(() => {
    if (step !== "practice") return;
    let cancelled = false;
    probeMidiName().then((r) => { if (!cancelled) setMidi(r); });
    return () => { cancelled = true; };
  }, [step]);

  const chooseInput = (mode: InputMode) => {
    setInputPref(mode);
    if (mode === "mic" && !micCal) setCalibrating(true);
    else setCalibrating(false);
  };

  const finishPractice = async () => {
    if (!child || !inputPref) return;
    setBusy(true);
    await updateSettings(child.id, {
      inputModePreference: inputPref,
      micCalibration: inputPref === "mic" ? micCal : child.settings.micCalibration,
      sessionMinutes: minutes,
      practiceDaysPerWeek: days,
    });
    setBusy(false);
    go("assessment");
  };

  const surpriseName = () => {
    const pool = COMPANION_NAMES.filter((n) => n !== companionName);
    setCompanionName(pool[Math.floor(Math.random() * pool.length)]);
  };

  const stepIndex = STEPS.indexOf(step);
  const visibleSteps = hasParent ? STEPS.filter((s) => s !== "grownup") : STEPS;
  const previewCompanion: CompanionState = { species, name: companionName || "Pip", level: 1, outfit: "default" };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-4">
      <header className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="font-display text-lg text-foreground">🎹 KeyCadence</span>
        {addingSibling && (
          <>
            <span className="flex items-center gap-1 rounded-full bg-muted px-3 py-0.5 text-xs font-bold"><UserPlus className="h-3.5 w-3.5" /> Add another child</span>
            <Button variant="ghost" size="sm" asChild className="ml-auto"><Link href="/"><ArrowLeft className="h-4 w-4" /> Back</Link></Button>
          </>
        )}
      </header>

      <ol className="my-4 flex justify-center gap-2" aria-label="setup steps">
        {visibleSteps.map((s) => (
          <li key={s} className={cn("h-2.5 rounded-full transition-all", s === step ? "w-8 bg-primary" : STEPS.indexOf(s) < stepIndex ? "w-2.5 bg-accent" : "w-2.5 bg-muted")} />
        ))}
      </ol>

      <div className="relative flex flex-1 items-start justify-center">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.section
            key={step}
            custom={dir}
            initial={{ opacity: 0, x: dir * 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -60 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="w-full rounded-3xl border-2 bg-card p-6 shadow-sm"
          >
            {step === "welcome" && (
              <div className="flex flex-col items-center gap-5 text-center">
                <motion.div animate={{ rotate: [0, -6, 6, 0] }} transition={{ repeat: Infinity, duration: 3, repeatDelay: 1 }} className="text-7xl" aria-hidden>🎹</motion.div>
                <h1 className="font-display text-4xl leading-tight">Welcome to KeyCadence!</h1>
                <p className="max-w-md text-lg">Your piano is the controller — every practice is a short adventure with a buddy who cheers you on.</p>
                <div className="w-full max-w-md rounded-2xl border-2 border-dashed bg-muted/50 p-4 text-left text-sm text-muted-foreground">
                  <b className="text-foreground">For grown-ups:</b> sessions are short (20 minutes by default), hard-stopped, and adapt to your child&apos;s strengths. Everything stays on this device — no ads, no chat, no accounts for kids.
                </div>
                <Button size="xl" onClick={startSetup} disabled={busy}>Let&apos;s set up <ArrowRight className="h-6 w-6" /></Button>
              </div>
            )}

            {step === "grownup" && (
              <div className="flex flex-col gap-5">
                <div>
                  <h2 className="font-display text-3xl">Grown-up PIN</h2>
                  <p className="text-muted-foreground">Optional. A 4-digit PIN keeps the Grown-ups area (settings, reports) away from little fingers.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="pin">Choose a PIN</Label>
                    <Input id="pin" type="password" inputMode="numeric" autoComplete="off" pattern="\d*" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="••••" className="text-center text-2xl tracking-[0.5em]" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="pin2">Type it again</Label>
                    <Input id="pin2" type="password" inputMode="numeric" autoComplete="off" pattern="\d*" maxLength={4} value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="••••" className="text-center text-2xl tracking-[0.5em]" />
                  </div>
                </div>
                <p className="min-h-5 text-sm text-muted-foreground">
                  {pin.length === 4 && pin2.length === 4 && pin !== pin2 && "Those don't match yet — try again."}
                  {pinValid(pin) && pin === pin2 && <span className="flex items-center gap-1 text-accent-foreground"><Check className="h-4 w-4" /> PINs match</span>}
                </p>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="ghost" onClick={() => finishGrownup(false)} disabled={busy}>Skip for now</Button>
                  <Button size="lg" onClick={() => finishGrownup(true)} disabled={busy || !pinValid(pin) || pin !== pin2}>Save PIN <ArrowRight className="h-5 w-5" /></Button>
                </div>
              </div>
            )}

            {step === "profile" && (
              <div className="flex flex-col gap-6">
                <div>
                  <h2 className="font-display text-3xl">Who&apos;s practising?</h2>
                  <p className="text-muted-foreground">Pick a name, a picture and a practice buddy.</p>
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="name">Your name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value.slice(0, 24))} placeholder="e.g. Maya" autoComplete="off" className="text-lg" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Your picture</Label>
                  <div className="grid grid-cols-6 gap-2">
                    {AVATARS.map((a) => (
                      <button key={a} type="button" onClick={() => setAvatar(a)} aria-label={`avatar ${a}`} aria-pressed={avatar === a}
                        className={cn("flex h-14 items-center justify-center rounded-2xl border-2 text-3xl transition-transform active:scale-95", avatar === a ? "border-primary bg-primary/10 scale-105" : "bg-card")}>{a}</button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Your practice buddy</Label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {SPECIES.map((s) => (
                      <button key={s.id} type="button" onClick={() => setSpecies(s.id)} aria-pressed={species === s.id}
                        className={cn("flex flex-col items-center gap-1 rounded-2xl border-2 p-3 text-center transition-transform active:scale-95", species === s.id ? "border-primary bg-primary/10" : "bg-card")}>
                        <Companion state={{ species: s.id, name: s.label, level: 1, outfit: "default" }} mood={species === s.id ? "wave" : "idle"} size={72} />
                        <span className="font-display text-base leading-tight">{s.label}</span>
                        <span className="text-xs text-muted-foreground">{s.blurb}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="cname">Buddy&apos;s name</Label>
                  <div className="flex gap-2">
                    <Input id="cname" value={companionName} onChange={(e) => setCompanionName(e.target.value.slice(0, 20))} autoComplete="off" className="text-lg" />
                    <Button type="button" variant="secondary" onClick={surpriseName} aria-label="Surprise me with a name"><Shuffle className="h-5 w-5" /> Surprise me</Button>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-muted/60 p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl" aria-hidden>{avatar}</span>
                    <Companion state={previewCompanion} mood="cheer" size={56} />
                  </div>
                  <p className="text-sm text-muted-foreground"><b className="text-foreground">{name.trim() || "You"}</b> and <b className="text-foreground">{companionName.trim() || "Pip"}</b> — ready to play!</p>
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                  {!hasParent ? <Button variant="ghost" onClick={() => go("grownup", -1)}><ArrowLeft className="h-4 w-4" /> Back</Button> : <span />}
                  <Button size="lg" onClick={finishProfile} disabled={busy || !name.trim()}>Next <ArrowRight className="h-5 w-5" /></Button>
                </div>
              </div>
            )}

            {step === "practice" && (
              <div className="flex flex-col gap-6">
                <div>
                  <h2 className="font-display text-3xl">How do you practise?</h2>
                  <p className="text-muted-foreground">KeyCadence listens to your piano when it can. You can change this any time in Settings.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <InputOption active={inputPref === "midi"} onClick={() => chooseInput("midi")} icon={<Piano className="h-8 w-8" />} title="MIDI keyboard" desc="Plugged in with a USB cable." status={midi === null ? "Looking for a keyboard…" : midi.found ? `Found: ${midi.name}` : "No keyboard found yet — that's okay."} statusGood={!!midi?.found} />
                  <InputOption active={inputPref === "mic"} onClick={() => chooseInput("mic")} icon={<Mic className="h-8 w-8" />} title="Acoustic piano" desc="We listen with the microphone." status={micCal ? "Microphone ready" : "Needs a quick sound check."} statusGood={!!micCal} />
                  <InputOption active={inputPref === "timer"} onClick={() => chooseInput("timer")} icon={<Timer className="h-8 w-8" />} title="Just a timer" desc="No listening. Tap the screen to play along." />
                </div>

                {inputPref === "mic" && calibrating && (
                  <MicCalibration
                    onDone={(cal) => { setMicCal(cal); setCalibrating(false); }}
                    onCancel={() => { setCalibrating(false); setInputPref("timer"); }}
                  />
                )}

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="flex flex-col gap-2 rounded-2xl border-2 p-4">
                    <div className="flex items-baseline justify-between"><Label>Session length</Label><span className="font-display text-2xl">{minutes} min</span></div>
                    <Slider min={15} max={60} step={5} value={[minutes]} onValueChange={(v) => setMinutes(v[0] ?? 20)} aria-label="Session length in minutes" />
                    <p className="text-xs text-muted-foreground">Sessions stop on time, every time. 20 minutes is great for most kids.</p>
                  </div>
                  <div className="flex flex-col gap-2 rounded-2xl border-2 p-4">
                    <div className="flex items-baseline justify-between"><Label>Practice days a week</Label><span className="font-display text-2xl">{days}</span></div>
                    <div className="grid grid-cols-5 gap-2">
                      {[3, 4, 5, 6, 7].map((d) => (
                        <Button key={d} type="button" variant={days === d ? "default" : "outline"} onClick={() => setDays(d)} aria-pressed={days === d}>{d}</Button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">Hit your goal to earn a Key for the adventure map.</p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button size="lg" onClick={finishPractice} disabled={busy || !inputPref || (inputPref === "mic" && calibrating)}>Next <ArrowRight className="h-5 w-5" /></Button>
                </div>
              </div>
            )}

            {step === "assessment" && (
              <div className="flex flex-col items-center gap-5 text-center">
                <Companion state={child?.companion ?? previewCompanion} mood="cheer" size={110} />
                <h2 className="font-display text-3xl">One more thing, {child?.name ?? name}!</h2>
                <p className="max-w-md text-muted-foreground">
                  A 5-minute skill check finds your superpowers — ear, eyes and pulse — so every session gives extra time to what needs the most love. No wrong answers, and you can retake it any time.
                </p>
                <Button size="xl" onClick={() => router.push("/onboarding/assessment")}><Sparkles className="h-6 w-6" /> Take the 5-minute skill check</Button>
                <Button variant="ghost" onClick={() => router.push("/")}>Skip for now</Button>
              </div>
            )}
          </motion.section>
        </AnimatePresence>
      </div>
    </div>
  );
}

function InputOption({ active, onClick, icon, title, desc, status, statusGood }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string; status?: string; statusGood?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={cn("flex min-h-36 flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition-transform active:scale-[0.98]", active ? "border-primary bg-primary/10" : "bg-card")}>
      <span className={cn("rounded-xl p-2", active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{icon}</span>
      <span className="font-display text-lg leading-tight">{title}</span>
      <span className="text-sm text-muted-foreground">{desc}</span>
      {status && <span className={cn("mt-auto text-xs font-bold", statusGood ? "text-accent-foreground" : "text-muted-foreground")}>{statusGood && <Check className="mr-1 inline h-3.5 w-3.5" />}{status}</span>}
    </button>
  );
}
