"use client";
import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Cloud, CloudOff, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { repo } from "@/lib/db/repo";
import { useAppStore } from "@/lib/store/app-store";
import { syncNow, syncProviderName } from "@/lib/sync/engine";

const SQL = `-- Run once in the Supabase SQL editor.
create table if not exists kc_rows (
  owner      uuid        not null,
  table_name text        not null,
  key        text        not null,
  payload    jsonb,
  deleted    boolean     not null default false,
  updated_at timestamptz not null default now(),
  primary key (owner, table_name, key)
);
alter table kc_rows enable row level security;
create policy "owner rows" on kc_rows
  for all using (auth.uid() = owner) with check (auth.uid() = owner);

-- Storage: create a private bucket named "recordings" for audio blobs.`;

/** Optional Supabase sync (§2). Local-first stays the default; this only adds a second copy for other devices. */
export function SyncPanel() {
  const parent = useAppStore((s) => s.parent);
  const updateParent = useAppStore((s) => s.updateParent);
  const [url, setUrl] = React.useState(parent?.sync?.url ?? "");
  const [anonKey, setAnonKey] = React.useState(parent?.sync?.anonKey ?? "");
  const [result, setResult] = React.useState<{ pushed: number; pulled: number; error?: string } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [showSql, setShowSql] = React.useState(false);
  const [tick, setTick] = React.useState(0);
  const pending = useLiveQuery(() => repo.outboxCount(), [tick]);
  const enabled = !!parent?.sync;
  const dirty = url.trim() !== (parent?.sync?.url ?? "") || anonKey.trim() !== (parent?.sync?.anonKey ?? "");

  const save = async () => {
    if (!url.trim() || !anonKey.trim()) return;
    await updateParent({ sync: { provider: "supabase", url: url.trim().replace(/\/$/, ""), anonKey: anonKey.trim() } });
    setResult(null);
  };
  const disable = async () => {
    await updateParent({ sync: null });
    setResult(null);
  };
  const run = async () => {
    setBusy(true);
    const r = await syncNow();
    setResult(r);
    setTick((t) => t + 1);
    setBusy(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">{enabled ? <Cloud className="h-5 w-5" /> : <CloudOff className="h-5 w-5" />} Cloud sync</CardTitle>
          <Badge variant={enabled ? "accent" : "muted"}>{enabled ? `On · ${syncProviderName()}` : "Off · this device only"}</Badge>
        </div>
        <CardDescription>
          Everything is stored on this device. Turn on sync to mirror it to your own Supabase project so another tablet, or a teacher, can see the same data. Child profiles never include an email or real name beyond what you typed.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="sb-url">Project URL</Label>
            <Input id="sb-url" type="url" placeholder="https://xyz.supabase.co" value={url} onChange={(e) => setUrl(e.target.value)} autoComplete="off" />
          </div>
          <div>
            <Label htmlFor="sb-key">Anon key</Label>
            <Input id="sb-key" type="password" placeholder="eyJhbGciOi…" value={anonKey} onChange={(e) => setAnonKey(e.target.value)} autoComplete="off" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={save} disabled={!dirty || !url.trim() || !anonKey.trim()}>{enabled ? "Update connection" : "Turn on sync"}</Button>
          {enabled && <Button variant="outline" onClick={disable}>Turn off</Button>}
          <Button variant="secondary" onClick={run} disabled={busy || !enabled}><RefreshCw className={busy ? "h-5 w-5 animate-spin" : "h-5 w-5"} /> Sync now</Button>
          <span className="text-sm text-muted-foreground">Pending changes: <b>{pending ?? "…"}</b></span>
        </div>
        {result && (
          <p className={result.error ? "rounded-2xl border-2 border-destructive/40 bg-destructive/10 p-3 text-sm" : "rounded-2xl border-2 border-accent/40 bg-accent/10 p-3 text-sm"}>
            {result.error ? <>Sync failed: {result.error}</> : <>Pushed {result.pushed} change{result.pushed === 1 ? "" : "s"}, pulled {result.pulled}.</>}
          </p>
        )}
        <div>
          <Button variant="ghost" size="sm" onClick={() => setShowSql((v) => !v)}>{showSql ? "Hide" : "Show"} the table this expects</Button>
          {showSql && (
            <pre className="mt-2 overflow-x-auto rounded-2xl border-2 bg-muted/40 p-3 text-xs leading-relaxed">{SQL}</pre>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
