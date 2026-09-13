"use client";
import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Heart, Mic, Music, Play, Square, Trash2 } from "lucide-react";
import type { Recording } from "@/lib/types";
import { repo } from "@/lib/db/repo";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils/cn";
import { isMidiRecording } from "./recording";

export interface MySongsProps {
  childId: string;
  /** Id of the recording currently replaying (null if none). */
  playingId: string | null;
  onReplay: (rec: Recording) => void;
  onStop: () => void;
}

/** "My Songs" shelf: this child's saved improvisations. */
export function MySongs({ childId, playingId, onReplay, onStop }: MySongsProps) {
  const recordings = useLiveQuery(async () => (await repo.listRecordings(childId)).filter((r) => r.blockType === "improv"), [childId]);
  const [toDelete, setToDelete] = React.useState<Recording | null>(null);

  const toggleFav = (rec: Recording) => void repo.putRecording({ ...rec, favourite: !rec.favourite });
  const confirmDelete = async () => {
    if (!toDelete) return;
    if (playingId === toDelete.id) onStop();
    await repo.deleteRecording(toDelete.id);
    setToDelete(null);
  };

  const list = React.useMemo(() => {
    if (!recordings) return [];
    return [...recordings].sort((a, b) => Number(Boolean(b.favourite)) - Number(Boolean(a.favourite)) || b.createdAt.localeCompare(a.createdAt));
  }, [recordings]);

  return (
    <div className="flex flex-col gap-2 rounded-2xl border-2 bg-card p-4">
      <div className="flex items-center gap-2">
        <h3 className="font-display text-lg font-semibold">My Songs</h3>
        <span className="text-sm font-bold text-muted-foreground">{list.length ? `${list.length} saved` : ""}</span>
      </div>
      {recordings === undefined ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing on the shelf yet. Record a jam and save the ones you love.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((rec) => {
            const isPlaying = playingId === rec.id;
            const midi = isMidiRecording(rec);
            return (
              <li key={rec.id} className={cn("flex items-center gap-2 rounded-2xl border-2 px-3 py-2", isPlaying ? "border-primary bg-primary/10" : "border-border")}>
                <Button size="icon" variant={isPlaying ? "outline" : "secondary"} onClick={() => (isPlaying ? onStop() : onReplay(rec))} aria-label={isPlaying ? `Stop ${rec.title ?? "song"}` : `Play ${rec.title ?? "song"}`}>
                  {isPlaying ? <Square className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </Button>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">{rec.title || "Untitled jam"}</div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    {midi ? <Music className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                    {new Date(rec.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    {midi && ` · ${rec.midiEvents!.filter((e) => e.kind === "on").length} notes`}
                  </div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => toggleFav(rec)} aria-pressed={Boolean(rec.favourite)} aria-label={rec.favourite ? "Remove favourite" : "Mark favourite"}>
                  <Heart className={cn("h-5 w-5", rec.favourite ? "fill-destructive text-destructive" : "text-muted-foreground")} />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setToDelete(rec)} aria-label={`Delete ${rec.title ?? "song"}`}>
                  <Trash2 className="h-5 w-5 text-muted-foreground" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={toDelete !== null} onOpenChange={(o) => { if (!o) setToDelete(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this song?</DialogTitle>
            <DialogDescription>&ldquo;{toDelete?.title || "Untitled jam"}&rdquo; will be gone from your shelf. This can&apos;t be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)}>Keep it</Button>
            <Button variant="destructive" onClick={() => void confirmDelete()}><Trash2 className="h-5 w-5" /> Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
