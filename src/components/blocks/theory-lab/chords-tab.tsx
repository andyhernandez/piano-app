"use client";
import * as React from "react";
import { motion } from "framer-motion";
import { Volume2, Waves } from "lucide-react";
import type { Scale } from "@/lib/types";
import { PianoKeyboard, keyboardRangeFor, type KeyState } from "@/components/keyboard/piano-keyboard";
import { MiniStaff } from "@/components/staff/staff";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useAudio } from "@/lib/hooks/use-audio";
import { prefersFlats, primaryTriads } from "@/lib/music/scales";
import { qualityLabel } from "@/lib/music/chords";
import { midiToPc, prettyPc } from "@/lib/music/notes";
import { cn } from "@/lib/utils/cn";
import { Segmented } from "../shared/segmented";
import { chordLabel, chordNotes, type Inversion } from "./ear-eye";

/** Tab 1 — primary triads (I IV V vi) on keyboard + staff with inversion toggle, 7ths from theory level 4. */
export function ChordsTab({ scale, level, onNoteOn, onNoteOff }: { scale: Scale; level: number; onNoteOn: (m: number) => void; onNoteOff: (m: number) => void }) {
  const { audio } = useAudio();
  const flats = prefersFlats(scale);
  const triads = React.useMemo(() => primaryTriads(scale), [scale]);
  const [index, setIndex] = React.useState(0);
  const [inversion, setInversion] = React.useState<Inversion>(0);
  const [seventh, setSeventh] = React.useState(false);
  const canSeventh = level >= 4;
  const useSeventh = seventh && canSeventh;

  const triad = triads[Math.min(index, triads.length - 1)];
  const notes = React.useMemo(() => chordNotes(triad, scale, inversion, useSeventh), [triad, scale, inversion, useSeventh]);
  const [lo, hi] = React.useMemo(() => keyboardRangeFor(notes), [notes]);

  const highlights = React.useMemo(() => {
    const h: Partial<Record<number, KeyState>> = {};
    for (const m of notes) h[m] = "correct";
    return h;
  }, [notes]);
  const labels = React.useMemo(() => {
    const l: Partial<Record<number, string>> = {};
    for (const m of notes) l[m] = prettyPc(midiToPc(m, flats));
    return l;
  }, [notes, flats]);

  const play = () => audio.playChord(notes, 1.4, 0.85);
  const roll = () => {
    const gap = 0.35;
    audio.playSequence(notes, gap, 0.9, 0.8);
    audio.playChord(notes, 1.4, 0.85, audio.now() + notes.length * gap + 0.2);
  };
  const inversionName = inversion === 0 ? "Root position" : inversion === 1 ? "1st inversion" : "2nd inversion";

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {triads.map((t, i) => {
          const active = i === index;
          return (
            <motion.button
              key={t.roman}
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => { setIndex(i); audio.playChord(chordNotes(t, scale, inversion, useSeventh), 1.2, 0.85); }}
              aria-pressed={active}
              className={cn(
                "flex h-24 flex-col items-center justify-center rounded-3xl border-2 font-bold shadow-[0_4px_0_0_rgba(0,0,0,0.08)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
              )}
            >
              <span className="font-display text-3xl">{t.roman}</span>
              <span className={cn("text-sm", active ? "opacity-90" : "text-muted-foreground")}>{chordLabel(t, useSeventh)}</span>
            </motion.button>
          );
        })}
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col">
              <div className="font-display text-3xl font-bold">{chordLabel(triad, useSeventh)} <span className="text-xl text-muted-foreground">· {triad.roman}</span></div>
              <div className="text-sm font-bold text-muted-foreground">{qualityLabel(triad.quality)}{useSeventh ? " seventh" : ""} · {inversionName}</div>
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-3">
              <Segmented label="Inversion" value={inversion} onChange={setInversion} options={[{ value: 0, label: "Root" }, { value: 1, label: "1st" }, { value: 2, label: "2nd" }]} />
              {canSeventh && (
                <label className="flex h-11 items-center gap-2 rounded-2xl bg-muted px-3 font-bold">
                  <Switch checked={seventh} onCheckedChange={setSeventh} aria-label="Add the seventh" /> 7th
                </label>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[240px_1fr] md:items-center">
            <div className="flex flex-col items-center gap-2 rounded-2xl bg-card">
              <MiniStaff midis={notes} keySig={scale.vexKey} preferFlats={flats} clef={Math.min(...notes) >= 60 ? "treble" : "bass"} />
              <div className="flex gap-1 pb-2">
                {notes.map((m, i) => <span key={`${m}-${i}`} className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold">{prettyPc(midiToPc(m, flats))}</span>)}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <PianoKeyboard from={lo} to={hi} highlights={highlights} labels={labels} preferFlats={flats} onNoteOn={onNoteOn} onNoteOff={onNoteOff} height={150} />
              <div className="flex flex-wrap gap-2">
                <Button size="lg" onClick={play}><Volume2 className="h-6 w-6" /> Play</Button>
                <Button size="lg" variant="outline" onClick={roll}><Waves className="h-6 w-6" /> Roll it</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
