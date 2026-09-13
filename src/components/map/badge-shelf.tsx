"use client";
import * as React from "react";
import { motion } from "framer-motion";
import type { BadgeId, Child } from "@/lib/types";
import { BADGE_META } from "@/lib/engine/progression";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

/** Grid of all badges: earned ones bright with a date, others greyed with what they're for. */
export function BadgeShelf({ child }: { child: Child }) {
  const earned = new Map<BadgeId, { count: number; latest: string }>();
  for (const b of child.unlocks.badges) {
    const cur = earned.get(b.id);
    earned.set(b.id, { count: (cur?.count ?? 0) + 1, latest: cur && cur.latest > b.earnedAt ? cur.latest : b.earnedAt });
  }
  const ids = Object.keys(BADGE_META) as BadgeId[];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Badge shelf</CardTitle>
        <CardDescription>{earned.size} of {ids.length} collected</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
          {ids.map((id) => {
            const meta = BADGE_META[id];
            const got = earned.get(id);
            return (
              <li key={id} className={cn("flex flex-col items-center gap-1 rounded-2xl border-2 p-3 text-center", got ? "border-secondary bg-secondary/20" : "border-border bg-muted/40 opacity-70")}>
                <motion.span className={cn("text-3xl", !got && "grayscale")} initial={false} animate={got ? { scale: [1, 1.15, 1] } : undefined} transition={{ duration: 0.6 }} aria-hidden>
                  {meta.emoji}
                </motion.span>
                <span className="font-display text-sm font-semibold leading-tight">{meta.title}{got && got.count > 1 ? ` ×${got.count}` : ""}</span>
                {got ? (
                  <span className="text-[11px] text-muted-foreground">Earned {formatDate(got.latest)}</span>
                ) : (
                  <span className="text-[11px] leading-tight text-muted-foreground">{meta.description}</span>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
