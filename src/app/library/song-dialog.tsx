"use client";
import * as React from "react";
import { ExternalLink, Lock, Play, Square, Volume2 } from "lucide-react";
import type { Child, Song } from "@/lib/types";
import { useAudio } from "@/lib/hooks/use-audio";
import { currentScale } from "@/lib/engine/progression";
import { buildScale, parseScaleSlug, scaleName } from "@/lib/music/scales";
import { romanToTriad, chordSymbol } from "@/lib/music/chords";
import { LEAD_SHEET_LEVELS } from "@/lib/music/songs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils/cn";

export const GENRE_LABEL: Record<Song["genre"], string> = { film: "Film", games: "Games", folk: "Folk", pop: "Pop", classical: "Classical", holiday: "Holiday" };

export function regionLabel(regionId: string): string {
  try { return scaleName(parseScaleSlug(regionId)); } catch { return regionId; }
}

export function isSongUnlocked(child: Child, song: Song): boolean {
  return !!song.isCustom || child.unlocks.songs.includes(song.id);
}

/** Song details: chord chart transposed to the scale of the week, lead-sheet levels, and playback. */
export function SongDialog({ child, song, onClose }: { child: Child; song: Song | null; onClose: () => void }) {
  return (
    <Dialog open={!!song} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl">
        {song && <SongBody child={child} song={song} />}
      </DialogContent>
    </Dialog>
  );
}

function SongBody({ child, song }: { child: Child; song: Song }) {
  const { audio, unlock } = useAudio();
  const weekScaleId = currentScale(child);
  const weekScale = React.useMemo(() => buildScale(weekScaleId), [weekScaleId]);
  const originalScale = React.useMemo(() => buildScale({ key: song.key, mode: song.mode }), [song.key, song.mode]);
  const unlocked = isSongUnlocked(child, song);
  const [playingBar, setPlayingBar] = React.useState<number | null>(null);
  const timers = React.useRef<number[]>([]);

  const bars = song.chart.map((bar) => bar.map((roman) => ({
    roman,
    week: romanToTriad(roman, weekScale),
    original: romanToTriad(roman, originalScale),
  })));
  const sameKey = weekScale.key === originalScale.key && weekScale.mode === originalScale.mode;

  const stop = React.useCallback(() => {
    for (const t of timers.current) window.clearTimeout(t);
    timers.current = [];
    setPlayingBar(null);
  }, []);

  React.useEffect(() => stop, [stop]);

  async function hear() {
    if (playingBar !== null) { stop(); return; }
    await unlock();
    const gapMs = 1000;
    let t = 0;
    bars.forEach((bar, i) => {
      const chordGap = gapMs / bar.length;
      bar.forEach((c, j) => {
        const at = t + j * chordGap;
        timers.current.push(window.setTimeout(() => {
          setPlayingBar(i);
          if (c.week) audio.playChord([c.week.midi[0] - 12, ...c.week.midi], (chordGap / 1000) * 0.9, 0.75);
        }, at));
      });
      t += gapMs;
    });
    timers.current.push(window.setTimeout(() => setPlayingBar(null), t + 200));
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex flex-wrap items-center gap-2">
          {song.title}
          {!unlocked && <Badge variant="muted"><Lock className="h-3 w-3" /> Locked</Badge>}
          {song.isCustom && <Badge variant="secondary">From your teacher</Badge>}
        </DialogTitle>
        <DialogDescription>
          <span aria-label={`Level ${song.level}`}>{"★".repeat(song.level)}{"☆".repeat(5 - song.level)}</span> · {GENRE_LABEL[song.genre]} · Original key {originalScale.name}
        </DialogDescription>
      </DialogHeader>

      {!unlocked && (
        <div className="mt-3 rounded-2xl bg-muted p-3 text-sm">
          <b>Finish the {regionLabel(song.unlockedByRegion)} region to unlock.</b> You can still peek at the chords and hear them.
        </div>
      )}

      <section className="mt-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h4 className="font-display text-lg font-semibold">Chords in {weekScale.name}{sameKey ? "" : ` (moved from ${originalScale.name})`}</h4>
          <Button variant={playingBar !== null ? "outline" : "accent"} onClick={hear}>
            {playingBar !== null ? <><Square className="h-5 w-5" /> Stop</> : <><Volume2 className="h-5 w-5" /> Hear the chords</>}
          </Button>
        </div>
        <ol className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {bars.map((bar, i) => (
            <li key={i} className={cn("flex min-h-16 flex-col items-center justify-center rounded-xl border-2 px-1 py-2 text-center transition-colors", playingBar === i ? "border-primary bg-primary/15" : "border-border bg-card")}>
              <span className="font-display text-lg font-semibold leading-tight">{bar.map((c) => (c.week ? chordSymbol(c.week) : c.roman)).join(" ")}</span>
              <span className="text-[11px] text-muted-foreground">{bar.map((c) => c.roman).join(" ")}</span>
              {!sameKey && <span className="text-[10px] text-muted-foreground">{bar.map((c) => (c.original ? chordSymbol(c.original) : c.roman)).join(" ")}</span>}
            </li>
          ))}
        </ol>
        {!sameKey && <p className="mt-1 text-xs text-muted-foreground">Big: chords in this week&apos;s key · small: roman numerals and the original key.</p>}
      </section>

      <section className="mt-4">
        <h4 className="mb-2 font-display text-lg font-semibold">Lead-sheet levels</h4>
        <ul className="grid gap-2 sm:grid-cols-2">
          {song.leadSheetLevels.map((lvl) => (
            <li key={lvl} className="rounded-xl border-2 p-3">
              <div className="font-bold">{LEAD_SHEET_LEVELS[lvl].title}</div>
              <div className="text-sm text-muted-foreground">{LEAD_SHEET_LEVELS[lvl].description}</div>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-4 flex flex-wrap gap-2">
        {song.externalLink && (
          <Button variant="outline" asChild>
            <a href={song.externalLink} target="_blank" rel="noreferrer noopener"><ExternalLink className="h-5 w-5" /> Open the sheet music</a>
          </Button>
        )}
        {unlocked && (
          <Button variant="secondary" asChild>
            <a href="/session"><Play className="h-5 w-5" /> Practise it in a session</a>
          </Button>
        )}
      </div>
    </>
  );
}
