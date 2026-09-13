"use client";
import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Check, ExternalLink, Paperclip, Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { repo } from "@/lib/db/repo";
import { SONGS } from "@/lib/music/songs";
import { currentRegionId, currentScale } from "@/lib/engine/progression";
import { newId } from "@/lib/utils/id";
import { cn } from "@/lib/utils/cn";
import type { Child, Genre, Song, SongLevel } from "@/lib/types";

const GENRES: Genre[] = ["folk", "classical", "pop", "film", "games", "holiday"];

/** Multi-select of built-in songs plus a form to add custom songs (link and/or PDF/image upload). */
export function RepertoirePicker({ child, selected, onChange }: { child: Child; selected: string[]; onChange: (ids: string[]) => void }) {
  const custom = useLiveQuery(() => repo.listCustomSongs(), []) ?? [];
  const [adding, setAdding] = React.useState(false);
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  const all: Song[] = [...SONGS, ...custom];
  const byRegion = new Map<string, Song[]>();
  for (const s of SONGS) {
    if (!byRegion.has(s.unlockedByRegion)) byRegion.set(s.unlockedByRegion, []);
    byRegion.get(s.unlockedByRegion)!.push(s);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {selected.length ? <>{selected.length} assigned: {selected.map((id) => all.find((s) => s.id === id)?.title ?? id).join(", ")}.</> : "Nothing assigned yet."} Assigned songs become available in the student&apos;s library right away, whatever region they are in.
      </p>
      {Array.from(byRegion.entries()).map(([region, songs]) => (
        <div key={region}>
          <div className="mb-1 text-xs font-bold uppercase text-muted-foreground">{region.replace("-", " ")}</div>
          <div className="flex flex-wrap gap-2">
            {songs.map((s) => <SongChip key={s.id} song={s} on={selected.includes(s.id)} unlocked={child.unlocks.songs.includes(s.id)} onClick={() => toggle(s.id)} />)}
          </div>
        </div>
      ))}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <div className="text-xs font-bold uppercase text-muted-foreground">Custom songs</div>
          <Button variant="ghost" size="sm" onClick={() => setAdding((a) => !a)}><Plus className="h-4 w-4" /> Add a song</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {custom.length === 0 && !adding && <span className="text-sm text-muted-foreground">None yet. Add a title with a link or an uploaded PDF.</span>}
          {custom.map((s) => <SongChip key={s.id} song={s} on={selected.includes(s.id)} unlocked={child.unlocks.songs.includes(s.id)} onClick={() => toggle(s.id)} />)}
        </div>
        {adding && (
          <CustomSongForm
            child={child}
            onAdded={(id) => { onChange([...selected, id]); setAdding(false); }}
            onCancel={() => setAdding(false)}
          />
        )}
      </div>
    </div>
  );
}

function SongChip({ song, on, unlocked, onClick }: { song: Song; on: boolean; unlocked: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn("inline-flex h-10 items-center gap-1.5 rounded-full border-2 px-3 text-sm font-bold transition-colors", on ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted")}
      title={`${song.title} · level ${song.level} · ${song.genre}${unlocked ? " · already unlocked" : ""}`}
    >
      {on && <Check className="h-4 w-4" />}
      {song.title}
      <span className={on ? "text-xs opacity-80" : "text-xs text-muted-foreground"}>L{song.level}</span>
      {song.externalLink && <ExternalLink className="h-3.5 w-3.5 opacity-70" />}
      {song.uploadId && <Paperclip className="h-3.5 w-3.5 opacity-70" />}
    </button>
  );
}

function CustomSongForm({ child, onAdded, onCancel }: { child: Child; onAdded: (id: string) => void; onCancel: () => void }) {
  const [title, setTitle] = React.useState("");
  const [level, setLevel] = React.useState<SongLevel>(1);
  const [genre, setGenre] = React.useState<Genre>("classical");
  const [link, setLink] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async () => {
    if (!title.trim()) { setError("Give the song a title."); return; }
    setBusy(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      let uploadId: string | undefined;
      if (file) {
        uploadId = newId("up");
        await repo.putRecording({ id: uploadId, childId: child.id, sessionId: "", blockType: "repertoire", createdAt: now, mimeType: file.type || "application/octet-stream", blob: file, title: file.name });
      }
      const scale = currentScale(child);
      const song: Song = {
        id: newId("song"),
        title: title.trim(),
        level,
        genre,
        unlockedByRegion: currentRegionId(child),
        key: scale.key,
        mode: scale.mode,
        chart: [["I"], ["IV"], ["V"], ["I"]],
        leadSheetLevels: [1, 2],
        externalLink: link.trim() || undefined,
        uploadId,
        isCustom: true,
      };
      await repo.putCustomSong(song);
      onAdded(song.id);
    } catch (e) {
      setError((e as Error).message || "Couldn't save the song.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 grid gap-3 rounded-2xl border-2 bg-muted/30 p-4 sm:grid-cols-2">
      <div className="sm:col-span-2"><Label htmlFor="cs-title">Title</Label><Input id="cs-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Minuet in G" /></div>
      <div>
        <Label htmlFor="cs-level">Level</Label>
        <Select value={String(level)} onValueChange={(v) => setLevel(Number(v) as SongLevel)}>
          <SelectTrigger id="cs-level"><SelectValue /></SelectTrigger>
          <SelectContent>{[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>Level {n}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="cs-genre">Genre</Label>
        <Select value={genre} onValueChange={(v) => setGenre(v as Genre)}>
          <SelectTrigger id="cs-genre"><SelectValue /></SelectTrigger>
          <SelectContent>{GENRES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div><Label htmlFor="cs-link">Link (optional)</Label><Input id="cs-link" type="url" inputMode="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" /></div>
      <div>
        <Label htmlFor="cs-file">PDF or image (optional)</Label>
        <Input id="cs-file" type="file" accept="application/pdf,image/*" className="pt-2.5" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        {file && <p className="mt-1 text-xs text-muted-foreground"><Upload className="mr-1 inline h-3 w-3" />{file.name} · {Math.round(file.size / 1024)} KB, stored on this device</p>}
      </div>
      {error && <p className="text-sm font-semibold text-destructive sm:col-span-2">{error}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <Button onClick={submit} disabled={busy}>{busy ? "Saving…" : "Add and assign"}</Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}
