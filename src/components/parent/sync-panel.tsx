"use client";
import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Check, Cloud, CloudOff, Copy, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { repo } from "@/lib/db/repo";
import { useAppStore } from "@/lib/store/app-store";
import { enableSync, joinFamily, syncNow } from "@/lib/sync/engine";
import { KEYCADENCE_CLOUD, isFamilyCode, newFamilyCode } from "@/lib/sync/defaults";

/**
 * Optional cloud sync (§2). Local-first stays the default; this mirrors the household's data to the
 * KeyCadence cloud (or your own Supabase project) so another tablet, or a teacher, sees the same thing.
 * Access is scoped by a secret family code: enter it on another device to join the same family.
 */
export function SyncPanel() {
  const parent = useAppStore((s) => s.parent);
  const updateParent = useAppStore((s) => s.updateParent);
  const refreshChildren = useAppStore((s) => s.refreshChildren);
  const boot = useAppStore((s) => s.boot);
  const [result, setResult] = React.useState<{ pushed?: number; pulled: number; error?: string } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [joinCode, setJoinCode] = React.useState("");
  const [advanced, setAdvanced] = React.useState(false);
  const [url, setUrl] = React.useState(parent?.sync?.url ?? KEYCADENCE_CLOUD.url);
  const [anonKey, setAnonKey] = React.useState(parent?.sync?.anonKey ?? KEYCADENCE_CLOUD.anonKey);
  const [tick, setTick] = React.useState(0);
  const pending = useLiveQuery(() => repo.outboxCount(), [tick]);
  const enabled = !!parent?.sync;
  const usingKeyCadenceCloud = parent?.sync?.url === KEYCADENCE_CLOUD.url;

  const turnOn = async () => {
    if (!parent) return;
    setBusy(true);
    const r = await enableSync(parent, { provider: "supabase", url: url.trim().replace(/\/$/, ""), anonKey: anonKey.trim(), familyCode: parent.sync?.familyCode ?? newFamilyCode() });
    await boot();
    setResult(r);
    setTick((t) => t + 1);
    setBusy(false);
  };
  const turnOff = async () => {
    await updateParent({ sync: null });
    setResult(null);
  };
  const run = async () => {
    setBusy(true);
    const r = await syncNow();
    setResult(r);
    setTick((t) => t + 1);
    await refreshChildren();
    setBusy(false);
  };
  const join = async () => {
    if (!parent || !isFamilyCode(joinCode)) return;
    setBusy(true);
    const r = await joinFamily(parent, joinCode.trim(), { url: url.trim().replace(/\/$/, ""), anonKey: anonKey.trim() });
    setResult(r);
    setJoinCode("");
    // The parent record may have been adopted from the cloud; reload app state.
    await boot();
    setTick((t) => t + 1);
    setBusy(false);
  };
  const copy = async () => {
    if (!parent?.sync) return;
    try { await navigator.clipboard.writeText(parent.sync.familyCode); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard unavailable */ }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">{enabled ? <Cloud className="h-5 w-5" /> : <CloudOff className="h-5 w-5" />} Cloud sync</CardTitle>
          <Badge variant={enabled ? "accent" : "muted"}>{enabled ? (usingKeyCadenceCloud ? "On · KeyCadence cloud" : "On · your Supabase") : "Off · this device only"}</Badge>
        </div>
        <CardDescription>
          Everything is stored on this device. Turn on sync to keep a copy in the cloud so another tablet, or a teacher, sees the same sessions and settings. Your family&apos;s data is locked behind a secret family code; nobody without it can read a thing.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!enabled && (
          <div className="flex flex-col gap-3 rounded-2xl border-2 bg-muted/40 p-4">
            <div className="font-bold">Start syncing this family</div>
            <p className="text-sm text-muted-foreground">Creates a new family code for this household and uploads what&apos;s on this device.</p>
            <Button onClick={turnOn} disabled={busy}><Cloud className="h-5 w-5" /> Turn on sync</Button>
          </div>
        )}

        {enabled && parent?.sync && (
          <div className="flex flex-col gap-2 rounded-2xl border-2 bg-muted/40 p-4">
            <Label>Your family code</Label>
            <div className="flex flex-wrap items-center gap-2">
              <code className="rounded-xl bg-card px-3 py-2 font-mono text-base font-bold tracking-wide">{parent.sync.familyCode}</code>
              <Button variant="outline" size="sm" onClick={copy}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy"}</Button>
            </div>
            <p className="text-sm text-muted-foreground">Type this into <b>Grown-ups → Account → Join a family</b> on another device to share everything. Treat it like a password.</p>
          </div>
        )}

        <div className="flex flex-col gap-2 rounded-2xl border-2 p-4">
          <Label htmlFor="join-code">Join a family from another device</Label>
          <div className="flex flex-wrap gap-2">
            <Input id="join-code" placeholder="fam-…" value={joinCode} onChange={(e) => setJoinCode(e.target.value.trim().toLowerCase())} autoComplete="off" className="max-w-sm font-mono" />
            <Button variant="secondary" onClick={join} disabled={busy || !isFamilyCode(joinCode)}>Join</Button>
          </div>
          <p className="text-sm text-muted-foreground">Pulls that family&apos;s children, sessions and settings onto this device. Anything already here is kept and merged.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={run} disabled={busy || !enabled}><RefreshCw className={busy ? "h-5 w-5 animate-spin" : "h-5 w-5"} /> Sync now</Button>
          {enabled && <Button variant="outline" onClick={turnOff} disabled={busy}>Turn off</Button>}
          <span className="text-sm text-muted-foreground">Pending changes: <b>{pending ?? "…"}</b></span>
        </div>
        {result && (
          <p className={result.error ? "rounded-2xl border-2 border-destructive/40 bg-destructive/10 p-3 text-sm" : "rounded-2xl border-2 border-accent/40 bg-accent/10 p-3 text-sm"}>
            {result.error ? <>Sync failed: {result.error}</> : <>Pushed {result.pushed ?? 0} change{result.pushed === 1 ? "" : "s"}, pulled {result.pulled}.</>}
          </p>
        )}

        <div>
          <Button variant="ghost" size="sm" onClick={() => setAdvanced((v) => !v)}>{advanced ? "Hide" : "Use my own Supabase project"}</Button>
          {advanced && (
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="sb-url">Project URL</Label>
                <Input id="sb-url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} autoComplete="off" />
              </div>
              <div>
                <Label htmlFor="sb-key">Publishable (anon) key</Label>
                <Input id="sb-key" type="password" value={anonKey} onChange={(e) => setAnonKey(e.target.value)} autoComplete="off" />
              </div>
              <p className="text-xs text-muted-foreground sm:col-span-2">Apply <code>supabase/migrations</code> from the repo to your project first. Changing these then turning sync on (or joining) points this device at that project.</p>
              {enabled && <Button variant="outline" onClick={turnOn} disabled={busy}>Update connection</Button>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
