"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Screen, Panel, PieceRow, SectionLabel, IconButton, Choice } from "@/components/ds";
import { AppHeader } from "@/components/screens/today/app-header";
import { useActiveChild } from "@/lib/store/app-store";
import { repo } from "@/lib/db/repo";
import type { Assignment, Recording, Session, Song } from "@/lib/types";
import { SONGS } from "@/lib/music/songs";
import { sessionsBySong } from "@/lib/engine/record";
import { describePiece, sortPieces, filterPieces, suggestedNext, FILTERS, type Filter } from "./pieces";
import { RecordingsRail } from "./recordings-rail";
import { AddPiecePanel } from "./add-piece-panel";

interface Loaded { sessions: Session[]; assignment: Assignment | null; customs: Song[]; recordings: Recording[] }

/**
 * The Library: every piece, none of them locked. Pieces above the reading level open as a lead sheet.
 * The rail keeps the player's own takes and points at what to try next.
 */
export function LibraryScreen() {
  const router = useRouter();
  const child = useActiveChild();
  const [loaded, setLoaded] = React.useState<Loaded | null>(null);
  const [filter, setFilter] = React.useState<Filter>("All");
  const [adding, setAdding] = React.useState(false);

  React.useEffect(() => {
    if (!child) router.replace("/onboarding");
  }, [child, router]);

  const childId = child?.id;
  React.useEffect(() => {
    if (!childId) return;
    let live = true;
    void (async () => {
      const [sessions, assignment, customs, recordings] = await Promise.all([repo.listSessions(childId, 200), repo.assignmentFor(childId), repo.listCustomSongs(), repo.listRecordings(childId)]);
      if (live) setLoaded({ sessions, assignment: assignment ?? null, customs, recordings });
    })();
    return () => { live = false; };
  }, [childId]);

  if (!child) return <Screen><AppHeader active="library" /></Screen>;

  const bySong = sessionsBySong(loaded?.sessions ?? []);
  const songs = [...SONGS, ...(loaded?.customs ?? [])];
  const pieces = sortPieces(songs.map((s) => describePiece(s, child, loaded?.assignment ?? null, bySong)));
  const shown = filterPieces(pieces, filter);
  const next = suggestedNext(pieces);
  const open = (id: string) => router.push(`/piece?id=${encodeURIComponent(id)}`);

  const savePiece = async (song: Song) => {
    await repo.putCustomSong(song);
    setLoaded((l) => (l ? { ...l, customs: [...l.customs, song] } : l));
    setAdding(false);
    setFilter("Custom");
  };
  const deleteRecording = async (id: string) => {
    await repo.deleteRecording(id);
    setLoaded((l) => (l ? { ...l, recordings: l.recordings.filter((r) => r.id !== id) } : l));
  };

  return (
    <Screen>
      <AppHeader active="library" />
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "1fr 340px" }}>
        <div style={{ padding: "32px 36px", display: "flex", flexDirection: "column", gap: 18, minHeight: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 16 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ margin: 0, fontSize: 34, fontWeight: 600, letterSpacing: "-0.03em" }}>Library</h1>
              <p style={{ margin: "8px 0 0", fontSize: 15, color: "var(--kc-ink-muted)", maxWidth: 470 }}>Nothing is locked. Above your level, you get the lead sheet instead of the full score.</p>
            </div>
            <div style={{ marginLeft: "auto", flex: "none", display: "flex", gap: 8, alignItems: "center" }}>
              <Choice<Filter> options={FILTERS} value={filter} onChange={setFilter} />
              <IconButton icon="add" shape="square" size={40} label="Add a piece" onClick={() => setAdding((a) => !a)} style={adding ? { border: "1px solid var(--kc-mint)", color: "var(--kc-mint)" } : undefined} />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, minHeight: 0, overflowY: "auto", paddingRight: 2 }}>
            {adding && <AddPiecePanel onSave={(s) => void savePiece(s)} onCancel={() => setAdding(false)} />}
            {loaded && shown.length === 0 && !adding && (
              <p style={{ margin: "6px 0 0", fontSize: 14, lineHeight: 1.5, color: "var(--kc-ink-dim)" }}>
                {filter === "Learning" ? "Nothing yet. A piece you have opened in a session shows up here." : filter === "Custom" ? "Nothing yet. Add a piece with its link or its chords." : filter === "Suggested" ? "Nothing in this week's key yet." : "Nothing yet."}
              </p>
            )}
            {shown.map((p) => (
              <PieceRow key={p.song.id} title={p.song.title} meta={p.meta} format={p.format} assigned={p.state === "today"} pill={p.state === "today" ? "IN TODAY" : undefined} onOpen={() => open(p.song.id)} style={{ flex: "none" }} />
            ))}
          </div>
        </div>

        <div style={{ borderLeft: "1px solid var(--kc-border)", background: "var(--kc-panel)", padding: "32px 28px", display: "flex", flexDirection: "column", gap: 24, minHeight: 0, overflowY: "auto" }}>
          <RecordingsRail recordings={loaded?.recordings ?? []} onDeleted={(id) => void deleteRecording(id)} />
          <Panel padding="panel" style={{ marginTop: "auto", flex: "none", cursor: next ? "pointer" : "default" }} onClick={next ? () => open(next.piece.song.id) : undefined}>
            <SectionLabel>SUGGESTED NEXT</SectionLabel>
            {next ? (
              <>
                <div style={{ fontSize: 17, fontWeight: 600 }}>{next.piece.song.title}</div>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.4, color: "var(--kc-ink-dim)" }}>{next.why}</p>
              </>
            ) : (
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.4, color: "var(--kc-ink-dim)" }}>{"Nothing yet. Add a piece, or take what this week's key suggests."}</p>
            )}
          </Panel>
        </div>
      </div>
    </Screen>
  );
}
