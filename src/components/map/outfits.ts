import { DEFAULT_ROADMAP } from "@/lib/music/roadmap";
import { parseScaleSlug, scaleName, scaleSlug } from "@/lib/music/scales";
import { hashString } from "@/lib/utils/random";

/** Accessory drawn by the Companion. Each key maps to a small SVG group in companion.tsx. */
export type OutfitSvgKey = "none" | "hat" | "scarf" | "bow" | "crown" | "cape" | "headphones" | "glasses" | "star";

export interface OutfitMeta {
  id: string;
  name: string;
  /** SVG accessory key (drawn by the companion) — the "emojiOrSvgKey" of the outfit. */
  emojiOrSvgKey: OutfitSvgKey;
  /** Emoji used in pickers / celebrations. */
  emoji: string;
  /** Tint used by the accessory. */
  color: string;
}

/** Region outfits cycle through these by region index (C major → hat, G major → scarf, ...). */
const REGION_CYCLE: { key: OutfitSvgKey; name: string; emoji: string; color: string }[] = [
  { key: "hat", name: "Party Hat", emoji: "🎩", color: "#4f46e5" },
  { key: "scarf", name: "Cosy Scarf", emoji: "🧣", color: "#ef476f" },
  { key: "bow", name: "Big Bow", emoji: "🎀", color: "#f472b6" },
  { key: "crown", name: "Royal Crown", emoji: "👑", color: "#f5b301" },
];

/** Generic chest (weekly challenge) outfits. `outfit-chest-<weekKey>` picks one deterministically. */
export const CHEST_OUTFITS: Omit<OutfitMeta, "id">[] = [
  { name: "Hero Cape", emojiOrSvgKey: "cape", emoji: "🦸", color: "#ef476f" },
  { name: "Beat Headphones", emojiOrSvgKey: "headphones", emoji: "🎧", color: "#06d6a0" },
  { name: "Star Glasses", emojiOrSvgKey: "glasses", emoji: "🕶️", color: "#1f2140" },
  { name: "Gold Star", emojiOrSvgKey: "star", emoji: "⭐", color: "#f5b301" },
];

export const DEFAULT_OUTFIT: OutfitMeta = { id: "default", name: "Just me", emojiOrSvgKey: "none", emoji: "🙂", color: "#000" };

/** Static lookup for every outfit id the default roadmap and the two generic chest ids can produce. */
export const OUTFITS: Record<string, OutfitMeta> = (() => {
  const out: Record<string, OutfitMeta> = { default: DEFAULT_OUTFIT };
  DEFAULT_ROADMAP.forEach((scale, i) => {
    const id = `outfit-${scaleSlug(scale)}`;
    const c = REGION_CYCLE[i % REGION_CYCLE.length];
    out[id] = { id, name: `${scaleName(scale)} ${c.name}`, emojiOrSvgKey: c.key, emoji: c.emoji, color: shade(c.color, i) };
  });
  out["outfit-chest-cape"] = { id: "outfit-chest-cape", ...CHEST_OUTFITS[0] };
  out["outfit-chest-headphones"] = { id: "outfit-chest-headphones", ...CHEST_OUTFITS[1] };
  return out;
})();

/** Resolve any outfit id (including dynamic region/chest ids) to display metadata. */
export function outfitMeta(id: string | undefined | null): OutfitMeta {
  if (!id || id === "default") return DEFAULT_OUTFIT;
  const known = OUTFITS[id];
  if (known) return known;
  if (id.startsWith("outfit-chest-")) {
    const pick = CHEST_OUTFITS[hashString(id) % CHEST_OUTFITS.length];
    return { id, ...pick, name: `${pick.name} (${id.replace("outfit-chest-", "")})` };
  }
  if (id.startsWith("outfit-")) {
    // A region outside the default roadmap (teacher-edited). Name it after the scale, cycle the style by hash.
    const slug = id.replace("outfit-", "");
    const c = REGION_CYCLE[hashString(slug) % REGION_CYCLE.length];
    let name = slug;
    try { name = scaleName(parseScaleSlug(slug)); } catch { /* keep slug */ }
    return { id, name: `${name} ${c.name}`, emojiOrSvgKey: c.key, emoji: c.emoji, color: c.color };
  }
  return { ...DEFAULT_OUTFIT, id, name: id };
}

/** Slightly vary a hex colour per region so the same accessory type still feels new. */
function shade(hex: string, i: number): string {
  const n = parseInt(hex.slice(1), 16);
  const shift = ((i * 37) % 60) - 30;
  const r = clamp(((n >> 16) & 255) + shift);
  const g = clamp(((n >> 8) & 255) - shift / 2);
  const b = clamp((n & 255) + shift / 3);
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
}
function clamp(v: number) { return Math.max(0, Math.min(255, v)); }
