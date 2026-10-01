"use client";
import * as React from "react";
import { SectionLabel, Toggle, Button, Panel, Row, Small } from "@/components/ds";
import { useAppStore } from "@/lib/store/app-store";
import { hashPin, pinValid } from "@/lib/household/pin";

const inputStyle: React.CSSProperties = { height: 46, width: 104, padding: "0 12px", borderRadius: 14, background: "var(--kc-base)", border: "2px solid var(--kc-border)", color: "var(--kc-ink)", fontFamily: "var(--kc-font-display)", fontSize: 22, fontWeight: 600, letterSpacing: "0.3em", textAlign: "center", outline: "none", boxSizing: "border-box" };

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

  return (
    <Panel style={{ padding: "16px 22px", gap: 0, minHeight: 0, overflowY: "auto" }}>
      <SectionLabel size="title">Behind the code</SectionLabel>
      <Row title="Mode and weekly target"><Toggle checked={codeFor.settings} onChange={(v) => setFor("settings", v)} label="Behind the code" disabled={!hasCode} /></Row>
      <Row title="Teacher link"><Toggle checked={codeFor.teacherLink} onChange={(v) => setFor("teacherLink", v)} label="Behind the code" disabled={!hasCode} /></Row>
      <Row title="Deleting a recording"><Toggle checked={codeFor.deleteRecording} onChange={(v) => setFor("deleteRecording", v)} label="Behind the code" disabled={!hasCode} /></Row>
      {editing ? (
        <Row title={hasCode ? "New four-digit code" : "Four-digit code"} detail={code.length === 4 && again.length === 4 && code !== again ? "Those do not match yet." : "Type it twice."}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input autoFocus inputMode="numeric" pattern="\d*" autoComplete="off" aria-label="Code" placeholder="••••" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))} style={inputStyle} />
              <input inputMode="numeric" pattern="\d*" autoComplete="off" aria-label="Code again" placeholder="••••" value={again} onChange={(e) => setAgain(e.target.value.replace(/\D/g, "").slice(0, 4))} style={inputStyle} />
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <Button size="pill" onClick={() => void save()} disabled={!ready}>Save</Button>
              <Button size="pill" variant="quiet" onClick={() => { setEditing(false); setCode(""); setAgain(""); }}>Cancel</Button>
            </div>
          </div>
        </Row>
      ) : removing ? (
        <Row title="Remove the code?" detail="Settings and the teacher link open to everyone.">
          <div style={{ display: "flex", gap: 6 }}>
            <Button size="pill" variant="secondary" onClick={() => void remove()}>Remove</Button>
            <Button size="pill" variant="quiet" onClick={() => setRemoving(false)}>Keep</Button>
          </div>
        </Row>
      ) : (
        <Row title={hasCode ? "Household code" : "No code yet"} detail={hasCode ? "Set." : "Anyone can change the settings until one is set."}>
          <div style={{ display: "flex", gap: 6 }}>
            <Button size="pill" variant="secondary" onClick={() => setEditing(true)}>{hasCode ? "Change" : "Set a code"}</Button>
            {hasCode && <Button size="pill" variant="quiet" onClick={() => setRemoving(true)}>Remove</Button>}
          </div>
        </Row>
      )}
      <Row title="Weekly digest by email" last><Toggle checked={parent.weeklyDigest} onChange={(v) => void updateParent({ weeklyDigest: v })} label="Weekly digest" /></Row>
      <Small color="var(--kc-ink-faint)" style={{ marginTop: "auto", paddingTop: 10 }}>Starting a session is never behind the code — practising is always open.</Small>
    </Panel>
  );
}
