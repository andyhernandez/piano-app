"use client";
import * as React from "react";
import { SectionLabel, FormatBadge, Button, Icon, MeterRow, Small, keyLabel } from "@/components/ds";
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

const chooser: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4, maxHeight: 176, overflowY: "auto", background: "var(--kc-base)", border: "2px solid var(--kc-border)", borderRadius: 14, padding: 6 };
const choice = (on: boolean): React.CSSProperties => ({ textAlign: "left", padding: "8px 10px", borderRadius: 10, border: "none", background: on ? "var(--kc-indigo-wash)" : "transparent", color: on ? "var(--kc-indigo)" : "var(--kc-ink)", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" });

/** An item of next week's work on the indigo wash: a tile, a title and detail, an edit control. */
function WorkRow({ badge, title, detail, action, onAction }: { badge: React.ReactNode; title: string; detail: string; action: string; onAction: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--kc-indigo-wash)", borderRadius: 18, padding: "12px 14px" }}>
      {badge}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 16, fontWeight: 600, lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
        <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.4, color: "var(--kc-ink-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{detail}</div>
      </div>
      <button type="button" aria-label={action} title={action} onClick={onAction} style={{ background: "transparent", border: "none", padding: 4, cursor: "pointer", color: "var(--kc-indigo)", display: "flex" }}><Icon name={action === "Remove" ? "close" : "edit"} size={22} /></button>
    </div>
  );
}

/** The rail of the teacher view: next week's work, the stop weights, the note on a sunshine sticky. */
export function AssignmentEditor({ child, draft, onChange, profile, showProfile }: { child: Child; draft: Draft; onChange: (d: Draft) => void; profile: SkillProfile | null; showProfile: boolean }) {
  const [pickingKey, setPickingKey] = React.useState(false);
  const [pickingSong, setPickingSong] = React.useState(false);
  const [weighing, setWeighing] = React.useState(false);
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
  const nudgeBtn = (label: string, icon: string, onClick: () => void) => (
    <button type="button" aria-label={label} onClick={onClick} style={{ width: 32, height: 32, borderRadius: 10, background: "var(--kc-panel)", border: "2px solid var(--kc-border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0, color: "var(--kc-ink)", flex: "none" }}><Icon name={icon} size={18} /></button>
  );

  return (
    <>
      {showProfile && profile && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <SectionLabel size="title">Skill profile</SectionLabel>
          <MeterRow label="Ear" value={profile.ear} tone={profile.ear < 50 ? "lilac" : "indigo"} labelWidth={64} />
          <MeterRow label="Reading" value={profile.eye} tone={profile.eye < 50 ? "lilac" : "indigo"} labelWidth={64} />
          <MeterRow label="Timing" value={profile.pulse} tone={profile.pulse < 50 ? "lilac" : "indigo"} labelWidth={64} />
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <SectionLabel>Next week’s work</SectionLabel>
        <WorkRow badge={<FormatBadge format="scale-exercise" assigned />} title={`${keyLabel(scale.key, scale.mode)} scale`} detail={draft.scaleOverride ? "Pinned for next week" : "From the roadmap · two octaves"} action={pickingKey ? "Done" : "Change the key"} onAction={() => setPickingKey((p) => !p)} />
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
          return <WorkRow key={id} badge={<FormatBadge format="full-notation" assigned />} title={song.title} detail={`Level ${song.level} · ${keyLabel(song.key, song.mode)}`} action="Remove" onAction={() => set({ songIds: draft.songIds.filter((x) => x !== id) })} />;
        })}
        {pickingSong ? (
          <div style={chooser}>
            {SONGS.filter((s) => !draft.songIds.includes(s.id)).map((s) => (
              <button key={s.id} type="button" style={choice(false)} onClick={() => { set({ songIds: [...draft.songIds, s.id] }); setPickingSong(false); }}>
                {s.title} <span style={{ color: "var(--kc-ink-faint)", fontSize: 12 }}>L{s.level} · {keyLabel(s.key, s.mode)}</span>
              </button>
            ))}
            <button type="button" style={choice(false)} onClick={() => setPickingSong(false)}>Cancel</button>
          </div>
        ) : (
          <Button variant="secondary" size="pill" icon="add" onClick={() => setPickingSong(true)} style={{ alignSelf: "flex-start" }}>Assign a piece</Button>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <SectionLabel size="title" style={{ flex: 1 }}>Stop weights</SectionLabel>
          {draft.weightsOverride && <button type="button" onClick={() => set({ weightsOverride: null })} style={{ background: "transparent", border: "none", padding: 0, fontSize: 13, fontWeight: 800, color: "var(--kc-indigo)", cursor: "pointer", fontFamily: "inherit" }}>Back to the profile</button>}
          <button type="button" onClick={() => setWeighing((w) => !w)} style={{ background: "transparent", border: "none", padding: 0, fontSize: 13, fontWeight: 800, color: "var(--kc-ink-muted)", cursor: "pointer", fontFamily: "inherit" }}>{weighing ? "Hide" : "Adjust"}</button>
        </div>
        {weighing ? BLOCK_ORDER.map((t) => (
          <div key={t} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <MeterRow label={DISCIPLINE[t].title} value={pct[t]} labelWidth={74} suffix={`${pct[t]}%`} style={{ flex: 1 }} />
            {nudgeBtn(`${DISCIPLINE[t].title}: less`, "remove", () => nudgeWeight(t, -0.03))}
            {nudgeBtn(`${DISCIPLINE[t].title}: more`, "add", () => nudgeWeight(t, 0.03))}
          </div>
        )) : (
          <Small>{draft.weightsOverride ? "Overridden for next week." : "From the skill profile. Nudge a stop and the rest shrink to fit."}</Small>
        )}
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        <SectionLabel size="title">Your note to {child.name}</SectionLabel>
        <textarea value={draft.note} onChange={(e) => set({ note: e.target.value })} rows={3} aria-label="Note to the student" placeholder="Bars 5–8 hands separately at ♩72. Left hand first!" style={{ flex: 1, minHeight: 90, resize: "none", background: "var(--kc-sun-wash)", border: "none", borderRadius: "6px 6px 20px 6px", padding: "16px 18px", fontSize: 16, fontWeight: 700, lineHeight: 1.45, color: "var(--kc-ink)", fontFamily: "var(--kc-font-sans)", outline: "none", boxSizing: "border-box" }} />
        <Small color="var(--kc-ink-faint)">Shows on Today, not as a notification. Mode, target and hard stop stay with the household.</Small>
      </div>
    </>
  );
}
