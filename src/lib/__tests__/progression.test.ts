import { describe, expect, it } from "vitest";
import { initialMapProgress, spendKeyAndAdvance, currentScale, awardBadge, hasBadge } from "../engine/progression";
import { DEFAULT_ROADMAP } from "../music/roadmap";
import { emptyStreak } from "../engine/streak";
import { defaultSettings } from "../store/app-store";
import type { Child } from "../types";
import { songsForRegion, SONGS } from "../music/songs";
import { romanToTriad, chordSymbol } from "../music/chords";
import { buildScale } from "../music/scales";

function makeChild(): Child {
  return {
    id: "k", parentId: "p", name: "Ada", avatar: "🦊", companion: { species: "clef-cat", name: "Mo", level: 1, outfit: "default" },
    skillProfile: null, xp: 0, stars: 0, keys: 1, streak: emptyStreak(), roadmapIndex: 0, scaleOverride: null, roadmap: DEFAULT_ROADMAP,
    mapProgress: initialMapProgress(DEFAULT_ROADMAP), unlocks: { songs: [], outfits: ["default"], mapThemes: ["parchment"], grooves: ["pop"], keyboardSkins: ["classic"], badges: [] },
    settings: defaultSettings(), createdAt: "", completedWeeks: [], weeklyChallenges: {},
  };
}

describe("progression", () => {
  it("initial map has first region unlocked", () => {
    const m = initialMapProgress(DEFAULT_ROADMAP);
    expect(m).toHaveLength(12);
    expect(m[0].status).toBe("unlocked");
    expect(m[1].status).toBe("locked");
  });
  it("spending a key completes the region, unlocks songs and the next region", () => {
    const c = makeChild();
    const { child, unlockedSongs, nextRegion } = spendKeyAndAdvance(c);
    expect(child.keys).toBe(0);
    expect(child.mapProgress[0].status).toBe("complete");
    expect(child.mapProgress[1].status).toBe("unlocked");
    expect(nextRegion).toBe("G-major");
    expect(unlockedSongs.length).toBeGreaterThanOrEqual(2);
    expect(unlockedSongs.length).toBeLessThanOrEqual(3);
    expect(currentScale(child)).toEqual({ key: "G", mode: "major" });
    expect(child.unlocks.grooves).toContain("pop");
    expect(child.unlocks.outfits).toContain("outfit-C-major");
    expect(hasBadge(child, "region-complete")).toBe(true);
  });
  it("does nothing without a key", () => {
    const c = { ...makeChild(), keys: 0 };
    expect(spendKeyAndAdvance(c).child).toBe(c);
  });
  it("scale override wins", () => {
    const c = { ...makeChild(), scaleOverride: { key: "F" as const, mode: "major" as const } };
    expect(currentScale(c).key).toBe("F");
  });
  it("badges", () => {
    const c = awardBadge(makeChild(), "first-session");
    expect(hasBadge(c, "first-session")).toBe(true);
    expect(hasBadge(c, "clean-scale")).toBe(false);
  });
});

describe("songs", () => {
  it("every roadmap region has at least two songs", () => {
    for (const s of DEFAULT_ROADMAP) expect(songsForRegion(`${s.key}-${s.mode}`).length).toBeGreaterThanOrEqual(2);
  });
  it("every chart symbol resolves in its own key and transposes", () => {
    for (const song of SONGS) {
      const home = buildScale({ key: song.key, mode: song.mode });
      const away = buildScale({ key: "D", mode: song.mode });
      for (const bar of song.chart) for (const sym of bar) {
        expect(romanToTriad(sym, home), `${song.id} ${sym}`).toBeDefined();
        expect(chordSymbol(romanToTriad(sym, away)!)).toBeTruthy();
      }
    }
    expect(chordSymbol(romanToTriad("V", buildScale({ key: "C", mode: "major" }))!)).toBe("G");
    expect(chordSymbol(romanToTriad("vi", buildScale({ key: "C", mode: "major" }))!)).toBe("Am");
  });
});
