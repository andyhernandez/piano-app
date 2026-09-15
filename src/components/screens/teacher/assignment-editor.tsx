"use client";
import * as React from "react";
import { SectionLabel, FormatBadge, Button, IconButton, MeterRow, keyLabel } from "@/components/ds";
import type { Assignment, BlockType, BlockWeights, Child, ScaleId, SkillProfile } from "@/lib/types";
import { BLOCK_ORDER } from "@/lib/types";
import { SONGS, songById } from "@/lib/music/songs";
import { DEFAULT_ROADMAP } from "@/lib/music/roadmap";
import { currentScale } from "@/lib/engine/progression";
import { deriveWeights, normalize, weightsToPercent } from "@/lib/engine/weights";
import { DISCIPLINE } from "@/lib/engine/record";
import { newId } from "@/lib/utils/id";

export interface Draft {
  note: string;
  scaleOverride: ScaleId | null;
  songIds: string[];
  weightsOverride: BlockWeights | null;
}

const SCALE_OPTIONS: ScaleId[] = [...DEFAULT_ROADMAP, { key: "A", mode: "harmonic-minor" }, { key: "E", mode: "harmonic-minor" }];
const same = (a: ScaleId | null, b: ScaleId | null) => !!a && !!b && a.key === b.key && a.mode === b.mode;

export function draftFrom(a: Assignment | null): Draft {
  return { note: a?.note ?? "", scaleOverride: a?.scaleOverride ?? null, songIds: a?.songIds ?? [], weightsOverride: a?.weightsOverride ?? null };
}

export function assignmentFrom(draft: Draft, existing: Assignment | null, childId: string, teacherId: string): Assignment {
  return { id: existing?.id ?? newId("asg"), childId, teacherId, roadmapOverride: existing?.roadmapOverride ?? null, ...draft, updatedAt: new Date().toISOString() };
}

const card: React.CSSProperties = { background: "var(--kc-mint-wash)", border: "1px solid var(--kc-mint-edge)", borderRadius: "var(--kc-radius-panel)", padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 };
const chooser: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4, maxHeight: 176, overflowY: "auto", background: "var(--kc-base)", border: "1px solid var(--kc-border)", borderRadius: 10, padding: 6 };
const choice = (on: boolean): React.CSSProperties => ({ textAlign: "left", padding: "8px 10px", borderRadius: 7, border: "none", background: on ? "var(--kc-raised)" : "transparent", color: on ? "var(--kc-mint)" : "var(--kc-ink)", fontSize: 14, cursor: "pointer", fontFamily: "inherit" });

