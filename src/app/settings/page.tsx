"use client";
import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Keyboard, Mic, Moon, Sparkles, Sun, Timer, Users, Volume2, Wand2 } from "lucide-react";
import { AppShell } from "@/components/shared/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useActiveChild, useAppStore } from "@/lib/store/app-store";
import { useAudio } from "@/lib/hooks/use-audio";
import { getInput } from "@/lib/input/manager";
import { cn } from "@/lib/utils/cn";
import { dateKey, daysBetween } from "@/lib/utils/date";
import type { InputMode } from "@/lib/types";
import { APP_VERSION } from "@/components/parent/helpers";

const THEME_KEY = "kc.theme";
const VOLUME_KEY = "kc.volume";

function readLocal(key: string): string | null {
  try { return typeof window === "undefined" ? null : localStorage.getItem(key); } catch { return null; }
}
function writeLocal(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* private mode */ }
}

/** Kid-visible settings (no PIN): who's playing, companion name, input, sound, look, and the door to grown-ups. */
export default function SettingsPage() {
  const children = useAppStore((s) => s.children);
  const child = useActiveChild();
  const setActiveChild = useAppStore((s) => s.setActiveChild);
  const updateChild = useAppStore((s) => s.updateChild);
  const setInputMode = useAppStore((s) => s.setInputMode);
  const { audio, unlock } = useAudio();

  const [companionName, setCompanionName] = React.useState(child?.companion.name ?? "");
  const [inputLabel, setInputLabel] = React.useState(() => getInput().label);
  const [inputBusy, setInputBusy] = React.useState(false);
  const [inputNote, setInputNote] = React.useState<string | null>(null);
  const [volume, setVolume] = React.useState(() => { const v = Number(readLocal(VOLUME_KEY)); return Number.isFinite(v) && v > 0 ? Math.min(1, v) : 0.8; });
  const [dark, setDark] = React.useState(() => readLocal(THEME_KEY) === "dark");
  const [today] = React.useState(() => dateKey());
  const [pop, setPop] = React.useState(0);

  React.useEffect(() => getInput().onChange(() => setInputLabel(getInput().label)), []);
  React.useEffect(() => { audio.setVolume(volume); writeLocal(VOLUME_KEY, String(volume)); }, [audio, volume]);
  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    writeLocal(THEME_KEY, dark ? "dark" : "light");
  }, [dark]);

  const chooseInput = async (mode: InputMode | "auto") => {
    if (!child) return;
    setInputBusy(true);
    setInputNote(null);
    const input = getInput();
    const got = mode === "auto" ? await input.autoDetect("auto", child.settings.micCalibration) : (await input.use(mode, child.settings.micCalibration), input.mode);
    setInputMode(got);
    setInputLabel(input.label);
    if (mode === "midi" && got !== "midi") setInputNote("No MIDI keyboard found. Plug one in with USB and try again — the on-screen keyboard works meanwhile.");
    else if (mode === "mic" && got !== "mic") setInputNote("The microphone isn't ready. A grown-up can allow it and calibrate it in the Grown-ups area.");
    else if (mode === "mic" && !child.settings.micCalibration) setInputNote("Microphone is on, but not calibrated yet — ask a grown-up to calibrate it so quiet notes count.");
    setInputBusy(false);
  };

  const testSound = async () => {
    await unlock();
    audio.stinger("success");
    setPop((p) => p + 1);
  };

  const assessedDays = child?.skillProfile ? daysBetween(dateKey(new Date(child.skillProfile.assessedAt)), today) : null;

  return (
    <AppShell title="Settings">
      <div className="flex flex-col gap-5">
        <h1 className="font-display text-3xl font-semibold">Settings</h1>

        <Card>
          <CardHeader>
            <CardTitle>Who&apos;s playing?</CardTitle>
            <CardDescription>Tap your name to switch.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {children.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => { void setActiveChild(c.id); setCompanionName(c.companion.name); }}
                aria-pressed={child?.id === c.id}
                className={cn("flex h-16 items-center gap-3 rounded-3xl border-2 px-5 text-lg font-bold transition-colors", child?.id === c.id ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted")}
              >
                <span aria-hidden className="text-3xl">{c.avatar}</span> {c.name}
              </button>
            ))}
            {!children.length && <Button asChild size="lg"><Link href="/onboarding">Make a profile</Link></Button>}
          </CardContent>
        </Card>

        {child && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Wand2 className="h-5 w-5" /> Your companion&apos;s name</CardTitle>
              <CardDescription>Your {child.companion.species.replace("-", " ")} is level {child.companion.level}.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Input value={companionName} onChange={(e) => setCompanionName(e.target.value)} maxLength={20} className="h-14 max-w-xs text-lg" aria-label="Companion name" />
              <Button size="lg" className="h-14" disabled={!companionName.trim() || companionName.trim() === child.companion.name} onClick={() => updateChild(child.id, (c) => ({ ...c, companion: { ...c.companion, name: companionName.trim() } }))}>
                Save name
              </Button>
            </CardContent>
          </Card>
        )}

        {child && (
          <Card>
            <CardHeader>
              <CardTitle>How are you playing today?</CardTitle>
              <CardDescription>Right now: <b>{inputLabel}</b>. This is just for today; a grown-up sets the usual choice.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <InputChoice icon={Sparkles} label="Auto" hint="Let the app pick" onClick={() => chooseInput("auto")} disabled={inputBusy} />
                <InputChoice icon={Keyboard} label="MIDI keyboard" hint="Plugged in with USB" onClick={() => chooseInput("midi")} disabled={inputBusy} />
                <InputChoice icon={Mic} label="Microphone" hint="Real piano" onClick={() => chooseInput("mic")} disabled={inputBusy} />
                <InputChoice icon={Timer} label="Just the timer" hint="On-screen keys" onClick={() => chooseInput("timer")} disabled={inputBusy} />
              </div>
              {inputNote && <p className="rounded-2xl bg-muted px-4 py-3 text-sm">{inputNote}</p>}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Volume2 className="h-5 w-5" /> Sound</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-4">
              <Label className="w-20 text-base">Volume</Label>
              <Slider aria-label="Volume" min={0} max={100} step={5} value={[Math.round(volume * 100)]} onValueChange={([v]) => setVolume(v / 100)} />
              <span className="w-12 text-right font-bold tabular-nums">{Math.round(volume * 100)}%</span>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="secondary" size="lg" onClick={testSound}>Test sound</Button>
              <motion.span key={pop} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: pop ? 1 : 0 }} className="text-2xl" aria-hidden>🎵</motion.span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">{dark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />} Look</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <Label htmlFor="dark-toggle" className="text-base">Dark mode</Label>
            <Switch id="dark-toggle" checked={dark} onCheckedChange={setDark} className="h-9 w-16 [&>span]:h-8 [&>span]:w-8 data-[state=checked]:[&>span]:translate-x-7" />
          </CardContent>
        </Card>

        {child && (
          <Card>
            <CardHeader>
              <CardTitle>Skill check</CardTitle>
              <CardDescription>
                {assessedDays === null ? "You haven't done the skill check yet." : assessedDays === 0 ? "Last checked today." : `Last checked ${assessedDays} day${assessedDays === 1 ? "" : "s"} ago.`} Redo it any time to update your Ear / Eye / Pulse profile — changes are celebrated, never judged.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="lg" asChild><Link href="/onboarding/assessment">{assessedDays === null ? "Do the skill check" : "Retake the skill check"}</Link></Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Grown-ups</CardTitle>
            <CardDescription>Session history, practice settings, teachers and cloud sync live behind the grown-up lock.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button size="lg" asChild><Link href="/parent">Open the Grown-ups area</Link></Button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          KeyCadence v{APP_VERSION} · Data stays on this device unless a grown-up turns on cloud sync.
        </p>
      </div>
    </AppShell>
  );
}

function InputChoice({ icon: Icon, label, hint, onClick, disabled }: { icon: React.ComponentType<{ className?: string }>; label: string; hint: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-3xl border-2 bg-card p-3 text-center font-bold transition-colors hover:bg-muted active:scale-95 disabled:opacity-50">
      <Icon className="h-8 w-8" />
      <span>{label}</span>
      <span className="text-xs font-semibold text-muted-foreground">{hint}</span>
    </button>
  );
}
