import type { Child, MapProgress, ScaleId, Session, BadgeId, BadgeAward } from "../types";
import { DEFAULT_ROADMAP } from "../music/roadmap";
import { scaleSlug } from "../music/scales";
import { songsForRegion } from "../music/songs";

export function currentScale(child: Child): ScaleId {
  if (child.scaleOverride) return child.scaleOverride;
  const roadmap = child.roadmap.length ? child.roadmap : DEFAULT_ROADMAP;
  return roadmap[Math.min(child.roadmapIndex, roadmap.length - 1)];
}

export function currentRegionId(child: Child): string {
  return scaleSlug(currentScale(child));
}

export function initialMapProgress(roadmap: ScaleId[]): MapProgress[] {
  return roadmap.map((s, i) => ({
    regionId: scaleSlug(s),
    status: i === 0 ? "unlocked" : "locked",
    unlockedAt: i === 0 ? new Date().toISOString() : undefined,
    rhythmTrail: 0,
    chestOpened: false,
  }));
}

export function regionProgress(child: Child, regionId: string): MapProgress | undefined {
  return child.mapProgress.find((r) => r.regionId === regionId);
}

/** Sessions completed in the current region (used for "complete region" logic). */
export function regionSessionCount(sessions: Session[], regionId: string): number {
  return sessions.filter((s) => s.completed && scaleSlug(s.scale) === regionId).length;
}

/** A region is complete when a Key was earned during it (one full practice week). */
export function canCompleteRegion(child: Child): boolean {
  return child.keys > 0;
}

/**
 * Spend a key to complete the current region and unlock the next.
 * Unlocks 2-3 songs from the finished region. Returns mutated copy.
 */
export function spendKeyAndAdvance(child: Child): { child: Child; unlockedSongs: string[]; nextRegion: string | null } {
  if (child.keys <= 0) return { child, unlockedSongs: [], nextRegion: null };
  const regionId = currentRegionId(child);
  const now = new Date().toISOString();
  const map = child.mapProgress.map((r) => (r.regionId === regionId ? { ...r, status: "complete" as const, completedAt: now } : r));
  const idx = map.findIndex((r) => r.regionId === regionId);
  let nextRegion: string | null = null;
  if (idx >= 0 && idx + 1 < map.length) {
    map[idx + 1] = { ...map[idx + 1], status: "unlocked", unlockedAt: now };
    nextRegion = map[idx + 1].regionId;
  }
  const newSongs = songsForRegion(regionId).map((s) => s.id).filter((id) => !child.unlocks.songs.includes(id)).slice(0, 3);
  const roadmap = child.roadmap.length ? child.roadmap : DEFAULT_ROADMAP;
  const next: Child = {
    ...child,
    keys: child.keys - 1,
    mapProgress: map,
    roadmapIndex: child.scaleOverride ? child.roadmapIndex : Math.min(child.roadmapIndex + 1, roadmap.length - 1),
    unlocks: {
      ...child.unlocks,
      songs: [...child.unlocks.songs, ...newSongs],
      badges: [...child.unlocks.badges, { id: "region-complete", earnedAt: now }],
      // Each region also unlocks a companion outfit and a groove.
      outfits: uniq([...child.unlocks.outfits, `outfit-${regionId}`]),
      grooves: uniq([...child.unlocks.grooves, GROOVE_UNLOCK_ORDER[idx % GROOVE_UNLOCK_ORDER.length]]),
    },
  };
  return { child: next, unlockedSongs: newSongs, nextRegion };
}

const GROOVE_UNLOCK_ORDER = ["pop", "waltz", "blues", "lofi"];

export function hasBadge(child: Child, id: BadgeId): boolean {
  return child.unlocks.badges.some((b) => b.id === id);
}

export function awardBadge(child: Child, id: BadgeId, sessionId?: string): Child {
  const award: BadgeAward = { id, earnedAt: new Date().toISOString(), sessionId };
  return { ...child, unlocks: { ...child.unlocks, badges: [...child.unlocks.badges, award] } };
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export const BADGE_META: Record<BadgeId, { title: string; description: string; emoji: string; stars: number }> = {
  "clean-scale": { title: "Clean Scale", description: "Played the scale of the week with the metronome, every note right and even.", emoji: "🎹", stars: 1 },
  "steady-pulse": { title: "Steady Pulse", description: "Tapped a whole rhythm within the timing window.", emoji: "🥁", stars: 1 },
  "no-stop-reading": { title: "No-Stop Reading", description: "Kept going through a whole sight-reading exercise without stopping.", emoji: "👀", stars: 1 },
  "chord-detective": { title: "Chord Detective", description: "Heard a chord, named it, and found it on the staff.", emoji: "🔎", stars: 1 },
  "first-session": { title: "First Session", description: "Finished your very first practice session.", emoji: "🌱", stars: 0 },
  "week-complete": { title: "Full Week", description: "Practised every planned day this week.", emoji: "🗝️", stars: 0 },
  "region-complete": { title: "Region Explorer", description: "Finished a region on the map.", emoji: "🗺️", stars: 0 },
  improviser: { title: "Improviser", description: "Saved an improvisation to My Songs.", emoji: "🎶", stars: 0 },
  "weekly-challenge": { title: "Chest Opener", description: "Completed the weekly bonus challenge.", emoji: "💎", stars: 0 },
  "assessment-complete": { title: "Skill Profile", description: "Completed the skill assessment.", emoji: "📊", stars: 0 },
};
