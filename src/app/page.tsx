"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Play, Sparkles } from "lucide-react";
import { AppShell } from "@/components/shared/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAppStore, useActiveChild } from "@/lib/store/app-store";
import { currentScale } from "@/lib/engine/progression";
import { scaleName } from "@/lib/music/scales";
import { dateKey, weekDays } from "@/lib/utils/date";
import { repo } from "@/lib/db/repo";
import type { Session } from "@/lib/types";
import { Companion } from "@/components/map/companion";
import { SkillRadar } from "@/components/assessment/skill-radar";
import { deriveWeights, weightsToPercent } from "@/lib/engine/weights";
import { BLOCK_LABELS, BLOCK_ORDER } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();
  const children = useAppStore((s) => s.children);
  const child = useActiveChild();
  const setActiveChild = useAppStore((s) => s.setActiveChild);
  const [weekSessions, setWeekSessions] = React.useState<Session[]>([]);

  React.useEffect(() => {
    if (!children.length) router.replace("/onboarding");
  }, [children.length, router]);

  React.useEffect(() => {
    if (!child) return;
    const days = weekDays(dateKey());
    repo.sessionsBetween(child.id, days[0], days[6]).then(setWeekSessions);
  }, [child]);

  if (!child) return null;
  const scale = currentScale(child);
  const today = dateKey();
  const doneToday = weekSessions.some((s) => s.date === today && s.completed);
  const days = weekDays(today);
  const practisedDays = new Set(weekSessions.filter((s) => s.completed).map((s) => s.date));
  const weights = child.settings.weightsOverride ?? deriveWeights(child.skillProfile);
  const pct = weightsToPercent(weights);

  return (
    <AppShell>
      <div className="grid gap-5 md:grid-cols-[1.4fr_1fr]">
        <Card className="overflow-hidden">
          <CardHeader className="flex-row items-center gap-4">
            <Companion state={child.companion} mood={doneToday ? "cheer" : "idle"} size={96} />
            <div>
              <CardDescription>Hi {child.name}!</CardDescription>
              <CardTitle className="text-3xl">{doneToday ? "Practice done for today 🎉" : "Ready to practise?"}</CardTitle>
              <p className="mt-1 text-muted-foreground">Scale of the week: <b>{scaleName(scale)}</b> · {child.settings.sessionMinutes} minutes</p>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button size="xl" className="w-full" onClick={() => router.push("/session")}>
              <Play className="h-7 w-7" /> {doneToday ? "Practise again" : "Start today's session"}
            </Button>
            <div className="flex justify-between gap-1">
              {days.map((d, i) => {
                const label = ["M", "T", "W", "T", "F", "S", "S"][i];
                const done = practisedDays.has(d);
                const frozen = child.streak.freezeDates.includes(d);
                const isToday = d === today;
                return (
                  <div key={d} className="flex flex-col items-center gap-1 text-xs font-bold text-muted-foreground">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-lg ${done ? "border-accent bg-accent/20" : frozen ? "border-sky-300 bg-sky-100" : isToday ? "border-primary" : ""}`}>
                      {done ? "🔥" : frozen ? "🧊" : ""}
                    </div>
                    {label}
                  </div>
                );
              })}
            </div>
            <p className="text-sm text-muted-foreground">
              {practisedDays.size}/{child.settings.practiceDaysPerWeek} days this week · {child.streak.freezes} streak freeze{child.streak.freezes === 1 ? "" : "s"} saved
            </p>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Skill Profile</CardTitle>
              <CardDescription>{child.skillProfile ? "Your session tilts toward what needs the most love." : "Take the 5-minute assessment to personalise your sessions."}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-3">
              {child.skillProfile ? (
                <SkillRadar profile={child.skillProfile} size={180} />
              ) : (
                <Button variant="secondary" asChild><Link href="/onboarding/assessment"><Sparkles className="h-5 w-5" /> Take the assessment</Link></Button>
              )}
              <ul className="w-full text-sm">
                {BLOCK_ORDER.map((b) => (
                  <li key={b} className="flex justify-between border-b py-1 last:border-0"><span>{BLOCK_LABELS[b]}</span><b>{pct[b]}%</b></li>
                ))}
              </ul>
            </CardContent>
          </Card>
          {children.length > 1 && (
            <Card>
              <CardHeader><CardTitle>Who is practising?</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {children.map((c) => (
                  <Button key={c.id} variant={c.id === child.id ? "default" : "outline"} onClick={() => setActiveChild(c.id)}>{c.avatar} {c.name}</Button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}
