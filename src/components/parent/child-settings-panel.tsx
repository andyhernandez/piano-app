"use client";
import * as React from "react";
import { ExternalLink, Mic, Snowflake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useAppStore } from "@/lib/store/app-store";
import { deriveWeights } from "@/lib/engine/weights";
import { grantFreeze, MAX_FREEZES } from "@/lib/engine/streak";
import type { Child, InputMode } from "@/lib/types";
import { WeightsEditor } from "./weights-editor";
import { MicRecalibrate } from "./mic-recalibrate";

/** Per-child settings for parents (§7): length, days, weights, freeze grant, quiet hours, input, levels. */
export function ChildSettingsPanel({ child }: { child: Child }) {
  const updateSettings = useAppStore((s) => s.updateSettings);
  const updateChild = useAppStore((s) => s.updateChild);
  const s = child.settings;
  const [calOpen, setCalOpen] = React.useState(false);
  const derived = React.useMemo(() => deriveWeights(child.skillProfile), [child.skillProfile]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Session shape</CardTitle>
          <CardDescription>Changes apply from the next session.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <SettingSlider label="Session length" value={s.sessionMinutes} min={15} max={60} step={5} unit="min" onCommit={(v) => updateSettings(child.id, { sessionMinutes: v })} />
          <SettingSlider label="Practice days per week" value={s.practiceDaysPerWeek} min={3} max={7} step={1} unit="days" hint="A Key is earned when this many days are practised in one week." onCommit={(v) => updateSettings(child.id, { practiceDaysPerWeek: v })} />
          <div>
            <Label>Block weights</Label>
            <p className="mb-2 text-xs text-muted-foreground">Share of each session per block. By default they follow {child.name}&apos;s skill profile (weak skills get more time).</p>
            <WeightsEditor value={s.weightsOverride} derived={derived} onChange={(v) => updateSettings(child.id, { weightsOverride: v })} />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Streak freezes</CardTitle>
            <CardDescription>A freeze covers one missed day automatically so the streak (and companion) stay happy. Kids earn one per 5-day streak; you can grant one too.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-lg font-bold">
              {Array.from({ length: MAX_FREEZES }, (_, i) => (
                <Snowflake key={i} className={i < child.streak.freezes ? "h-7 w-7 text-primary" : "h-7 w-7 text-muted-foreground/40"} aria-hidden />
              ))}
              <span>{child.streak.freezes} / {MAX_FREEZES}</span>
            </div>
            <Button variant="secondary" disabled={child.streak.freezes >= MAX_FREEZES} onClick={() => updateChild(child.id, (c) => ({ ...c, streak: grantFreeze(c.streak) }))}>
              <Snowflake className="h-5 w-5" /> Grant a freeze
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quiet hours</CardTitle>
            <CardDescription>When set, the Today screen suggests waiting instead of starting a session in this window.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="quiet-toggle">Use quiet hours</Label>
              <Switch id="quiet-toggle" checked={!!s.quietHours} onCheckedChange={(on) => updateSettings(child.id, { quietHours: on ? { start: "19:30", end: "07:00" } : null })} />
            </div>
            {s.quietHours && (
              <div className="grid grid-cols-2 gap-3">
                <div><Label htmlFor="quiet-start">From</Label><Input id="quiet-start" type="time" value={s.quietHours.start} onChange={(e) => updateSettings(child.id, { quietHours: { start: e.target.value, end: s.quietHours!.end } })} /></div>
                <div><Label htmlFor="quiet-end">Until</Label><Input id="quiet-end" type="time" value={s.quietHours.end} onChange={(e) => updateSettings(child.id, { quietHours: { start: s.quietHours!.start, end: e.target.value } })} /></div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Input</CardTitle>
            <CardDescription>Auto picks a MIDI keyboard when plugged in, then a calibrated microphone, otherwise the timer with the on-screen keyboard.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div>
              <Label htmlFor="input-pref">Preferred input</Label>
              <Select value={s.inputModePreference} onValueChange={(v) => updateSettings(child.id, { inputModePreference: v as InputMode | "auto" })}>
                <SelectTrigger id="input-pref"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-detect</SelectItem>
                  <SelectItem value="midi">MIDI keyboard</SelectItem>
                  <SelectItem value="mic">Microphone (acoustic piano)</SelectItem>
                  <SelectItem value="timer">Timer + on-screen keyboard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                Microphone: {s.micCalibration ? <>calibrated (noise floor {s.micCalibration.noiseFloor.toFixed(3)})</> : "not calibrated yet"}
              </p>
              <Button variant="outline" onClick={() => setCalOpen(true)}><Mic className="h-5 w-5" /> {s.micCalibration ? "Re-calibrate microphone" : "Calibrate microphone"}</Button>
            </div>
            <Dialog open={calOpen} onOpenChange={setCalOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Microphone calibration</DialogTitle>
                  <DialogDescription>Used for acoustic pianos: notes below the noise floor are left unscored, never marked wrong.</DialogDescription>
                </DialogHeader>
                <MicRecalibrate childId={child.id} />
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Levels</CardTitle>
            <CardDescription>The app raises these automatically; override here if a teacher suggests it.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <LevelSelect label="Reading" value={s.readingLevel} max={10} onChange={(v) => updateSettings(child.id, { readingLevel: v, noStopStreak: 0 })} />
            <LevelSelect label="Rhythm" value={s.rhythmLevel} max={10} onChange={(v) => updateSettings(child.id, { rhythmLevel: v })} />
            <LevelSelect label="Theory" value={s.theoryLevel} max={5} onChange={(v) => updateSettings(child.id, { theoryLevel: v })} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sight Reading Factory</CardTitle>
            <CardDescription>Optional. If your family has a subscription, the reading block offers a button that opens this link.</CardDescription>
          </CardHeader>
          <CardContent>
            <LinkField value={s.sightReadingFactoryLink} onSave={(v) => updateSettings(child.id, { sightReadingFactoryLink: v })} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function SettingSlider({ label, value, min, max, step, unit, hint, onCommit }: { label: string; value: number; min: number; max: number; step: number; unit: string; hint?: string; onCommit: (v: number) => void }) {
  const [drag, setDrag] = React.useState<number | null>(null);
  const shown = drag ?? value;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <Label>{label}</Label>
        <span className="font-bold tabular-nums">{shown} {unit}</span>
      </div>
      <Slider aria-label={label} min={min} max={max} step={step} value={[shown]} onValueChange={([v]) => setDrag(v)} onValueCommit={([v]) => { setDrag(null); onCommit(v); }} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function LevelSelect({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (v: number) => void }) {
  const id = `level-${label.toLowerCase()}`;
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
        <SelectTrigger id={id}><SelectValue /></SelectTrigger>
        <SelectContent>
          {Array.from({ length: max }, (_, i) => i + 1).map((n) => <SelectItem key={n} value={String(n)}>Level {n}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function LinkField({ value, onSave }: { value: string | null; onSave: (v: string | null) => void }) {
  const [draft, setDraft] = React.useState(value ?? "");
  const dirty = (draft.trim() || null) !== value;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input type="url" inputMode="url" placeholder="https://www.sightreadingfactory.com/…" value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Sight Reading Factory link" />
        <Button variant="outline" disabled={!dirty} onClick={() => onSave(draft.trim() || null)}>Save</Button>
      </div>
      {value && <a href={value} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-bold text-primary underline-offset-4 hover:underline"><ExternalLink className="h-4 w-4" /> Open current link</a>}
    </div>
  );
}
