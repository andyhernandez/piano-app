"use client";
import * as React from "react";
import { ActionNote, Avatar, Button, Choice, Headline, Icon, OptionTabs, Pill, Tick, Toggle } from "@/components/ds";
import type { Child, Experience } from "@/lib/types";
import { StepActions, TextField } from "./chrome";

export interface NewPerson { name: string; ageBand: "child" | "adult"; blurb: string }

export const EXPERIENCE_OPTIONS: Experience[] = ["starting", "under-year", "one-to-three", "more-than-three", "returning"];
export const EXPERIENCE_LABELS: Record<Experience, string> = { starting: "Just starting", "under-year": "Under a year", "one-to-three": "1–3 years", "more-than-three": "More than 3", returning: "Coming back" };

const TILE: React.CSSProperties = { height: 168, borderRadius: 22, padding: "22px 24px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 10, textAlign: "left", cursor: "pointer", fontFamily: "var(--kc-font-sans)", color: "var(--kc-ink)" };
const CARD: React.CSSProperties = { background: "var(--kc-panel)", border: "2px solid var(--kc-border)", borderRadius: 22, boxShadow: "var(--kc-shadow-press)", boxSizing: "border-box" };

function profileLine(c: Child): string {
  if (c.blurb) return c.blurb;
  return c.ageBand === "adult" ? "Adult" : "Under thirteen";
}

/**
 * A1 · Who's playing. One card per profile in the household, the chosen one on the indigo wash, plus a dashed
 * "Add someone". Then how long they have played, which sets where the skill check starts, and the grown-up code.
 */
export function StepWho({ profiles, selectedId, onSelect, adding, onAdd, person, onPerson, experience, onExperience, requireCode, onRequireCode, code, onCode, hasParent, onContinue }: {
  profiles: Child[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  adding: boolean;
  onAdd: () => void;
  person: NewPerson;
  onPerson: (p: NewPerson) => void;
  experience: Experience | null;
  onExperience: (e: Experience) => void;
  requireCode: boolean;
  onRequireCode: (v: boolean) => void;
  code: string;
  onCode: (v: string) => void;
  hasParent: boolean;
  onContinue: () => void;
}) {
  const name = adding ? person.name.trim() : profiles.find((c) => c.id === selectedId)?.name ?? "";
  const codeOk = !requireCode || hasParent || /^\d{4}$/.test(code);
  const canContinue = name.length > 0 && codeOk;
  const who = name || "they";
  return (
    <div style={{ flex: 1, minHeight: 0, padding: "30px 34px", display: "flex", flexDirection: "column", gap: 22, overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 22 }}>
        <div style={{ flex: 1 }}>
          <Headline title="Who's playing?" lede="One profile per player. Everyone gets their own record, their own key and their own weekly target — the keyboard is the only thing you share." />
        </div>
        <Tick />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }}>
        {profiles.map((c) => {
          const chosen = !adding && c.id === selectedId;
          return (
            <button key={c.id} type="button" onClick={() => onSelect(c.id)} className="kc-press" style={{ ...TILE, ...(chosen ? { background: "var(--kc-indigo-wash)", border: "3px solid var(--kc-indigo)" } : CARD) }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Avatar initial={c.name.charAt(0).toUpperCase()} active={chosen} />
                <span style={{ fontFamily: "var(--kc-font-display)", fontSize: 24, fontWeight: 600 }}>{c.name}</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--kc-ink-muted)", lineHeight: 1.4 }}>{profileLine(c)}</div>
              <div style={{ marginTop: "auto" }}>
                {chosen ? <Pill tone="indigo-fill" icon="check">This profile</Pill> : <Button variant="secondary" size="pill" tabIndex={-1} style={{ pointerEvents: "none" }}>Switch to {c.name}</Button>}
              </div>
            </button>
          );
        })}
        <button type="button" onClick={onAdd} className="kc-press" style={{ ...TILE, justifyContent: "center", alignItems: "center", gap: 8, background: adding ? "var(--kc-indigo-wash)" : "transparent", border: adding ? "3px solid var(--kc-indigo)" : "3px dashed var(--kc-border-dashed)" }}>
          <Icon name="person_add" size={36} color={adding ? "var(--kc-indigo)" : "var(--kc-ink-faint)"} />
          <span style={{ fontFamily: "var(--kc-font-display)", fontSize: 19, fontWeight: 600, color: adding ? "var(--kc-ink)" : "var(--kc-ink-muted)" }}>{adding ? (person.name.trim() || "New profile") : "Add someone"}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--kc-ink-faint)", textAlign: "center", lineHeight: 1.4 }}>{adding ? "Fill in the line below" : "Takes about a minute"}</span>
        </button>
      </div>

      {adding && (
        <div style={{ ...CARD, padding: "16px 20px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <TextField label="Name" placeholder="Name" value={person.name} onChange={(v) => onPerson({ ...person, name: v })} autoFocus maxLength={24} style={{ width: 220 }} />
          <Choice options={["child", "adult"]} value={person.ageBand} onChange={(v) => onPerson({ ...person, ageBand: v })} labels={{ child: "Under thirteen", adult: "Adult" }} />
          <TextField label="One line about them" placeholder="One line, optional — “two years of lessons”" value={person.blurb} onChange={(v) => onPerson({ ...person, blurb: v })} maxLength={60} style={{ flex: 1, minWidth: 260 }} />
        </div>
      )}

      <div style={{ ...CARD, padding: "16px 20px", display: "flex", alignItems: "center", gap: 18 }}>
        <div style={{ flex: "none", width: 230 }}>
          <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 18, fontWeight: 600, lineHeight: 1.15 }}>How long has {who} played?</div>
          <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.4, color: "var(--kc-ink-faint)" }}>Sets where the skill check starts.</div>
        </div>
        <OptionTabs options={EXPERIENCE_OPTIONS} value={experience} onChange={onExperience} labels={EXPERIENCE_LABELS} />
      </div>

      <div style={{ ...CARD, padding: "20px 22px", display: "flex", alignItems: "center", gap: 20 }}>
        <span style={{ width: 52, height: 52, flex: "none", borderRadius: 16, background: "var(--kc-sun-wash)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="lock" size={28} color="var(--kc-sun-ink)" /></span>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 19, fontWeight: 600, lineHeight: 1.15 }}>A grown-up looks after settings</div>
          <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.4, color: "var(--kc-ink-muted)" }}>Mode, weekly target and the teacher link sit behind a four-digit code. Practising never does.</div>
        </div>
        {requireCode && (
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {hasParent ? [0, 1, 2, 3].map((i) => <span key={i} style={{ width: 42, height: 50, borderRadius: 12, background: "var(--kc-mint-wash)", border: "2px solid var(--kc-mint)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--kc-font-display)", fontSize: 22 }}>•</span>)
              : <TextField label="Four-digit code" placeholder="0000" mono inputMode="numeric" maxLength={4} value={code} onChange={(v) => onCode(v.replace(/\D/g, "").slice(0, 4))} style={{ width: 120, textAlign: "center", letterSpacing: "0.3em", height: 50, fontSize: 20 }} />}
          </div>
        )}
        <Toggle checked={requireCode} onChange={onRequireCode} label="Require a code for settings" />
      </div>

      <StepActions>
        <Button icon="arrow_forward" iconAfter disabled={!canContinue} onClick={onContinue}>{name ? `Continue as ${name}` : "Continue"}</Button>
        <ActionNote>{requireCode && !hasParent && !codeOk ? "Choose four digits for the code, or switch it off." : "Four steps, then you're playing."}</ActionNote>
      </StepActions>
    </div>
  );
}
