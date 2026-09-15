"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Panel, SectionLabel, Row, Button, Pill } from "@/components/ds";
import { useAppStore } from "@/lib/store/app-store";
import { repo } from "@/lib/db/repo";
import { enableSync, joinFamily, syncNow } from "@/lib/sync/engine";
import { KEYCADENCE_CLOUD, newFamilyCode, isFamilyCode } from "@/lib/sync/defaults";

const inputStyle: React.CSSProperties = { height: 40, padding: "0 14px", borderRadius: "var(--kc-radius-control)", background: "var(--kc-base)", border: "1px solid var(--kc-border-active)", color: "var(--kc-ink)", fontFamily: "var(--kc-font-mono)", fontSize: 14, outline: "none", minWidth: 0 };

/** Sync between devices, and the one destructive action on this device. */
export function SyncPanel() {
  const router = useRouter();
  const parent = useAppStore((s) => s.parent);
  const updateParent = useAppStore((s) => s.updateParent);
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<string | null>(null);
  const [joining, setJoining] = React.useState(false);
  const [code, setCode] = React.useState("");
  const [confirmDelete, setConfirmDelete] = React.useState(false);
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
  const deleteEverything = async () => {
    setBusy(true);
    await repo.nuke();
    useAppStore.setState({ parent: null, children: [], activeChildId: null, activeSession: null, plan: null, parentUnlocked: false });
    router.replace("/onboarding");
  };

  return (
    <Panel padding="panel">
      <SectionLabel>SYNC BETWEEN DEVICES</SectionLabel>
      <div>
        <Row title="Family code" detail={sync ? "Enter this code on another device to share the same records. Keep it private; it is the only key." : "Off. Everything stays on this device until you turn sync on."}>
          {sync ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontFamily: "var(--kc-font-mono)", fontSize: 14, letterSpacing: "0.04em", color: "var(--kc-ink)" }}>{sync.familyCode}</span>
              <Button size="pill" variant="quiet" icon="content_copy" onClick={() => void copy()}>{copied ? "Copied" : "Copy"}</Button>
            </div>
          ) : (
            <Button size="control" variant="secondary" icon="link" onClick={() => void turnOn()} disabled={busy}>Turn on sync</Button>
          )}
        </Row>
        <Row title="Join a household on another device" detail="Type the family code shown on the device that already syncs. This device pulls its records, then adds its own.">
          {joining ? (
            <div style={{ display: "flex", gap: 8 }}>
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="fam-…" aria-label="Family code" style={{ ...inputStyle, width: 250 }} />
              <Button size="control" onClick={() => void join()} disabled={busy || !isFamilyCode(code)}>Join</Button>
              <Button size="control" variant="quiet" onClick={() => setJoining(false)} disabled={busy}>Cancel</Button>
            </div>
          ) : (
            <Button size="control" variant="secondary" onClick={() => setJoining(true)} disabled={busy}>Enter a code</Button>
          )}
        </Row>
        <Row title="Last sync" detail={result ?? (sync ? "Runs on its own about once a minute while the app is open." : "Nothing to report while sync is off.")}>
          {sync && (
            <div style={{ display: "flex", gap: 8 }}>
              <Button size="control" variant="secondary" onClick={() => void now()} disabled={busy}>Sync now</Button>
              <Button size="control" variant="quiet" onClick={() => void turnOff()} disabled={busy}>Turn off</Button>
            </div>
          )}
          {!sync && <Pill>LOCAL ONLY</Pill>}
        </Row>
        <Row title="Delete everything on this device" detail={confirmDelete ? "Every profile, the log, recordings, the code and the sync settings. This cannot be undone; a synced copy on another device stays." : "Profiles, log, recordings and settings. Nothing is deleted from other devices."} last>
          {confirmDelete ? (
            <div style={{ display: "flex", gap: 8 }}>
              <Button size="control" variant="secondary" icon="delete" onClick={() => void deleteEverything()} disabled={busy} style={{ color: "var(--kc-clay)", borderColor: "var(--kc-clay)" }}>Yes, delete everything</Button>
              <Button size="control" variant="quiet" onClick={() => setConfirmDelete(false)} disabled={busy}>Keep it</Button>
            </div>
          ) : (
            <Button size="control" variant="quiet" onClick={() => setConfirmDelete(true)} disabled={busy}>Delete…</Button>
          )}
        </Row>
      </div>
    </Panel>
  );
}