/** The rail of the teacher view: pinned key, suggested pieces, block weights, the note. */
export function AssignmentEditor({ child, draft, onChange, profile, showProfile }: { child: Child; draft: Draft; onChange: (d: Draft) => void; profile: SkillProfile | null; showProfile: boolean }) {
  const [pickingKey, setPickingKey] = React.useState(false);
  const [pickingSong, setPickingSong] = React.useState(false);
  const roadmapScale = currentScale({ ...child, scaleOverride: null });
  const scale = draft.scaleOverride ?? roadmapScale;
  const baseWeights = child.settings.weightsOverride ? normalize(child.settings.weightsOverride) : deriveWeights(child.skillProfile);
  const weights = draft.weightsOverride ? normalize(draft.weightsOverride) : baseWeights;
  const pct = weightsToPercent(weights);
  const set = (patch: Partial<Draft>) => onChange({ ...draft, ...patch });

  const nudgeWeight = (t: BlockType, delta: number) => {
    const next: BlockWeights = { ...weights };
    next[t] = Math.max(0.08, Math.min(0.6, next[t] + delta));
    set({ weightsOverride: normalize(next) });
  };

  return (
    <>
      {showProfile && profile && (
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <SectionLabel>SKILL PROFILE</SectionLabel>
          <MeterRow label="Ear" value={profile.ear} tone={profile.ear < 50 ? "clay" : "mint"} labelWidth={58} />
          <MeterRow label="Reading" value={profile.eye} tone={profile.eye < 50 ? "clay" : "mint"} labelWidth={58} />
          <MeterRow label="Timing" value={profile.pulse} tone={profile.pulse < 50 ? "clay" : "mint"} labelWidth={58} />
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, borderTop: showProfile && profile ? "1px solid var(--kc-border)" : undefined, paddingTop: showProfile && profile ? 22 : 0 }}>
        <SectionLabel>NEXT WEEK&apos;S WORK</SectionLabel>
        <div style={card}>
          <FormatBadge format="scale-exercise" assigned size={40} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{keyLabel(scale.key, scale.mode)} scale</div>
            <div style={{ fontSize: 14, color: "var(--kc-ink-dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{draft.scaleOverride ? "Pinned for next week" : "From the roadmap"}</div>
          </div>
          <Button variant="quiet" size="pill" onClick={() => setPickingKey((p) => !p)}>{pickingKey ? "Done" : "Change"}</Button>
        </div>
        {pickingKey && (
          <div style={chooser}>
            <button type="button" style={choice(!draft.scaleOverride)} onClick={() => { set({ scaleOverride: null }); setPickingKey(false); }}>Follow the roadmap ({keyLabel(roadmapScale.key, roadmapScale.mode)})</button>
            {SCALE_OPTIONS.map((s) => (
              <button key={`${s.key}-${s.mode}`} type="button" style={choice(same(draft.scaleOverride, s))} onClick={() => { set({ scaleOverride: s }); setPickingKey(false); }}>{keyLabel(s.key, s.mode)}</button>
            ))}
          </div>
        )}
        {draft.songIds.map((id) => {
          const song = songById(id);
          if (!song) return null;
          return (
            <div key={id} style={card}>
              <FormatBadge format="lead-sheet" assigned size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{song.title}</div>
                <div style={{ fontSize: 14, color: "var(--kc-ink-dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Level {song.level} · {keyLabel(song.key, song.mode)}</div>
              </div>
              <Button variant="quiet" size="pill" onClick={() => set({ songIds: draft.songIds.filter((x) => x !== id) })}>Remove</Button>
            </div>
          );
        })}
        {pickingSong ? (
          <div style={chooser}>
            {SONGS.filter((s) => !draft.songIds.includes(s.id)).map((s) => (
              <button key={s.id} type="button" style={choice(false)} onClick={() => { set({ songIds: [...draft.songIds, s.id] }); setPickingSong(false); }}>
                {s.title} <span style={{ color: "var(--kc-ink-faint)", fontFamily: "var(--kc-font-mono)", fontSize: 11 }}>L{s.level} · {keyLabel(s.key, s.mode)}</span>
              </button>
            ))}
            <button type="button" style={choice(false)} onClick={() => setPickingSong(false)}>Cancel</button>
          </div>
        ) : (
          <Button variant="secondary" size="control" icon="add" onClick={() => setPickingSong(true)} style={{ alignSelf: "flex-start" }}>Suggest a piece</Button>
        )}
      </div>
      <div style={{ borderTop: "1px solid var(--kc-border)", paddingTop: 22, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <SectionLabel style={{ flex: 1 }}>BLOCK WEIGHTS</SectionLabel>
          {draft.weightsOverride && <button type="button" onClick={() => set({ weightsOverride: null })} style={{ background: "transparent", border: "none", padding: 0, fontSize: 13, color: "var(--kc-ink-dim)", cursor: "pointer", fontFamily: "inherit" }}>Back to the profile</button>}
        </div>
        {BLOCK_ORDER.map((t) => (
          <div key={t} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <MeterRow label={DISCIPLINE[t].title} value={pct[t]} labelWidth={86} style={{ flex: 1 }} />
            <IconButton icon="remove" shape="square" size={26} label={`${DISCIPLINE[t].title}: less`} onClick={() => nudgeWeight(t, -0.03)} />
            <IconButton icon="add" shape="square" size={26} label={`${DISCIPLINE[t].title}: more`} onClick={() => nudgeWeight(t, 0.03)} />
          </div>
        ))}
        <span style={{ fontSize: 13, color: "var(--kc-ink-faint)" }}>{draft.weightsOverride ? "Overrides the skill profile until you clear it." : "From the skill profile. Nudge a block and the rest shrink to fit."}</span>
      </div>
      <div style={{ borderTop: "1px solid var(--kc-border)", paddingTop: 22, display: "flex", flexDirection: "column", gap: 12 }}>
        <SectionLabel>YOUR NOTE TO {child.name.toUpperCase()}</SectionLabel>
        <textarea value={draft.note} onChange={(e) => set({ note: e.target.value })} rows={4} aria-label="Note to the student" placeholder="Bars 5–8 hands separately at 72. Don't push the tempo until the left hand is even." style={{ minHeight: 96, resize: "vertical", background: "var(--kc-base)", border: "1.5px solid var(--kc-mint)", borderRadius: 10, padding: "16px 18px", fontSize: 15, lineHeight: 1.5, color: "var(--kc-ink)", fontFamily: "var(--kc-font-sans)", outline: "none" }} />
        <span style={{ fontSize: 14, color: "var(--kc-ink-faint)" }}>One or two sentences. They read it on the stand.</span>
      </div>
      <div style={{ marginTop: "auto", borderTop: "1px solid var(--kc-border)", paddingTop: 22, display: "flex", flexDirection: "column", gap: 10 }}>
        <SectionLabel>WHAT YOU CAN&apos;T SET</SectionLabel>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45, color: "var(--kc-ink-muted)" }}>Their mode, their weekly target and their hard stop belong to the household.</p>
      </div>
    </>
  );
}
