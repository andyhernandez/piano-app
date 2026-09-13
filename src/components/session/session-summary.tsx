"use client";
import { Home, Map } from "lucide-react";
import type { Child, Session } from "@/lib/types";
import { BLOCK_ORDER } from "@/lib/types";
import { BLOCK_DEFS } from "./block-props";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Companion } from "@/components/map/companion";
import { formatDuration } from "@/lib/utils/date";
import { BADGE_META } from "@/lib/engine/progression";

export function SessionSummary({ session, child, onHome, onMap }: { session: Session; child: Child; onHome: () => void; onMap: () => void }) {
  const completed = session.blocks.filter((b) => b.completed).length;
  const badges = session.blocks.map((b) => b.midiScore?.badge).filter(Boolean) as NonNullable<Session["blocks"][number]["midiScore"]>["badge"][];
  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="items-center text-center">
        <Companion state={child.companion} mood="cheer" size={140} />
        <CardTitle className="text-3xl">{session.completed ? "Done for today!" : "Nice work today"}</CardTitle>
        <CardDescription>{completed} of {BLOCK_ORDER.length} blocks · {formatDuration(session.durationSec)} · +{session.xpEarned} XP{session.starsEarned ? ` · +${session.starsEarned} ✨` : ""}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {BLOCK_ORDER.map((b) => {
            const r = session.blocks.find((x) => x.type === b);
            return (
              <li key={b} className={`rounded-2xl border-2 p-3 ${r?.completed ? "border-accent bg-accent/10" : "opacity-60"}`}>
                <div className="text-2xl">{BLOCK_DEFS[b].emoji}</div>
                <div className="text-sm font-bold leading-tight">{BLOCK_DEFS[b].title}</div>
                <div className="text-xs text-muted-foreground">{r?.completed ? `${formatDuration(r.durationSec)}${r.midiScore ? ` · ${r.midiScore.score}/100` : ""}` : r?.skipped ? "Skipped" : "—"}</div>
              </li>
            );
          })}
        </ul>
        {badges.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {badges.map((id, i) => id && <span key={i} className="rounded-full bg-secondary px-3 py-1 text-sm font-bold">{BADGE_META[id].emoji} {BADGE_META[id].title}</span>)}
          </div>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button size="lg" className="flex-1" onClick={onMap}><Map className="h-5 w-5" /> See the map</Button>
          <Button size="lg" variant="outline" className="flex-1" onClick={onHome}><Home className="h-5 w-5" /> Home</Button>
        </div>
      </CardContent>
    </Card>
  );
}
