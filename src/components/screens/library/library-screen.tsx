"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Screen, Headline, Button, Icon, Pill, FormatBadge, ActionNote, Small } from "@/components/ds";
import type { PillTone } from "@/components/ds";
import { AppHeader } from "@/components/screens/today/app-header";
import { useActiveChild } from "@/lib/store/app-store";
import { repo } from "@/lib/db/repo";
import type { Assignment, Recording, Session, Song } from "@/lib/types";
import { SONGS } from "@/lib/music/songs";
import { sessionsBySong } from "@/lib/engine/record";
import { describePiece, sortPieces, filterPieces, suggestedNext, FILTERS, type Filter, type PieceView } from "./pieces";
import { RecordingsRail } from "./recordings-rail";
import { AddPiecePanel } from "./add-piece-panel";

interface Loaded { sessions: Session[]; assignment: Assignment | null; customs: Song[]; recordings: Recording[] }

const FILTER_LABEL: Record<Filter, string> = { All: "All", Suggested: "Suggested", Learning: "Learning", Custom: "Your own" };

/** One piece: a format tile, the title and meta, a state chip and Open / Start. In today has an indigo border. */
function LibraryRow({ piece, onOpen }: { piece: PieceView; onOpen: () => void }) {
  const today = piece.state === "today";
  const chip: { tone: PillTone; icon?: string; text: string } | null =
    today ? { tone: "indigo-fill", icon: "check", text: "In today" }
    : piece.state === "learning" ? { tone: "mint", text: "Learning" }
    : piece.state === "suggested" ? { tone: "sun", text: "This week's key" }
    : null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, background: "var(--kc-panel)", border: today ? "2px solid var(--kc-indigo)" : "2px solid var(--kc-border)", borderRadius: 20, padding: "12px 16px 12px 12px", boxShadow: today ? "0 3px 0 0 var(--kc-indigo-shadow)" : "0 3px 0 0 var(--kc-border)", flex: "none" }}>
      <FormatBadge format={piece.format} assigned={today} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 19, fontWeight: 600, lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{piece.song.title}</div>
        <Small>{piece.meta}</Small>
      </div>
      {chip && <Pill tone={chip.tone} icon={chip.icon}>{chip.text}</Pill>}
      <Button variant="secondary" size="pill" onClick={onOpen}>{today || piece.state === "learning" ? "Open" : "Start"}</Button>
    </div>
  );
}

/**
 * The Library: every piece, none of them locked. Pieces above the reading level open as a simpler sheet.
 * The rail keeps the player's own takes and points at what to try next.
 */
export function LibraryScreen() {
  const router = useRouter();
  const child = useActiveChild();
  const [loaded, setLoaded] = React.useState<Loaded | null>(null);
  const [filter, setFilter] = React.useState<Filter>("All");
  const [query, setQuery] = React.useState("");
  const [searching, setSearching] = React.useState(false);
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
  const q = query.trim().toLowerCase();
  const shown = filterPieces(pieces, filter).filter((p) => !q || p.song.title.toLowerCase().includes(q) || p.meta.toLowerCase().includes(q));
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

  const emptyCopy = q ? `Nothing called "${query.trim()}".` : filter === "Learning" ? "Nothing yet. A piece you have opened in a session shows up here." : filter === "Custom" ? "Nothing yet. Add a piece with its link or its chords." : filter === "Suggested" ? "Nothing in this week's key yet." : "Nothing yet.";

  return (
    <Screen>
      <AppHeader active="library" />
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "minmax(0, 1fr) 340px" }}>
        <div style={{ padding: "30px 32px", display: "flex", flexDirection: "column", gap: 18, minHeight: 0 }}>
          <Headline title="Pieces" lede="Nothing is locked. Anything above your reading level comes as a simpler sheet." />
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {FILTERS.map((f) => {
              const on = filter === f;
              return (
                <button key={f} type="button" onClick={() => setFilter(f)} style={{ height: 40, padding: "0 18px", borderRadius: 999, display: "inline-flex", alignItems: "center", fontSize: 15, fontWeight: 800, cursor: "pointer", boxSizing: "border-box", ...(on ? { background: "var(--kc-ink)", color: "#ffffff", border: "none" } : { background: "var(--kc-panel)", border: "2px solid var(--kc-border)", color: "var(--kc-ink-muted)" }) }}>
                  {FILTER_LABEL[f]}
                </button>
              );
            })}
            <label style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 8, height: 40, padding: "0 14px", borderRadius: 999, background: "var(--kc-panel)", border: `2px solid ${searching || q ? "var(--kc-indigo)" : "var(--kc-border)"}`, color: "var(--kc-ink-faint)", fontSize: 15, fontWeight: 700, boxSizing: "border-box" }}>
              <Icon name="search" size={20} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} onFocus={() => setSearching(true)} onBlur={() => setSearching(false)} placeholder="Search pieces" aria-label="Search pieces" style={{ border: "none", outline: "none", background: "transparent", font: "inherit", fontWeight: 700, color: "var(--kc-ink)", width: searching || q ? 180 : 110 }} />
            </label>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 0, overflowY: "auto", padding: "0 2px 4px" }}>
            {adding && <AddPiecePanel onSave={(s) => void savePiece(s)} onCancel={() => setAdding(false)} />}
            {loaded && shown.length === 0 && !adding && <Small style={{ marginTop: 6 }}>{emptyCopy}</Small>}
            {shown.map((p) => <LibraryRow key={p.song.id} piece={p} onOpen={() => open(p.song.id)} />)}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: "auto", flex: "none" }}>
            <Button variant="secondary" size="control" icon={adding ? "close" : "add"} style={{ height: 58 }} onClick={() => setAdding((a) => !a)}>{adding ? "Never mind" : "Add a piece"}</Button>
            <ActionNote>Teachers can add pieces from their side too.</ActionNote>
          </div>
        </div>

        <div style={{ borderLeft: "2px solid var(--kc-hairline)", background: "var(--kc-panel)", padding: "28px 26px", display: "flex", flexDirection: "column", gap: 22, minHeight: 0, overflowY: "auto" }}>
          <RecordingsRail recordings={loaded?.recordings ?? []} onDeleted={(id) => void deleteRecording(id)} />
          <div style={{ background: "var(--kc-sun-wash)", borderRadius: 20, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 8, marginTop: "auto", flex: "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 800, color: "var(--kc-sun-ink)" }}><Icon name="lightbulb" size={20} />Try next</div>
            {next ? (
              <>
                <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 22, fontWeight: 600, lineHeight: 1.15 }}>{next.piece.song.title}</div>
                <Small>{next.why}</Small>
                <div style={{ marginTop: 4 }}><Button size="control" icon="play_arrow" onClick={() => open(next.piece.song.id)}>Start it</Button></div>
              </>
            ) : (
              <Small>{"Nothing yet. Add a piece, or take what this week's key suggests."}</Small>
            )}
          </div>
        </div>
      </div>
    </Screen>
  );
}
