/** Map colour themes (§5 unlockables). Theme k (k ≥ 1) unlocks after 3·k completed regions. */
export interface MapTheme {
  id: string;
  name: string;
  emoji: string;
  /** Parchment / ground fill and its edge stroke. */
  ground: string;
  groundEdge: string;
  /** Subtle decoration ink (mountains, trees, compass). */
  decor: string;
  /** Winding path stroke. */
  path: string;
  pathShadow: string;
  /** Region blob fills by status. */
  locked: string;
  unlocked: string;
  complete: string;
  /** Outline / hand-drawn ink colour. */
  ink: string;
  /** Text on the map. */
  text: string;
  mutedText: string;
  /** Glow around the current region. */
  glow: string;
  /** Fog over locked regions. */
  fog: string;
  /** Pin colour for unlocked songs. */
  pin: string;
  /** Rhythm trail dot fills. */
  trailOn: string;
  trailOff: string;
}

export const MAP_THEMES: MapTheme[] = [
  {
    id: "parchment", name: "Parchment", emoji: "📜",
    ground: "#f3e7c9", groundEdge: "#c9a96a", decor: "#b89a63",
    path: "#8b6a3c", pathShadow: "#e0cfa5",
    locked: "#d9d2c1", unlocked: "#ffe08a", complete: "#9be7c4",
    ink: "#5b4630", text: "#3b2f1f", mutedText: "#7a6a52",
    glow: "#ffb703", fog: "#f7f2e6", pin: "#4f46e5", trailOn: "#ef476f", trailOff: "#e5d8bb",
  },
  {
    id: "night", name: "Starry Night", emoji: "🌙",
    ground: "#1b2140", groundEdge: "#3b4680", decor: "#4c5aa0",
    path: "#c7d2fe", pathShadow: "#2a3466",
    locked: "#2e355c", unlocked: "#ffd166", complete: "#34d399",
    ink: "#e0e7ff", text: "#f3f1ff", mutedText: "#a7a9c9",
    glow: "#818cf8", fog: "#242b52", pin: "#f9a8d4", trailOn: "#f472b6", trailOff: "#3b4680",
  },
  {
    id: "ocean", name: "Ocean", emoji: "🌊",
    ground: "#cfeefc", groundEdge: "#5eb6d9", decor: "#7ccae6",
    path: "#f2d9a6", pathShadow: "#a9dcf0",
    locked: "#b7d6e4", unlocked: "#ffe08a", complete: "#8de3b8",
    ink: "#1d5b7a", text: "#0f3d52", mutedText: "#3f7d99",
    glow: "#06d6a0", fog: "#e6f6fd", pin: "#ef476f", trailOn: "#0ea5e9", trailOff: "#a9dcf0",
  },
  {
    id: "candy", name: "Candy Land", emoji: "🍭",
    ground: "#ffe4f1", groundEdge: "#f58fc1", decor: "#f8a8d0",
    path: "#c084fc", pathShadow: "#fbcfe8",
    locked: "#ead6e2", unlocked: "#fff1a8", complete: "#a7f3d0",
    ink: "#7a2a5a", text: "#5a1f45", mutedText: "#a0578a",
    glow: "#f472b6", fog: "#fff0f8", pin: "#4f46e5", trailOn: "#f59e0b", trailOff: "#f5c9e0",
  },
];

export const THEME_UNLOCK_STEP = 3;

export function themeById(id: string | null | undefined): MapTheme {
  return MAP_THEMES.find((t) => t.id === id) ?? MAP_THEMES[0];
}

/** Regions needed to unlock theme at index k (0 = always available). */
export function regionsNeededForTheme(index: number): number {
  return index * THEME_UNLOCK_STEP;
}
