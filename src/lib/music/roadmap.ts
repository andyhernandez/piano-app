import type { ScaleId } from "../types";

/** 12-week default curriculum (§6). Weeks 11-12 are minors; natural + harmonic taught within the week. */
export const DEFAULT_ROADMAP: ScaleId[] = [
  { key: "C", mode: "major" },
  { key: "G", mode: "major" },
  { key: "D", mode: "major" },
  { key: "A", mode: "major" },
  { key: "E", mode: "major" },
  { key: "F", mode: "major" },
  { key: "Bb", mode: "major" },
  { key: "Eb", mode: "major" },
  { key: "Ab", mode: "major" },
  { key: "Db", mode: "major" },
  { key: "A", mode: "natural-minor" },
  { key: "E", mode: "natural-minor" },
];

/** Minor weeks also cover the harmonic form. */
export function companionScale(id: ScaleId): ScaleId | null {
  if (id.mode === "natural-minor") return { key: id.key, mode: "harmonic-minor" };
  return null;
}
