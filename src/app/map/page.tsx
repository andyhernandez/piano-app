"use client";
import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/shared/app-shell";
import { useAppStore, useActiveChild } from "@/lib/store/app-store";
import { repo } from "@/lib/db/repo";
import type { Session } from "@/lib/types";
import { dateKey, weekDays as weekDaysOf, weekKey } from "@/lib/utils/date";
import { AdventureMap, type RegionView } from "@/components/map/adventure-map";
import { ProgressHeader } from "@/components/map/progress-header";
import { RegionPanel } from "@/components/map/region-panel";
import { ThemePicker } from "@/components/map/theme-picker";
import { Switch } from "@/components/ui/switch";
import { BadgeShelf } from "@/components/map/badge-shelf";
import { Wardrobe } from "@/components/map/wardrobe";
import { WeeklyChallenge, challengeFor, challengeDoneCount, CHALLENGE_TASKS } from "@/components/map/weekly-challenge";
import { MAP_THEMES, regionsNeededForTheme, themeById } from "@/components/map/themes";

export default function MapPage() {
  const child = useActiveChild();
  const updateChild = useAppStore((s) => s.updateChild);
  const allChildren = useAppStore((s) => s.children);
  const [familyMode, setFamilyMode] = React.useState(false);
  const pushCelebration = useAppStore((s) => s.pushCelebration);
  const [today] = React.useState(() => dateKey());
  const days = React.useMemo(() => weekDaysOf(today), [today]);
  const [weekSessions, setWeekSessions] = React.useState<Session[]>([]);
  const [themeId, setThemeId] = React.useState<string>("parchment");
  const [selected, setSelected] = React.useState<RegionView | null>(null);
  const [chestOpen, setChestOpen] = React.useState(false);
  const checkedUnlockFor = React.useRef<string | null>(null);

  const childId = child?.id ?? null;
  const completedRegions = child ? child.mapProgress.filter((r) => r.status === "complete").length : 0;

  // Sessions this week (weekly 5-of-7 streak).
  React.useEffect(() => {
    if (!childId) return;
    let cancelled = false;
    repo.sessionsBetween(childId, days[0], days[6]).then((s) => { if (!cancelled) setWeekSessions(s); });
    return () => { cancelled = true; };
  }, [childId, days]);

  // Remembered theme per child.
  React.useEffect(() => {
    if (!childId) return;
    let cancelled = false;
    repo.getKV<string>(`mapTheme:${childId}`).then((v) => { if (!cancelled && v) setThemeId(v); });
    return () => { cancelled = true; };
  }, [childId]);

  // Theme unlock rule: theme k unlocks once 3·k regions are complete.
  React.useEffect(() => {
    if (!child) return;
    const key = `${child.id}:${completedRegions}`;
    if (checkedUnlockFor.current === key) return;
    checkedUnlockFor.current = key;
    const missing = MAP_THEMES.filter((t, i) => i > 0 && completedRegions >= regionsNeededForTheme(i) && !child.unlocks.mapThemes.includes(t.id));
    if (!missing.length) return;
    void (async () => {
      await updateChild(child.id, (c) => ({ ...c, unlocks: { ...c.unlocks, mapThemes: Array.from(new Set([...c.unlocks.mapThemes, ...missing.map((t) => t.id)])) } }));
      for (const t of missing) pushCelebration({ kind: "unlock", title: `New map theme: ${t.name}`, detail: "Pick it from the palette on the map", emoji: t.emoji });
    })();
  }, [child, completedRegions, updateChild, pushCelebration]);

  if (!child) {
    return (
      <AppShell title="Map" wide>
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-muted-foreground">Add a player first to start the adventure.</p>
          <Button asChild><Link href="/onboarding">Get started</Link></Button>
        </div>
      </AppShell>
    );
  }

  const unlockedThemes = child.unlocks.mapThemes.length ? child.unlocks.mapThemes : ["parchment"];
  const theme = themeById(unlockedThemes.includes(themeId) ? themeId : "parchment");
  const challenge = challengeFor(child, weekKey(today));
  const chestDone = challengeDoneCount(challenge);

  const activeId = child.id;
  function chooseTheme(id: string) {
    setThemeId(id);
    void repo.setKV(`mapTheme:${activeId}`, id);
  }

  function openChest(region: RegionView) {
    if (!region.isCurrent) { setSelected(region); return; }
    setSelected(null);
    setChestOpen(true);
  }

  return (
    <AppShell title="Map" wide>
      <div className="flex flex-col gap-5">
        <ProgressHeader child={child} weekSessions={weekSessions} today={today} weekDays={days} />

        <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
          <div className="flex flex-col gap-3">
            {allChildren.length > 1 && (
              <label className="flex items-center gap-3 self-end rounded-full border-2 bg-card px-4 py-2 text-sm font-bold">
                <Switch checked={familyMode} onCheckedChange={setFamilyMode} aria-label="Show the whole family on the map" />
                Family map · see everyone&apos;s companion
              </label>
            )}
            <div className="relative">
              <ThemePicker theme={theme} unlocked={unlockedThemes} completedRegions={completedRegions} onChange={chooseTheme} />
              <AdventureMap child={child} siblings={familyMode ? allChildren.filter((c) => c.id !== child.id) : []} theme={theme} selectedRegionId={selected?.progress.regionId ?? null} onSelectRegion={setSelected} onOpenChest={openChest} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 bg-card px-4 py-3">
              <div className="text-sm">
                <span className="font-display text-lg font-semibold">Weekend chest</span>
                <span className="ml-2 text-muted-foreground">{challenge.claimed ? "Opened this week 💎" : `${chestDone} of ${CHALLENGE_TASKS.length} tasks done`}</span>
              </div>
              <Button variant="secondary" onClick={() => setChestOpen(true)}>🎁 {challenge.claimed ? "See chest" : "Open chest"}</Button>
            </div>
          </div>
          <div className="flex flex-col gap-5">
            <Wardrobe child={child} />
            <BadgeShelf child={child} />
          </div>
        </div>
      </div>

      <RegionPanel child={child} region={selected} onClose={() => setSelected(null)} onOpenChest={openChest} />
      <WeeklyChallenge child={child} open={chestOpen} onOpenChange={setChestOpen} />
    </AppShell>
  );
}
