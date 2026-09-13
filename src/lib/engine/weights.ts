import type { BlockType, BlockWeights, SkillProfile } from "../types";
import { BLOCK_ORDER } from "../types";

/** Baseline weights for a balanced profile (sum 1). */
export const BASE_WEIGHTS: BlockWeights = {
  scales: 0.2,
  rhythm: 0.15,
  reading: 0.2,
  theory: 0.15,
  repertoire: 0.2,
  improv: 0.1,
};

/** Minimum share any block keeps so a session always touches every skill. */
const FLOOR = 0.08;

/**
 * Derive block weights from a Skill Profile (§3). Weak skills get more time.
 * ear -> theory, eye -> reading, pulse -> rhythm. Scales and repertoire hold steady, improv is the release valve.
 */
export function deriveWeights(profile: SkillProfile | null): BlockWeights {
  if (!profile) return { ...BASE_WEIGHTS };
  // Weakness 0..1 where 1 = score 0.
  const weak = { ear: (100 - profile.ear) / 100, eye: (100 - profile.eye) / 100, pulse: (100 - profile.pulse) / 100 };
  const raw: BlockWeights = {
    scales: 0.15,
    rhythm: 0.1 + 0.25 * weak.pulse,
    reading: 0.1 + 0.3 * weak.eye,
    theory: 0.1 + 0.25 * weak.ear,
    repertoire: 0.15,
    improv: 0.1,
  };
  return normalize(raw);
}

export function normalize(w: BlockWeights): BlockWeights {
  const clamped: BlockWeights = { ...w };
  for (const b of BLOCK_ORDER) clamped[b] = Math.max(FLOOR, clamped[b]);
  const total = BLOCK_ORDER.reduce((s, b) => s + clamped[b], 0);
  const out = { ...clamped };
  for (const b of BLOCK_ORDER) out[b] = clamped[b] / total;
  return out;
}

/** Convert weights into whole seconds per block, guaranteeing the total equals sessionMinutes*60. */
export function blockDurations(weights: BlockWeights, sessionMinutes: number): Record<BlockType, number> {
  const total = sessionMinutes * 60;
  const out = {} as Record<BlockType, number>;
  let acc = 0;
  BLOCK_ORDER.forEach((b, i) => {
    if (i === BLOCK_ORDER.length - 1) out[b] = total - acc;
    else {
      out[b] = Math.round(weights[b] * total);
      acc += out[b];
    }
  });
  return out;
}

export function weightsToPercent(w: BlockWeights): Record<BlockType, number> {
  const out = {} as Record<BlockType, number>;
  for (const b of BLOCK_ORDER) out[b] = Math.round(w[b] * 100);
  return out;
}
