"use client";
import * as React from "react";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import type { Child, MapProgress } from "@/lib/types";
import { currentRegionId } from "@/lib/engine/progression";
import { parseScaleSlug, scaleName } from "@/lib/music/scales";
import { songsForRegion } from "@/lib/music/songs";
import { seededRandom, hashString } from "@/lib/utils/random";
import { Companion, starPath } from "./companion";
import type { MapTheme } from "./themes";

export const RHYTHM_TRAIL_LENGTH = 10;

export interface RegionView {
  index: number;
  progress: MapProgress;
  name: string;
  /** Whether this is the region the companion is standing in. */
  isCurrent: boolean;
  /** Full details available (current, complete, or the very next region). Otherwise only a peek. */
  selectable: boolean;
}

/** Derive the list of regions shown on the map from a child (roadmap order). */
export function regionViews(child: Child): RegionView[] {
  const current = currentRegionId(child);
  const currentIdx = Math.max(0, child.mapProgress.findIndex((r) => r.regionId === current));
  return child.mapProgress.map((progress, index) => {
    let name = progress.regionId;
    try { name = scaleName(parseScaleSlug(progress.regionId)); } catch { /* keep slug */ }
    return { index, progress, name, isCurrent: progress.regionId === current, selectable: index <= currentIdx + 1 || progress.status !== "locked" };
  });
}

interface Pt { x: number; y: number }

const COL_W = 330;
const ROW_H = 230;
const PAD_X = 60;
const PAD_TOP = 110;
const PAD_BOTTOM = 70;

/** Snake layout: rows of `cols` regions, alternating direction, with a little deterministic wobble. */
export function layoutRegions(count: number, cols: number): { points: Pt[]; width: number; height: number } {
  const rows = Math.max(1, Math.ceil(count / cols));
  const width = PAD_X * 2 + COL_W * cols;
  const height = PAD_TOP + PAD_BOTTOM + ROW_H * (rows - 1) + 60;
  const points: Pt[] = [];
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    let col = i % cols;
    if (row % 2 === 1) col = cols - 1 - col;
    const rng = seededRandom(1000 + i * 7);
    const wobbleX = (rng() - 0.5) * 40;
    const wobbleY = (rng() - 0.5) * 36;
    points.push({ x: PAD_X + COL_W * col + COL_W / 2 + wobbleX, y: PAD_TOP + ROW_H * row + wobbleY });
  }
  return { points, width, height };
}

