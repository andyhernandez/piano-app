"use client";
import * as React from "react";
import { SectionLabel, Button, Icon, Small } from "@/components/ds";
import { useAppStore } from "@/lib/store/app-store";
import { repo } from "@/lib/db/repo";
import { enableSync, joinFamily, syncNow } from "@/lib/sync/engine";
import { KEYCADENCE_CLOUD, newFamilyCode, isFamilyCode } from "@/lib/sync/defaults";

const inputStyle: React.CSSProperties = { height: 44, padding: "0 12px", borderRadius: 14, background: "var(--kc-base)", border: "2px solid var(--kc-border)", color: "var(--kc-ink)", fontFamily: "var(--kc-font-mono)", fontSize: 14, outline: "none", minWidth: 0, width: "100%", boxSizing: "border-box" };

/** Sync between devices, as a rail block: the family code on a cream tile, then the actions. */
export function SyncPanel() {
  const parent = useAppStore((s) => s.parent);
  const updateParent = useAppStore((s) => s.updateParent);
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<string | null>(null);
  const [joining, setJoining] = React.useState(false);
  const [code, setCode] = React.useState("");
  const [copied, setCopied] = React.useState(false);
  const sync = parent?.sync ?? null;

  const describe = (r: { pushed: number; pulled: number; error?: string }) =>
    r.error ? (r.error === "offline" ? "Offline. It will try again when the connection is back." : `Did not finish: ${r.error}`) : `Sent ${r.pushed}, received ${r.pulled}.`;

  const turnOn = async () => {
    if (!parent) return;
    setBusy(true);
    try {
      const r = await enableSync(parent, { provider: "supabase", url: KEYCADENCE_CLOUD.url, anonKey: KEYCADENCE_CLOUD.anonKey, familyCode: newFamilyCode() });
      useAppStore.setState({ parent: (await repo.getParent(parent.id)) ?? parent });
      setResult(describe(r));
    } finally { setBusy(false); }
  };
  const join = async () => {
    if (!parent || !isFamilyCode(code)) return;
    setBusy(true);
    try {
      const r = await joinFamily(parent, code.trim(), KEYCADENCE_CLOUD);
      const fresh = await repo.firstParent();
      if (fresh) useAppStore.setState({ parent: fresh });
      await useAppStore.getState().refreshChildren();
      setResult(r.error ? describe({ pushed: 0, pulled: 0, error: r.error }) : `Joined. Received ${r.pulled} rows.`);
      setJoining(false);
    } finally { setBusy(false); }
  };
  const now = async () => {
    setBusy(true);
    try { setResult(describe(await syncNow())); } finally { setBusy(false); }
  };
  const turnOff = async () => { await updateParent({ sync: null }); setResult(null); };
  const copy = async () => {
    if (!sync) return;
    try { await navigator.clipboard.writeText(sync.familyCode); setCopied(true); window.setTimeout(() => setCopied(false), 1500); } catch { /* clipboard unavailable */ }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <SectionLabel size="title">Sync between devices</SectionLabel>
      <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--kc-base)", border: "2px solid var(--kc-hairline)", borderRadius: 16, padding: "12px 14px" }}>
        <Icon name={sync ? "cloud_done" : "cloud_off"} size={24} color={sync ? "var(--kc-mint-ink)" : "var(--kc-ink-faint)"} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: sync ? "var(--kc-font-mono)" : "var(--kc-font-display)", fontSize: 15, fontWeight: sync ? 400 : 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sync ? sync.familyCode : "Off"}</div>
          <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.4, color: "var(--kc-ink-faint)" }}>{result ?? (sync ? "Runs on its own about once a minute." : "Everything stays on this device.")}</div>
        </div>
        {sync && <button type="button" aria-label={copied ? "Copied" : "Copy the family code"} onClick={() => void copy()} style={{ background: "transparent", border: "none", padding: 4, cursor: "pointer", color: copied ? "var(--kc-mint-ink)" : "var(--kc-indigo)", display: "flex" }}><Icon name={copied ? "check" : "content_copy"} size={22} /></button>}
      </div>
      {joining ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="fam-…" aria-label="Family code" style={inputStyle} />
          <div style={{ display: "flex", gap: 8 }}>
            <Button size="pill" onClick={() => void join()} disabled={busy || !isFamilyCode(code)}>Join</Button>
            <Button size="pill" variant="quiet" onClick={() => setJoining(false)} disabled={busy}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {sync ? (
            <>
              <Button size="pill" variant="secondary" icon="sync" onClick={() => void now()} disabled={busy}>Sync now</Button>
              <Button size="pill" variant="quiet" onClick={() => void turnOff()} disabled={busy}>Turn off</Button>
            </>
          ) : (
            <>
              <Button size="pill" variant="secondary" icon="link" onClick={() => void turnOn()} disabled={busy}>Turn on sync</Button>
              <Button size="pill" variant="quiet" onClick={() => setJoining(true)} disabled={busy}>Enter a code</Button>
            </>
          )}
        </div>
      )}
      <Small>{sync ? "Enter this family code on another iPad to share the same records. Keep it private; it is the only key." : "Turn it on here, or enter the family code shown on a device that already syncs."}</Small>
    </div>
  );
}
