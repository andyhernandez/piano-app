"use client";
import * as React from "react";
import { ExternalLink, GraduationCap, Lock, Music2 } from "lucide-react";
import type { Assignment, Song } from "@/lib/types";
import type { AudioEngine } from "@/lib/audio/engine";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import { UploadViewer } from "./upload-viewer";
import { MetronomeLadder, RepCounter } from "./practice-tools";

export interface PiecePanelProps {
  audio: AudioEngine;
  running: boolean;
  assignment: Assignment | undefined;
  /** Songs the child can pick from (teacher assignment first, then unlocked). */
  library: Song[];
  assignedIds: string[];
  unlockedIds: string[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  pieceText: string;
  onPieceText: (v: string) => void;
  onRep: () => void;
}

export function PiecePanel({ audio, running, assignment, library, assignedIds, unlockedIds, selectedId, onSelect, pieceText, onPieceText, onRep }: PiecePanelProps) {
  const byId = React.useMemo(() => new Map(library.map((s) => [s.id, s])), [library]);
  const assigned = assignedIds.map((id) => byId.get(id)).filter((s): s is Song => Boolean(s));
  const unlocked = unlockedIds.map((id) => byId.get(id)).filter((s): s is Song => Boolean(s) && !assignedIds.includes(s!.id));
  const selected = selectedId ? byId.get(selectedId) : undefined;

  const chip = (song: Song, fromTeacher: boolean) => {
    const isSel = selectedId === song.id;
    return (
      <button
        key={song.id}
        type="button"
        onClick={() => onSelect(isSel ? null : song.id)}
        aria-pressed={isSel}
        className={cn("flex min-h-12 items-center gap-2 rounded-2xl border-2 px-3 py-2 text-left font-bold transition-colors", isSel ? "border-primary bg-primary/10" : "border-border bg-card")}
      >
        {fromTeacher ? <GraduationCap className="h-4 w-4 shrink-0 text-primary" /> : <Music2 className="h-4 w-4 shrink-0 text-muted-foreground" />}
        <span className="truncate">{song.title}</span>
        {song.isCustom && <Badge variant="muted">Upload</Badge>}
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {assignment && (assignment.note || assigned.length > 0) && (
        <div className="rounded-2xl border-2 border-primary/40 bg-primary/5 p-4">
          <div className="mb-1 flex items-center gap-2 font-display text-lg font-semibold"><GraduationCap className="h-5 w-5 text-primary" /> From your teacher</div>
          {assignment.note && <p className="text-sm">{assignment.note}</p>}
          {assigned.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{assigned.map((s) => chip(s, true))}</div>}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="piece-text">What are you working on?</Label>
        <Input id="piece-text" value={pieceText} onChange={(e) => onPieceText(e.target.value)} placeholder="e.g. Minuet in G, bars 9–16" maxLength={80} />
      </div>

      {unlocked.length > 0 ? (
        <div className="flex flex-col gap-2">
          <Label>Your songs</Label>
          <div className="flex flex-wrap gap-2">{unlocked.map((s) => chip(s, false))}</div>
        </div>
      ) : (
        assigned.length === 0 && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><Lock className="h-4 w-4" /> Finish a region on the map to unlock songs here.</p>
        )
      )}

      {selected && (
        <div className="flex flex-col gap-3 rounded-2xl border-2 bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-lg font-semibold">{selected.title}</h3>
            <Badge variant="muted">Level {selected.level}</Badge>
            {selected.externalLink && (
              <Button asChild variant="outline" size="sm" className="ml-auto">
                <a href={selected.externalLink} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /> Open score</a>
              </Button>
            )}
          </div>
          {selected.uploadId && <UploadViewer uploadId={selected.uploadId} title={selected.title} />}
          {!selected.uploadId && !selected.externalLink && (
            <p className="text-sm text-muted-foreground">Use your own sheet music for this one. The chord chart is waiting in the Lead sheet tab.</p>
          )}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <RepCounter audio={audio} onRep={onRep} />
        <MetronomeLadder audio={audio} running={running} />
      </div>
    </div>
  );
}
