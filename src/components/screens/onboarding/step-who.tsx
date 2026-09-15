"use client";
import * as React from "react";
import { Button, Choice, Headline, Icon, Pill, SectionLabel, Toggle } from "@/components/ds";
import type { Child } from "@/lib/types";
import { StepActions, TextField } from "./chrome";

export interface NewPerson { name: string; ageBand: "child" | "adult"; blurb: string }

const TILE: React.CSSProperties = { borderRadius: 11, padding: "24px 26px", height: 196, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 12, textAlign: "left", cursor: "pointer", fontFamily: "var(--kc-font-sans)", color: "var(--kc-ink)" };

function profileLine(c: Child): string {
  if (c.blurb) return c.blurb;
  return c.ageBand === "adult" ? "Adult" : "Under thirteen";
}

/**
 * A1 · Who is playing. One tile per profile in the household, the chosen one in mint, plus "Add someone".
 * On a first run there is nobody yet, so the new-profile fields are open from the start.
 */
export function StepWho({ profiles, selectedId, onSelect, adding, onAdd, person, onPerson, requireCode, onRequireCode, code, onCode, hasParent, onContinue }: {
  profiles: Child[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  adding: boolean;
  onAdd: () => void;
  person: NewPerson;
  onPerson: (p: NewPerson) => void;
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
  return (
    <div style={{ flex: 1, minHeight: 0, padding: 38, display: "flex", flexDirection: "column", gap: 32, overflowY: "auto" }}>
      <Headline title="Who's playing?" lede="One profile per player. Everyone gets their own record, their own key and their own weekly target — the keyboard is the only thing you share." />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14 }}>
        {profiles.map((c) => {
          const chosen = !adding && c.id === selectedId;
          return (
            <button key={c.id} type="button" onClick={() => onSelect(c.id)} style={{ ...TILE, background: chosen ? "var(--kc-mint-wash)" : "var(--kc-panel)", border: chosen ? "1.5px solid var(--kc-mint)" : "1px solid var(--kc-border)" }}>
              <div style={{ fontSize: 22, fontWeight: 600 }}>{c.name}</div>
              <div style={{ fontSize: 15, color: "var(--kc-ink-muted)", lineHeight: 1.4 }}>{profileLine(c)}</div>
              <div style={{ marginTop: "auto" }}>
                {chosen ? <Pill tone="mint" icon="check">This profile</Pill> : <Button variant="secondary" size="control" tabIndex={-1} style={{ pointerEvents: "none" }}>Switch to {c.name}</Button>}
              </div>
            </button>
          );
        })}
        <button type="button" onClick={onAdd} style={{ ...TILE, justifyContent: "center", alignItems: "center", gap: 10, background: adding ? "var(--kc-mint-wash)" : "transparent", border: adding ? "1.5px solid var(--kc-mint)" : "1px dashed var(--kc-border-dashed)" }}>
          <Icon name="person_add" size={34} color={adding ? "var(--kc-mint)" : "var(--kc-ink-faint)"} />
          <div style={{ fontSize: 17, fontWeight: 600, color: adding ? "var(--kc-ink)" : "var(--kc-ink-muted)" }}>{adding ? (person.name.trim() || "New profile") : "Add someone"}</div>
          <div style={{ fontSize: 14, color: adding ? "var(--kc-ink-muted)" : "var(--kc-ink-faint)", textAlign: "center", lineHeight: 1.4 }}>{adding ? "Fill in the line below" : "Takes about a minute"}</div>
        </button>
      </div>

      {adding && (
        <div style={{ background: "var(--kc-panel)", border: "1px solid var(--kc-border)", borderRadius: 11, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
          <SectionLabel>New profile</SectionLabel>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <TextField label="Name" placeholder="Name" value={person.name} onChange={(v) => onPerson({ ...person, name: v })} autoFocus maxLength={24} style={{ width: 220 }} />
            <Choice options={["child", "adult"]} value={person.ageBand} onChange={(v) => onPerson({ ...person, ageBand: v })} labels={{ child: "Under thirteen", adult: "Adult" }} />
            <TextField label="One line about them" placeholder="One line, optional — “two years of lessons”" value={person.blurb} onChange={(v) => onPerson({ ...person, blurb: v })} maxLength={60} style={{ flex: 1, minWidth: 260 }} />
          </div>
        </div>
      )}

      <div style={{ background: "var(--kc-panel)", border: "1px solid var(--kc-border)", borderRadius: 11, padding: "20px 22px", display: "flex", alignItems: "center", gap: 22 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 600 }}>A grown-up looks after settings</div>
          <div style={{ fontSize: 14, color: "var(--kc-ink-dim)", lineHeight: 1.4 }}>Mode, weekly target and the teacher link sit behind a four-digit code. Practicing never does.</div>
        </div>
        {requireCode && !hasParent && (
          <TextField label="Four-digit code" placeholder="0000" mono inputMode="numeric" maxLength={4} value={code} onChange={(v) => onCode(v.replace(/\D/g, "").slice(0, 4))} style={{ width: 96, textAlign: "center", letterSpacing: "0.2em" }} />
        )}
        <Toggle checked={requireCode} onChange={onRequireCode} label="Require a code for settings" />
      </div>

      <StepActions>
        <Button icon="arrow_forward" disabled={!canContinue} onClick={onContinue}>{name ? `Continue as ${name}` : "Continue"}</Button>
        <span style={{ fontSize: 14, color: "var(--kc-ink-dim)" }}>{requireCode && !hasParent && !codeOk ? "Choose four digits for the code, or switch it off." : "Four steps, then you're playing."}</span>
      </StepActions>
    </div>
  );
}
