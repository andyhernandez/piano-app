"use client";
import * as React from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEFAULT_ROADMAP } from "@/lib/music/roadmap";
import { parseScaleSlug, scaleName, scaleSlug } from "@/lib/music/scales";
import type { MapProgress, ScaleId } from "@/lib/types";
import { TEACHER_SCALE_OPTIONS } from "@/components/parent/helpers";

/** 12-week roadmap editor (§6): one Select per week from the teacher scale list. */
export function RoadmapEditor({ value, currentIndex, onChange }: { value: ScaleId[]; currentIndex: number; onChange: (v: ScaleId[]) => void }) {
  const slugs = value.map(scaleSlug);
  const dupes = new Set(slugs.filter((s, i) => slugs.indexOf(s) !== i));
  return (
    <div className="flex flex-col gap-3">
      <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {value.map((s, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className={i === currentIndex ? "w-14 shrink-0 text-sm font-bold text-primary" : "w-14 shrink-0 text-sm font-bold text-muted-foreground"}>Wk {i + 1}</span>
            <Select value={scaleSlug(s)} onValueChange={(slug) => onChange(value.map((x, j) => (j === i ? parseScaleSlug(slug) : x)))}>
              <SelectTrigger aria-label={`Week ${i + 1} scale`} className={dupes.has(scaleSlug(s)) ? "border-secondary" : undefined}><SelectValue /></SelectTrigger>
              <SelectContent>
                {TEACHER_SCALE_OPTIONS.map((o) => <SelectItem key={scaleSlug(o)} value={scaleSlug(o)}>{scaleName(o)}</SelectItem>)}
              </SelectContent>
            </Select>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>
          Week {currentIndex + 1} is where the student is now.
          {dupes.size > 0 && <span className="text-secondary-foreground"> Some scales repeat; the map shows each region once, so repeated weeks share a region.</span>}
        </span>
        <Button variant="ghost" size="sm" onClick={() => onChange(DEFAULT_ROADMAP)}><RotateCcw className="h-4 w-4" /> Reset to default</Button>
      </div>
    </div>
  );
}

export function sameRoadmap(a: ScaleId[], b: ScaleId[]): boolean {
  return a.length === b.length && a.every((s, i) => scaleSlug(s) === scaleSlug(b[i]));
}

/** Keep the status of regions that already exist; new regions are locked unless first (or current). */
export function rebuildMapProgress(existing: MapProgress[], roadmap: ScaleId[], currentIndex: number): MapProgress[] {
  const now = new Date().toISOString();
  const seen = new Set<string>();
  const out: MapProgress[] = [];
  roadmap.forEach((s, i) => {
    const id = scaleSlug(s);
    if (seen.has(id)) return;
    seen.add(id);
    const prev = existing.find((r) => r.regionId === id);
    const unlocked = i === 0 || i === currentIndex;
    if (prev) out.push(prev.status === "locked" && unlocked ? { ...prev, status: "unlocked", unlockedAt: now } : prev);
    else out.push({ regionId: id, status: unlocked ? "unlocked" : "locked", unlockedAt: unlocked ? now : undefined, rhythmTrail: 0, chestOpened: false });
  });
  return out;
}
