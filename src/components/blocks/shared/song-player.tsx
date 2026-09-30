"use client";
import * as React from "react";
import type { Scale } from "@/lib/types";
import { Button, SectionLabel } from "@/components/ds";
import { parseYoutubeId, songsInKey, youtubeEmbedUrl, youtubeSearchUrl, type JamSong } from "@/lib/music/jam-songs";

/*
 * Play-along songs for "Your own": well-known tunes in the session key on the left, the video on the right.
 * Videos are not shipped with the app — the first time a song is chosen the parent finds it on YouTube and
 * pastes the link; from then on it opens straight into the player for that child.
 */

const fieldStyle: React.CSSProperties = {
  height: 40, boxSizing: "border-box", padding: "0 12px", borderRadius: "var(--kc-radius-control)", background: "var(--kc-base)",
  border: "1px solid var(--kc-border-active)", color: "var(--kc-ink)", fontFamily: "var(--kc-font-sans)", fontSize: 14, outline: "none", width: "100%", minWidth: 0,
};

function SongRow({ song, selected, hasVideo, onClick }: { song: JamSong; selected: boolean; hasVideo: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      style={{
        display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", alignItems: "center", gap: 12, width: "100%", textAlign: "left", cursor: "pointer",
        padding: "8px 12px", borderRadius: "var(--kc-radius-control)", background: selected ? "var(--kc-mint-wash)" : "transparent",
        border: selected ? "1px solid var(--kc-mint)" : "1px solid transparent", color: "var(--kc-ink)", font: "inherit",
      }}
    >
      <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{song.title}</span>
        <span style={{ fontSize: 13, color: "var(--kc-ink-dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{song.artist} · <span style={{ fontFamily: "var(--kc-font-mono)" }}>{song.chords}</span></span>
      </span>
      <span style={{ fontFamily: "var(--kc-font-mono)", fontSize: 10, letterSpacing: "0.07em", textTransform: "uppercase", color: hasVideo ? "var(--kc-mint)" : "var(--kc-ink-faint)" }}>{hasVideo ? "Video" : "No video yet"}</span>
    </button>
  );
}

export function SongPlayer({ scale, videos, onSaveVideo, onPlay }: {
  scale: Scale;
  /** YouTube video ids by song id, remembered per child. */
  videos: Record<string, string>;
  onSaveVideo: (songId: string, videoId: string | null) => void;
  /** Called when a video is about to play, so the groove can stop. */
  onPlay?: () => void;
}) {
  const songs = React.useMemo(() => songsInKey(scale), [scale]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  // Falls back to the first song when the key changes and the chosen one is no longer in the list.
  const selected = songs.find((s) => s.id === selectedId) ?? songs[0] ?? null;
  const videoId = selected ? videos[selected.id] : undefined;

  const [draft, setDraft] = React.useState("");
  const [bad, setBad] = React.useState(false);
  const save = () => {
    if (!selected) return;
    const id = parseYoutubeId(draft);
    if (!id) { setBad(true); return; }
    onSaveVideo(selected.id, id);
    setDraft("");
    setBad(false);
    onPlay?.();
  };
  const choose = (song: JamSong) => { setSelectedId(song.id); setDraft(""); setBad(false); if (videos[song.id]) onPlay?.(); };
  const findOnYoutube = () => { if (selected) window.open(youtubeSearchUrl(selected), "_blank", "noopener"); };

  if (!songs.length) {
    return <p style={{ margin: 0, fontSize: 14, color: "var(--kc-ink-muted)" }}>No songs listed for {scale.name} yet. The groove still works in every key.</p>;
  }

  return (
    <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "minmax(0, 1fr) 336px", gap: 18 }}>
      <div style={{ minHeight: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        <SectionLabel>Songs in {scale.name}</SectionLabel>
        <div style={{ minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2, margin: "0 -6px", padding: "0 6px" }}>
          {songs.map((s) => <SongRow key={s.id} song={s} selected={s.id === selected?.id} hasVideo={Boolean(videos[s.id])} onClick={() => choose(s)} />)}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 0 }}>
        {selected && videoId ? (
          <>
            <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", borderRadius: 8, overflow: "hidden", background: "#000", flex: "none" }}>
              <iframe
                key={videoId}
                src={youtubeEmbedUrl(videoId)}
                title={`${selected.title} — ${selected.artist}`}
                allow="encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
              />
            </div>
            <div style={{ fontSize: 14, color: "var(--kc-ink-dim)", lineHeight: 1.45 }}>
              Loop: <span style={{ fontFamily: "var(--kc-font-mono)", color: "var(--kc-ink-muted)" }}>{selected.chords}</span>
            </div>
            <Button variant="quiet" size="control" onClick={() => onSaveVideo(selected.id, null)} style={{ alignSelf: "flex-start", marginTop: "auto" }}>Use a different video</Button>
          </>
        ) : selected ? (
          <>
            <p style={{ margin: 0, fontSize: 14, color: "var(--kc-ink-muted)", lineHeight: 1.45 }}>
              No video yet for <strong style={{ color: "var(--kc-ink)", fontWeight: 500 }}>{selected.title}</strong>. Find it on YouTube, copy the link and paste it here. It is remembered for next time.
            </p>
            <Button variant="secondary" size="control" icon="open_in_new" onClick={findOnYoutube} style={{ alignSelf: "flex-start" }}>Find on YouTube</Button>
            <form onSubmit={(e) => { e.preventDefault(); save(); }} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                value={draft}
                onChange={(e) => { setDraft(e.target.value); setBad(false); }}
                placeholder="Paste the YouTube link"
                inputMode="url"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                aria-label="YouTube link"
                aria-invalid={bad || undefined}
                style={{ ...fieldStyle, borderColor: bad ? "var(--kc-clay)" : undefined }}
              />
              <Button size="control" onClick={save} disabled={!draft.trim()}>Use it</Button>
            </form>
            {bad && <span style={{ fontSize: 13, color: "var(--kc-clay)" }}>That doesn&apos;t look like a YouTube link.</span>}
            <div style={{ fontSize: 14, color: "var(--kc-ink-dim)", lineHeight: 1.45, marginTop: "auto" }}>
              Loop: <span style={{ fontFamily: "var(--kc-font-mono)", color: "var(--kc-ink-muted)" }}>{selected.chords}</span>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