/** Smooth path through the points using cubic curves that bulge sideways between rows. */
function windingPath(points: Pt[]): string {
  if (!points.length) return "";
  let d = `M${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const sameRow = Math.abs(a.y - b.y) < ROW_H / 2;
    if (sameRow) {
      const midX = (a.x + b.x) / 2;
      const bulge = i % 2 ? -34 : 34;
      d += ` Q${midX} ${a.y + bulge} ${b.x} ${b.y}`;
    } else {
      const dir = b.x >= a.x ? 1 : -1;
      d += ` C${a.x + dir * 90} ${a.y + 40}, ${b.x + dir * 90} ${b.y - 40}, ${b.x} ${b.y}`;
    }
  }
  return d;
}

/** A hand-drawn blob: irregular radius around a circle, seeded so it never flickers. */
function blobPath(cx: number, cy: number, r: number, seed: number): string {
  const rng = seededRandom(seed);
  const n = 12;
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (0.92 + rng() * 0.16);
    pts.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr });
  }
  let d = "";
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += i === 0 ? `M${p1.x.toFixed(1)} ${p1.y.toFixed(1)}` : "";
    d += ` C${c1.x.toFixed(1)} ${c1.y.toFixed(1)}, ${c2.x.toFixed(1)} ${c2.y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d + " Z";
}

export interface AdventureMapProps {
  child: Child;
  theme: MapTheme;
  selectedRegionId?: string | null;
  onSelectRegion: (region: RegionView) => void;
  onOpenChest: (region: RegionView) => void;
}

/** The hand-drawn Adventure Map (§5). Pure SVG; the companion is an HTML overlay so it stays crisp. */
export function AdventureMap({ child, theme, selectedRegionId, onSelectRegion, onOpenChest }: AdventureMapProps) {
  const regions = React.useMemo(() => regionViews(child), [child]);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = React.useState(0);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setContainerWidth(e.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cols = containerWidth > 0 && containerWidth < 640 ? 2 : 3;
  const { points, width, height } = React.useMemo(() => layoutRegions(regions.length, cols), [regions.length, cols]);
  const path = React.useMemo(() => windingPath(points), [points]);
  const scale = containerWidth > 0 ? containerWidth / width : 0;
  const currentIdx = regions.findIndex((r) => r.isCurrent);
  const currentPt = currentIdx >= 0 ? points[currentIdx] : null;
  const companionSize = Math.max(56, Math.min(120, 130 * scale));

  const decorations = React.useMemo(() => decorationsFor(width, height, points), [width, height, points]);

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden rounded-3xl border-2 shadow-inner" style={{ borderColor: theme.groundEdge, background: theme.ground }}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" className="block touch-none select-none" style={{ aspectRatio: `${width} / ${height}` }} role="list" aria-label="Adventure map">
        <defs>
          <filter id="map-wobble" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves={2} seed={3} result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale={5} xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="map-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation={8} result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="map-fog" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation={10} />
          </filter>
          <pattern id="map-grain" width="6" height="6" patternUnits="userSpaceOnUse">
            <circle cx={1} cy={1} r={0.6} fill={theme.decor} opacity={0.18} />
            <circle cx={4} cy={4} r={0.5} fill={theme.decor} opacity={0.12} />
          </pattern>
        </defs>

        {/* parchment */}
        <rect x={0} y={0} width={width} height={height} fill={theme.ground} />
        <rect x={0} y={0} width={width} height={height} fill="url(#map-grain)" />
        <rect x={14} y={14} width={width - 28} height={height - 28} rx={26} fill="none" stroke={theme.groundEdge} strokeWidth={3} strokeDasharray="18 8" opacity={0.7} filter="url(#map-wobble)" />

        {/* decorations */}
        <g fill="none" stroke={theme.decor} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" opacity={0.7}>
          {decorations.mountains.map((m, i) => <path key={`m${i}`} d={`M${m.x - 30} ${m.y} L${m.x - 10} ${m.y - 34} L${m.x} ${m.y - 20} L${m.x + 12} ${m.y - 40} L${m.x + 34} ${m.y}`} />)}
          {decorations.trees.map((t, i) => (
            <g key={`t${i}`}><path d={`M${t.x} ${t.y} l0 -10`} /><path d={`M${t.x - 9} ${t.y - 8} L${t.x} ${t.y - 26} L${t.x + 9} ${t.y - 8} Z`} fill={theme.decor} opacity={0.5} /></g>
          ))}
          {decorations.waves.map((w, i) => <path key={`w${i}`} d={`M${w.x - 18} ${w.y} q9 -8 18 0 q9 8 18 0`} />)}
        </g>
        <CompassRose x={width - 70} y={height - 70} color={theme.decor} ink={theme.ink} />

        {/* path */}
        <path d={path} fill="none" stroke={theme.pathShadow} strokeWidth={22} strokeLinecap="round" strokeLinejoin="round" filter="url(#map-wobble)" opacity={0.8} />
        <path d={path} fill="none" stroke={theme.path} strokeWidth={5} strokeLinecap="round" strokeDasharray="16 12" filter="url(#map-wobble)" />

        {/* regions */}
        {regions.map((r, i) => (
          <RegionMarker
            key={r.progress.regionId}
            region={r}
            pt={points[i]}
            theme={theme}
            selected={selectedRegionId === r.progress.regionId}
            onSelect={() => onSelectRegion(r)}
            onChest={() => onOpenChest(r)}
          />
        ))}
      </svg>

      {/* Companion stands on the current region (HTML overlay so the SVG stays crisp) */}
      {currentPt && scale > 0 && (
        <motion.div
          className="pointer-events-none absolute"
          initial={false}
          animate={{ left: `${(currentPt.x / width) * 100}%`, top: `${((currentPt.y - 62) / height) * 100}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
          style={{ transform: "translate(-50%, -100%)" }}
        >
          <Companion state={child.companion} mood="idle" size={companionSize} />
        </motion.div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------

function RegionMarker({ region, pt, theme, selected, onSelect, onChest }: { region: RegionView; pt: Pt; theme: MapTheme; selected: boolean; onSelect: () => void; onChest: () => void }) {
  const { progress, name, isCurrent, index } = region;
  const status = progress.status;
  const R = 62;
  const fill = status === "complete" ? theme.complete : status === "unlocked" ? theme.unlocked : theme.locked;
  const blob = React.useMemo(() => blobPath(pt.x, pt.y, R, hashString(progress.regionId)), [pt.x, pt.y, progress.regionId]);
  const songs = songsForRegion(progress.regionId);
  const locked = status === "locked";

  return (
    <g role="listitem" aria-label={`${name}: ${status}`} className="cursor-pointer" onClick={onSelect} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(); } }} tabIndex={0}>
      {/* glow for the current region */}
      {isCurrent && (
        <motion.path d={blob} fill={theme.glow} opacity={0.5} filter="url(#map-glow)" animate={{ opacity: [0.35, 0.75, 0.35], scale: [1, 1.05, 1] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }} style={{ originX: `${pt.x}px`, originY: `${pt.y}px`, transformBox: "view-box" }} />
      )}
      {/* blob */}
      <path d={blob} fill={fill} stroke={selected ? theme.glow : theme.ink} strokeWidth={selected ? 5 : 3} strokeLinejoin="round" opacity={locked ? 0.75 : 1} />
      {/* week number */}
      <text x={pt.x - R + 14} y={pt.y - R + 26} fontSize={13} fontWeight={800} fill={theme.mutedText} fontFamily="var(--font-display), system-ui, sans-serif">{index + 1}</text>

      {/* song pins around the top of the blob */}
      {songs.map((s, i) => {
        const a = -Math.PI / 2 + (i - (songs.length - 1) / 2) * 0.55;
        const x = pt.x + Math.cos(a) * (R + 16);
        const y = pt.y + Math.sin(a) * (R + 16);
        const unlockedSong = !locked && status === "complete";
        return (
          <g key={s.id} transform={`translate(${x} ${y})`} opacity={locked ? 0.35 : 1}>
            <path d="M0 8 C-7 0 -7 -8 0 -12 C7 -8 7 0 0 8 Z" fill={unlockedSong ? theme.pin : theme.locked} stroke={theme.ink} strokeWidth={1.5} />
            <circle cx={0} cy={-4} r={3} fill={unlockedSong ? "#fff" : theme.ink} opacity={unlockedSong ? 1 : 0.4} />
          </g>
        );
      })}

      {/* centre content by status */}
      {status === "complete" && (
        <g>
          <path d={`M${pt.x - 4} ${pt.y + 8} L${pt.x - 4} ${pt.y - 34}`} stroke={theme.ink} strokeWidth={3} strokeLinecap="round" />
          <motion.path d={`M${pt.x - 3} ${pt.y - 34} L${pt.x + 26} ${pt.y - 26} L${pt.x - 3} ${pt.y - 16} Z`} fill="#ef476f" stroke={theme.ink} strokeWidth={2} strokeLinejoin="round"
            animate={{ skewY: [0, -4, 0, 4, 0] }} transition={{ duration: 2.4, repeat: Infinity }} style={{ originX: 0, originY: 0.5 }} />
          {[-16, 0, 16].map((dx, i) => <path key={i} d={starPath(pt.x + dx, pt.y + 20, 7, 3)} fill="#ffd166" stroke={theme.ink} strokeWidth={1.2} />)}
        </g>
      )}
      {locked && (
        <g>
          <ellipse cx={pt.x} cy={pt.y} rx={R + 10} ry={R - 2} fill={theme.fog} opacity={0.55} filter="url(#map-fog)" />
          <Lock x={pt.x - 16} y={pt.y - 22} width={32} height={32} color={theme.ink} strokeWidth={2.2} opacity={0.75} />
        </g>
      )}

      {/* scale name */}
      <text x={pt.x} y={pt.y + R + 44} textAnchor="middle" fontSize={20} fontWeight={700} fill={theme.text} fontFamily="var(--font-display), system-ui, sans-serif" opacity={locked ? 0.7 : 1}>{name}</text>

      {/* rhythm trail */}
      <g>
        {Array.from({ length: RHYTHM_TRAIL_LENGTH }, (_, i) => {
          const x = pt.x - ((RHYTHM_TRAIL_LENGTH - 1) * 11) / 2 + i * 11;
          const on = i < progress.rhythmTrail;
          return <circle key={i} cx={x} cy={pt.y + R + 60} r={4} fill={on ? theme.trailOn : theme.trailOff} stroke={theme.ink} strokeWidth={0.8} opacity={locked ? 0.5 : 1} />;
        })}
      </g>

      {/* chest (hidden under fog while locked) */}
      {!locked && (
        <g
          transform={`translate(${pt.x + R - 12} ${pt.y + R - 30})`}
          className="cursor-pointer"
          onClick={(e) => { e.stopPropagation(); onChest(); }}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onChest(); } }}
          role="button"
          tabIndex={0}
          aria-label={progress.chestOpened ? "Chest opened" : isCurrent ? "Weekly chest" : "Chest"}
        >
          <Chest open={progress.chestOpened} pulse={isCurrent && !progress.chestOpened} ink={theme.ink} />
        </g>
      )}
    </g>
  );
}

function Chest({ open, pulse, ink }: { open: boolean; pulse: boolean; ink: string }) {
  return (
    <motion.g animate={pulse ? { scale: [1, 1.12, 1], rotate: [0, -4, 4, 0] } : { scale: 1 }} transition={pulse ? { duration: 1.6, repeat: Infinity } : undefined} style={{ originX: 0.5, originY: 1 }}>
      <rect x={-13} y={-6} width={26} height={16} rx={3} fill="#8d5a3b" stroke={ink} strokeWidth={1.8} />
      <rect x={-3} y={-2} width={6} height={6} rx={1} fill="#ffd166" stroke={ink} strokeWidth={1} />
      {open ? (
        <g>
          <path d="M-13 -6 L-11 -18 L11 -18 L13 -6 Z" fill="#a9714b" stroke={ink} strokeWidth={1.8} transform="rotate(-25 -13 -6)" />
          <path d={starPath(0, -14, 5, 2)} fill="#06d6a0" /><path d={starPath(9, -20, 4, 1.6)} fill="#ffd166" /><path d={starPath(-8, -22, 3.5, 1.4)} fill="#f472b6" />
        </g>
      ) : (
        <path d="M-13 -6 q13 -12 26 0 Z" fill="#a9714b" stroke={ink} strokeWidth={1.8} />
      )}
    </motion.g>
  );
}

function CompassRose({ x, y, color, ink }: { x: number; y: number; color: string; ink: string }) {
  return (
    <g transform={`translate(${x} ${y})`} opacity={0.75}>
      <circle r={30} fill="none" stroke={color} strokeWidth={2} />
      <path d="M0 -28 L6 0 L0 28 L-6 0 Z" fill={color} stroke={ink} strokeWidth={1} />
      <path d="M-28 0 L0 -6 L28 0 L0 6 Z" fill={color} stroke={ink} strokeWidth={1} opacity={0.8} />
      <text y={-34} textAnchor="middle" fontSize={12} fontWeight={800} fill={ink} fontFamily="var(--font-display), system-ui, sans-serif">N</text>
    </g>
  );
}

/** Deterministic decorative doodles that avoid the region markers. */
function decorationsFor(width: number, height: number, points: Pt[]) {
  const rng = seededRandom(hashString(`${width}x${height}`));
  const far = (p: Pt) => points.every((q) => Math.hypot(p.x - q.x, p.y - q.y) > 120);
  const make = (n: number) => {
    const out: Pt[] = [];
    let tries = 0;
    while (out.length < n && tries < 200) {
      tries++;
      const p = { x: 40 + rng() * (width - 80), y: 40 + rng() * (height - 80) };
      if (far(p)) out.push(p);
    }
    return out;
  };
  return { mountains: make(4), trees: make(7), waves: make(4) };
}
