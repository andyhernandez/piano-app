"use client";
import * as React from "react";
import { SectionLabel, Toggle, Button } from "@/components/ds";
import { useAppStore } from "@/lib/store/app-store";
import { hashPin, pinValid } from "@/lib/household/pin";

const inputStyle: React.CSSProperties = { height: 40, width: 96, padding: "0 12px", borderRadius: "var(--kc-radius-control)", background: "var(--kc-base)", border: "1px solid var(--kc-border-active)", color: "var(--kc-ink)", fontFamily: "var(--kc-font-mono)", fontSize: 18, letterSpacing: "0.3em", textAlign: "center", outline: "none" };

/** What the code protects, the code itself, and the weekly digest. */
export function CodePanel() {
  const parent = useAppStore((s) => s.parent);
  const updateParent = useAppStore((s) => s.updateParent);
  const setParentUnlocked = useAppStore((s) => s.setParentUnlocked);
  const [editing, setEditing] = React.useState(false);
  const [code, setCode] = React.useState("");
  const [again, setAgain] = React.useState("");
  const [removing, setRemoving] = React.useState(false);
  if (!parent) return null;
  const codeFor = parent.codeFor ?? { settings: true, teacherLink: true, deleteRecording: true };
  const setFor = (key: keyof typeof codeFor, v: boolean) => void updateParent({ codeFor: { ...codeFor, [key]: v } });
  const hasCode = !!parent.pin;
  const ready = pinValid(code) && code === again;

  const save = async () => {
    if (!ready) return;
    await updateParent({ pin: hashPin(code) });
    setParentUnlocked(true);
    setEditing(false); setCode(""); setAgain("");
  };
  const remove = async () => {
    await updateParent({ pin: null });
    setRemoving(false);
  };

  const row = (label: string, control: React.ReactNode, dim?: boolean) => (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <span style={{ flex: 1, fontSize: 15, color: dim ? "var(--kc-ink-dim)" : "var(--kc-ink)" }}>{label}</span>
      {control}
    </div>
  );

  return (
    <div style={{ background: "var(--kc-panel)", border: "1px solid var(--kc-border)", borderRadius: "var(--kc-radius-panel)", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14, minHeight: 0 }}>
      <SectionLabel>BEHIND THE CODE</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {row("Mode and weekly target", <Toggle checked={codeFor.settings} onChange={(v) => setFor("settings", v)} label="Behind the code" disabled={!hasCode} />)}
        {row("Teacher link", <Toggle checked={codeFor.teacherLink} onChange={(v) => setFor("teacherLink", v)} label="Behind the code" disabled={!hasCode} />)}
        {row("Deleting a recording", <Toggle checked={codeFor.deleteRecording} onChange={(v) => setFor("deleteRecording", v)} label="Behind the code" disabled={!hasCode} />)}
        {row("Starting a session", <Toggle checked={false} label="Behind the code" disabled />, true)}
      </div>
      <div style={{ borderTop: "1px solid var(--kc-border)", paddingTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
        {editing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <SectionLabel size="meta">{hasCode ? "NEW FOUR-DIGIT CODE" : "FOUR-DIGIT CODE"}</SectionLabel>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input autoFocus inputMode="numeric" pattern="\d*" autoComplete="off" aria-label="Code" placeholder="••••" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))} style={inputStyle} />
              <input inputMode="numeric" pattern="\d*" autoComplete="off" aria-label="Code again" placeholder="••••" value={again} onChange={(e) => setAgain(e.target.value.replace(/\D/g, "").slice(0, 4))} style={inputStyle} />
              <Button size="control" onClick={() => void save()} disabled={!ready}>Save</Button>
              <Button size="control" variant="quiet" onClick={() => { setEditing(false); setCode(""); setAgain(""); }}>Cancel</Button>
            </div>
            {code.length === 4 && again.length === 4 && code !== again && <span style={{ fontSize: 13, color: "var(--kc-clay)" }}>Those do not match yet.</span>}
          </div>
        ) : removing ? (
          row("Remove the code? Settings and the teacher link open to everyone.", <div style={{ display: "flex", gap: 8 }}><Button size="control" variant="secondary" onClick={() => void remove()} style={{ color: "var(--kc-clay)", borderColor: "var(--kc-clay)" }}>Remove</Button><Button size="control" variant="quiet" onClick={() => setRemoving(false)}>Keep</Button></div>)
        ) : (
          row(hasCode ? "Household code · set" : "No code yet", <div style={{ display: "flex", gap: 8 }}><Button size="control" variant="secondary" onClick={() => setEditing(true)}>{hasCode ? "Change" : "Set a code"}</Button>{hasCode && <Button size="control" variant="quiet" onClick={() => setRemoving(true)}>Remove</Button>}</div>)
        )}
        {row("Weekly digest by email", <Toggle checked={parent.weeklyDigest} onChange={(v) => void updateParent({ weeklyDigest: v })} label="Weekly digest" />)}
      </div>
      <p style={{ margin: "auto 0 0", fontSize: 14, lineHeight: 1.45, color: "var(--kc-ink-faint)" }}>Practising is never behind a code. That is the one row that cannot be switched on.</p>
    </div>
  );
}
