"use client";
import * as React from "react";
import { CheckCircle2, Gift, KeyRound, Lock, Music2 } from "lucide-react";
import type { Child } from "@/lib/types";
import { useAppStore } from "@/lib/store/app-store";
import { songsForRegion } from "@/lib/music/songs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils/cn";
import { RHYTHM_TRAIL_LENGTH, type RegionView } from "./adventure-map";

/** Region details dialog: scale, songs, rhythm trail, chest, and the "use a key" action for the current region. */
export function RegionPanel({ child, region, onClose, onOpenChest }: { child: Child; region: RegionView | null; onClose: () => void; onOpenChest: (region: RegionView) => void }) {
  const spendKey = useAppStore((s) => s.spendKey);
  const [spending, setSpending] = React.useState(false);
  const open = !!region;

  async function useKey() {
    if (!region?.isCurrent || child.keys <= 0 || spending) return;
    setSpending(true);
    await spendKey();
    setSpending(false);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        {region && (
          <RegionBody child={child} region={region} spending={spending} onUseKey={useKey} onOpenChest={() => onOpenChest(region)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function RegionBody({ child, region, spending, onUseKey, onOpenChest }: { child: Child; region: RegionView; spending: boolean; onUseKey: () => void; onOpenChest: () => void }) {
  const { progress, name, isCurrent, selectable, index } = region;
  const songs = songsForRegion(progress.regionId);
  const status = progress.status;
  const statusLabel = status === "complete" ? "Complete" : status === "unlocked" ? (isCurrent ? "You are here" : "Open") : "Locked";

  if (!selectable) {
    // Peek only: far-away regions show a teaser, not the details.
    return (
      <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Lock className="h-6 w-6 text-muted-foreground" /> {name}</DialogTitle>
          <DialogDescription>Week {index + 1} on your map. Keep going and you&apos;ll get here!</DialogDescription>
        </DialogHeader>
        <div className="mt-4 rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
          {songs.length} hidden {songs.length === 1 ? "song" : "songs"}, a rhythm trail and a chest are waiting in the fog.
        </div>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {status === "complete" ? <CheckCircle2 className="h-6 w-6 text-accent" /> : status === "locked" ? <Lock className="h-6 w-6 text-muted-foreground" /> : <span aria-hidden>🌄</span>}
          {name}
        </DialogTitle>
        <DialogDescription>Week {index + 1} · <b>{statusLabel}</b></DialogDescription>
      </DialogHeader>

      <div className="mt-4 flex flex-col gap-4">
        <section>
          <h4 className="mb-2 flex items-center gap-2 font-display text-lg font-semibold"><Music2 className="h-5 w-5" /> Songs</h4>
          <ul className="flex flex-col gap-1.5">
            {songs.map((s) => {
              const unlocked = child.unlocks.songs.includes(s.id);
              return (
                <li key={s.id} className={cn("flex items-center justify-between rounded-xl border-2 px-3 py-2", unlocked ? "border-accent/60 bg-accent/10" : "border-border bg-muted/40")}>
                  <span className={cn("font-bold", !unlocked && "text-muted-foreground")}>{s.title}</span>
                  {unlocked ? <Badge variant="accent">Unlocked</Badge> : <Badge variant="muted"><Lock className="h-3 w-3" /> Locked</Badge>}
                </li>
              );
            })}
            {!songs.length && <li className="text-sm text-muted-foreground">No songs here yet — a teacher can add some.</li>}
          </ul>
          {status !== "complete" && songs.length > 0 && <p className="mt-1 text-xs text-muted-foreground">Finish this region to unlock its songs.</p>}
        </section>

        <section>
          <h4 className="mb-2 font-display text-lg font-semibold">Rhythm trail</h4>
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              {Array.from({ length: RHYTHM_TRAIL_LENGTH }, (_, i) => (
                <span key={i} className={cn("h-4 w-4 rounded-full border-2", i < progress.rhythmTrail ? "border-destructive bg-destructive" : "border-border bg-muted")} />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">{progress.rhythmTrail} / {RHYTHM_TRAIL_LENGTH}</span>
          </div>
        </section>

        <section className="flex items-center justify-between rounded-2xl border-2 p-3">
          <div className="flex items-center gap-2">
            <Gift className="h-6 w-6 text-primary" />
            <div>
              <div className="font-display text-lg font-semibold">Weekend chest</div>
              <div className="text-sm text-muted-foreground">{progress.chestOpened ? "Opened — nice one!" : isCurrent ? "Three bonus tasks, open all weekend." : status === "complete" ? "Still closed. It's just a bonus." : "Hidden until you get here."}</div>
            </div>
          </div>
          {isCurrent && <Button variant="secondary" onClick={onOpenChest}>{progress.chestOpened ? "See chest" : "Open"}</Button>}
        </section>

        {isCurrent && (
          <section className="flex flex-col gap-2 rounded-2xl bg-primary/10 p-4">
            <Button size="lg" className="w-full" disabled={child.keys <= 0 || spending} onClick={onUseKey}>
              <KeyRound className="h-6 w-6" /> Use a Key to finish this region
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              You have {child.keys} {child.keys === 1 ? "key" : "keys"}. Earn a key by practising {child.settings.practiceDaysPerWeek} days in a week.
            </p>
          </section>
        )}
        {status === "locked" && !isCurrent && (
          <p className="text-center text-sm text-muted-foreground">This is next! Finish your current region with a Key to open it.</p>
        )}
      </div>
    </>
  );
}
