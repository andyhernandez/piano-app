"use client";
import * as React from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { Lock, Music2 } from "lucide-react";
import { AppShell } from "@/components/shared/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useActiveChild } from "@/lib/store/app-store";
import { repo } from "@/lib/db/repo";
import { SONGS } from "@/lib/music/songs";
import { currentScale, currentRegionId } from "@/lib/engine/progression";
import { scaleName } from "@/lib/music/scales";
import type { Genre, Song } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { SongDialog, GENRE_LABEL, isSongUnlocked, regionLabel } from "./song-dialog";
import { MySongs } from "./my-songs";

const GENRES: Genre[] = ["film", "games", "folk", "pop", "classical", "holiday"];
type StatusFilter = "all" | "unlocked" | "locked";

export default function LibraryPage() {
  const child = useActiveChild();
  const customSongs = useLiveQuery(() => repo.listCustomSongs(), []) ?? [];
  const [level, setLevel] = React.useState<string>("all");
  const [genre, setGenre] = React.useState<string>("all");
  const [status, setStatus] = React.useState<StatusFilter>("all");
  const [openSong, setOpenSong] = React.useState<Song | null>(null);

  if (!child) {
    return (
      <AppShell title="Songs">
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-muted-foreground">Add a player first to see the song library.</p>
          <Button asChild><Link href="/onboarding">Get started</Link></Button>
        </div>
      </AppShell>
    );
  }

  const all: Song[] = [...SONGS, ...customSongs.map((s) => ({ ...s, isCustom: true }))];
  const currentRegion = currentRegionId(child);
  const filtered = all.filter((s) => {
    if (level !== "all" && s.level !== Number(level)) return false;
    if (genre !== "all" && s.genre !== genre) return false;
    const unlocked = isSongUnlocked(child, s);
    if (status === "unlocked" && !unlocked) return false;
    if (status === "locked" && unlocked) return false;
    return true;
  });
  const unlockedCount = all.filter((s) => isSongUnlocked(child, s)).length;

  return (
    <AppShell title="Songs">
      <Tabs defaultValue="library">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="library">Song library</TabsTrigger>
            <TabsTrigger value="mine">My Songs</TabsTrigger>
          </TabsList>
          <p className="text-sm text-muted-foreground">Scale of the week: <b>{scaleName(currentScale(child))}</b> · {unlockedCount} of {all.length} songs unlocked</p>
        </div>

        <TabsContent value="library" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger className="w-36" aria-label="Level"><SelectValue placeholder="Level" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All levels</SelectItem>
                {[1, 2, 3, 4, 5].map((l) => <SelectItem key={l} value={String(l)}>Level {l} {"★".repeat(l)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={genre} onValueChange={setGenre}>
              <SelectTrigger className="w-40" aria-label="Genre"><SelectValue placeholder="Genre" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All genres</SelectItem>
                {GENRES.map((g) => <SelectItem key={g} value={g}>{GENRE_LABEL[g]}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="inline-flex h-12 items-center rounded-2xl bg-muted p-1" role="group" aria-label="Unlock status">
              {(["all", "unlocked", "locked"] as StatusFilter[]).map((s) => (
                <button key={s} type="button" onClick={() => setStatus(s)} aria-pressed={status === s}
                  className={cn("h-10 rounded-xl px-4 font-bold capitalize transition-all", status === s ? "bg-card shadow" : "text-muted-foreground")}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">No songs match those filters yet.</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((s) => {
                const unlocked = isSongUnlocked(child, s);
                const isHere = s.unlockedByRegion === currentRegion;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setOpenSong(s)}
                      className={cn("flex h-full w-full flex-col gap-2 rounded-2xl border-2 bg-card p-4 text-left transition-all active:scale-[0.98] hover:bg-muted/40", !unlocked && "opacity-80")}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-display text-lg font-semibold leading-tight">{s.title}</span>
                        {unlocked ? <Music2 className="h-6 w-6 shrink-0 text-accent" /> : <Lock className="h-6 w-6 shrink-0 text-muted-foreground" />}
                      </div>
                      <div className="text-secondary-foreground" aria-label={`Level ${s.level}`}>
                        <span className="text-secondary">{"★".repeat(s.level)}</span><span className="opacity-30">{"★".repeat(5 - s.level)}</span>
                      </div>
                      <div className="mt-auto flex flex-wrap gap-1.5">
                        <Badge variant="outline">{GENRE_LABEL[s.genre]}</Badge>
                        {s.isCustom ? <Badge variant="secondary">Teacher</Badge> : <Badge variant={isHere ? "accent" : "muted"}>{regionLabel(s.unlockedByRegion)}</Badge>}
                        {unlocked ? <Badge variant="accent">Unlocked</Badge> : <Badge variant="muted">Locked</Badge>}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="mine">
          <MySongs child={child} />
        </TabsContent>
      </Tabs>

      <SongDialog child={child} song={openSong} onClose={() => setOpenSong(null)} />
    </AppShell>
  );
}
