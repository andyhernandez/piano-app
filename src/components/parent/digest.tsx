"use client";
import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Copy, Mail, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { repo } from "@/lib/db/repo";
import { cloudSyncEnabled } from "@/lib/sync/engine";
import { useAppStore } from "@/lib/store/app-store";
import { BADGE_META, currentScale } from "@/lib/engine/progression";
import { scaleName } from "@/lib/music/scales";
import { BLOCK_LABELS, BLOCK_ORDER, type Child, type Session } from "@/lib/types";
import { dateKey, weekDays } from "@/lib/utils/date";
import { formatDateLong } from "./helpers";

/**
 * Weekly digest (§7, optional). There is no server in the local-first build, so the digest is rendered
 * here, copyable as text and openable as a prefilled email. Automatic sending needs cloud sync.
 */
export function DigestPanel({ child }: { child: Child }) {
  const parent = useAppStore((s) => s.parent);
  const updateParent = useAppStore((s) => s.updateParent);
  const [email, setEmail] = React.useState(parent?.email ?? "");
  const [preview, setPreview] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [today] = React.useState(() => dateKey());
  const days = React.useMemo(() => weekDays(today), [today]);
  const sessions = useLiveQuery(() => repo.sessionsBetween(child.id, days[0], days[6]), [child.id, days]);

  const digest = React.useMemo(() => buildDigest(child, sessions ?? [], days), [child, sessions, days]);
  const emailDirty = (email.trim() || null) !== (parent?.email ?? null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(digest.text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copy the digest:", digest.text);
    }
  };

  const mailto = `mailto:${encodeURIComponent(email.trim())}?subject=${encodeURIComponent(digest.subject)}&body=${encodeURIComponent(digest.text)}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly digest email</CardTitle>
        <CardDescription>{cloudSyncEnabled() ? "A short summary of the week's practice, emailed every Sunday by the weekly-digest cloud function once it is deployed (see supabase/README.md)." : "A short summary of the week's practice. Automatic sending needs cloud sync to be on (below); until then you can preview, copy or email it yourself."}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="digest-toggle">Send me a weekly digest</Label>
          <Switch id="digest-toggle" checked={!!parent?.weeklyDigest} onCheckedChange={(v) => updateParent({ weeklyDigest: v })} />
        </div>
        <div className="flex gap-2">
          <Input type="email" inputMode="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Parent email" />
          <Button variant="outline" disabled={!emailDirty} onClick={() => updateParent({ email: email.trim() || null })}>Save</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setPreview((p) => !p)}>{preview ? "Hide preview" : "Preview this week's digest"}</Button>
          <Button variant="outline" onClick={copy}>{copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />} {copied ? "Copied" : "Copy as text"}</Button>
          <Button variant="outline" asChild><a href={mailto}><Mail className="h-5 w-5" /> Open in email</a></Button>
        </div>
        {preview && (
          <div className="rounded-2xl border-2 bg-muted/40 p-4">
            <p className="font-display text-lg font-semibold">{digest.subject}</p>
            <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-relaxed">{digest.text}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function buildDigest(child: Child, sessions: Session[], days: string[]): { subject: string; text: string } {
  const completed = sessions.filter((s) => s.completed);
  const practisedDays = new Set(completed.map((s) => s.date));
  const minutes = Math.round(sessions.reduce((a, s) => a + s.durationSec / 60, 0));
  const blockCounts = BLOCK_ORDER.map((t) => ({ t, n: sessions.filter((s) => s.blocks.some((b) => b.type === t && b.completed)).length })).filter((x) => x.n > 0);
  const scores = sessions.flatMap((s) => s.blocks.filter((b) => b.midiScore).map((b) => ({ t: b.type, score: b.midiScore!.score })));
  const best = scores.length ? scores.reduce((a, b) => (b.score > a.score ? b : a)) : null;
  const weekStart = new Date(days[0]).getTime();
  const badges = child.unlocks.badges.filter((b) => new Date(b.earnedAt).getTime() >= weekStart && dateKey(new Date(b.earnedAt)) <= days[6]);
  const xp = sessions.reduce((a, s) => a + s.xpEarned, 0);

  const lines = [
    `Hi! Here's how ${child.name}'s piano week went (${formatDateLong(days[0])} – ${formatDateLong(days[6])}).`,
    "",
    `• Practice days: ${practisedDays.size} of ${child.settings.practiceDaysPerWeek} planned`,
    `• Time at the piano: ${minutes} minutes across ${sessions.length} session${sessions.length === 1 ? "" : "s"}`,
    `• Scale of the week: ${scaleName(currentScale(child))}`,
    `• Streak: ${child.streak.current} day${child.streak.current === 1 ? "" : "s"} (best ${child.streak.best}) · ${child.streak.freezes} freeze${child.streak.freezes === 1 ? "" : "s"} in hand`,
    `• XP earned: ${xp}`,
  ];
  if (blockCounts.length) lines.push("", "Blocks finished:", ...blockCounts.map((x) => `  – ${BLOCK_LABELS[x.t]}: ${x.n}×`));
  if (best) lines.push("", `Best checked score: ${best.score}/100 in ${BLOCK_LABELS[best.t]}.`);
  if (badges.length) lines.push("", "New badges:", ...badges.map((b) => `  – ${BADGE_META[b.id].emoji} ${BADGE_META[b.id].title}`));
  if (!sessions.length) lines.push("", "No sessions this week yet. A short one counts just as much as a long one.");
  lines.push("", "Sent from KeyCadence. Nothing here compares your child to anyone else — that's on purpose.");
  return { subject: `${child.name}'s piano week · ${practisedDays.size}/${child.settings.practiceDaysPerWeek} days`, text: lines.join("\n") };
}
