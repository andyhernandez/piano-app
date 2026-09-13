"use client";
import * as React from "react";
import { Flame, KeyRound, Sparkles, Star } from "lucide-react";
import type { Child, Session } from "@/lib/types";
import { xpToNextLevel } from "@/lib/engine/xp";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils/cn";

/** XP / level, stars, keys, streak (with freezes) and the weekly 5-of-7 streak. */
export function ProgressHeader({ child, weekSessions, today, weekDays }: { child: Child; weekSessions: Session[]; today: string; weekDays: string[] }) {
  const lvl = xpToNextLevel(child.xp);
  const pct = Math.round((lvl.into / lvl.need) * 100);
  const practised = new Set(weekSessions.filter((s) => s.completed).map((s) => s.date));
  const goal = child.settings.practiceDaysPerWeek;
  const labels = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <Card>
      <CardContent className="grid gap-4 p-4 md:grid-cols-[1.3fr_1fr_1fr]">
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between">
            <span className="font-display text-lg font-semibold">{child.companion.name} · Level {lvl.level}</span>
            <span className="text-sm text-muted-foreground">{lvl.into} / {lvl.need} XP</span>
          </div>
          <Progress value={pct} aria-label={`Level ${lvl.level} progress`} />
          <div className="mt-1 flex flex-wrap gap-3 text-sm font-bold">
            <span className="inline-flex items-center gap-1" title="XP"><Sparkles className="h-4 w-4 text-primary" /> {child.xp} XP</span>
            <span className="inline-flex items-center gap-1" title="Stars"><Star className="h-4 w-4 text-secondary-foreground" fill="currentColor" /> {child.stars} stars</span>
            <span className="inline-flex items-center gap-1" title="Keys"><KeyRound className="h-4 w-4 text-primary" /> {child.keys} {child.keys === 1 ? "key" : "keys"}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-muted/60 p-3">
          <Flame className={cn("h-10 w-10", child.streak.current > 0 ? "text-orange-500" : "text-muted-foreground")} fill={child.streak.current > 0 ? "currentColor" : "none"} />
          <div>
            <div className="font-display text-2xl font-semibold leading-none">{child.streak.current}-day streak</div>
            <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              Best {child.streak.best} ·
              <span aria-label={`${child.streak.freezes} streak freezes`} className="inline-flex gap-0.5">
                {Array.from({ length: 2 }, (_, i) => <span key={i} className={i < child.streak.freezes ? "" : "opacity-25 grayscale"}>🧊</span>)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1 rounded-2xl bg-muted/60 p-3">
          <div className="flex items-baseline justify-between">
            <span className="font-display text-lg font-semibold">This week</span>
            <span className="text-sm font-bold">{practised.size} of {goal}</span>
          </div>
          <div className="flex justify-between gap-1">
            {weekDays.map((d, i) => {
              const done = practised.has(d);
              const frozen = child.streak.freezeDates.includes(d);
              const isToday = d === today;
              return (
                <div key={d} className="flex flex-col items-center text-[10px] font-bold text-muted-foreground">
                  <div className={cn("flex h-7 w-7 items-center justify-center rounded-full border-2 text-sm", done ? "border-accent bg-accent/20" : frozen ? "border-sky-300 bg-sky-100" : isToday ? "border-primary" : "border-border")}>
                    {done ? "🔥" : frozen ? "🧊" : ""}
                  </div>
                  {labels[i]}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
