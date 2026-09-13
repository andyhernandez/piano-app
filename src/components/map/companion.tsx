"use client";
import * as React from "react";
import { motion } from "framer-motion";
import type { CompanionState } from "@/lib/types";
import { outfitMeta, type OutfitSvgKey } from "./outfits";

export type CompanionMood = "idle" | "cheer" | "wave" | "sleep" | "think";

/**
 * The kid's musical companion (§5). Four species, five moods, cosmetic outfits.
 * Pure SVG + framer-motion; deliberately no sad/sick states — no guilt mechanics.
 */
export function Companion({ state, mood = "idle", size = 96 }: { state: CompanionState; mood?: CompanionMood; size?: number }) {
  const outfit = outfitMeta(state.outfit);
  const eyesClosed = mood === "sleep";
  const waving = mood === "wave";
  const tilt = mood === "think" ? -9 : 0;
  const bodyAnim =
    mood === "cheer"
      ? { y: [0, -12, 0], scaleX: [1, 0.96, 1], scaleY: [1, 1.05, 1], rotate: tilt }
      : mood === "sleep"
        ? { y: [0, 1.5, 0], scaleY: [1, 1.03, 1], rotate: tilt }
        : { y: [0, -2.5, 0], scaleY: [1, 1.025, 1], rotate: tilt };
  const bodyTransition =
    mood === "cheer"
      ? { duration: 0.55, repeat: Infinity, ease: "easeInOut" as const }
      : mood === "sleep"
        ? { duration: 3.6, repeat: Infinity, ease: "easeInOut" as const }
        : { duration: 2.4, repeat: Infinity, ease: "easeInOut" as const };

  const speciesLabel = SPECIES_LABEL[state.species];
  return (
    <div style={{ width: size, height: size }} className="relative select-none" role="img" aria-label={`${state.name} the ${speciesLabel}, ${MOOD_LABEL[mood]}`}>
      <svg viewBox="0 0 100 100" width={size} height={size} className="overflow-visible">
        {mood === "cheer" && <Sparkles />}
        <ellipse cx={50} cy={93} rx={22} ry={3.5} fill="rgba(0,0,0,0.12)" />
        <motion.g animate={bodyAnim} transition={bodyTransition} style={{ originX: 0.5, originY: 1 }}>
          <Creature species={state.species} eyesClosed={eyesClosed} waving={waving} outfit={outfit.emojiOrSvgKey} outfitColor={outfit.color} />
        </motion.g>
        {mood === "sleep" && <Zeds />}
        {mood === "think" && <QuestionMark />}
      </svg>
      {size >= 96 && (
        <div className="absolute -bottom-1 -right-1 rounded-full border-2 border-card bg-primary px-2 py-0.5 text-[11px] font-bold leading-tight text-primary-foreground shadow" aria-label={`Level ${state.level}`}>
          Lv {state.level}
        </div>
      )}
    </div>
  );
}

const SPECIES_LABEL: Record<CompanionState["species"], string> = {
  "note-sprite": "note sprite",
  "metronome-mouse": "metronome mouse",
  "clef-cat": "clef cat",
  "drum-dragon": "drum dragon",
};
const MOOD_LABEL: Record<CompanionMood, string> = { idle: "relaxing", cheer: "cheering", wave: "waving", sleep: "napping", think: "thinking" };

// ---------------------------------------------------------------------------------------------
// Species
// ---------------------------------------------------------------------------------------------

interface CreatureProps {
  species: CompanionState["species"];
  eyesClosed: boolean;
  waving: boolean;
  outfit: OutfitSvgKey;
  outfitColor: string;
}

/** Anchor points (in the 100×100 box) where accessories attach for each species. */
interface Anchors { headTop: [number, number]; neck: [number, number]; headSide: [number, number]; eyes: [number, number]; chest: [number, number]; back: [number, number]; headWidth: number }

function Creature(props: CreatureProps) {
  switch (props.species) {
    case "note-sprite": return <NoteSprite {...props} />;
    case "metronome-mouse": return <MetronomeMouse {...props} />;
    case "clef-cat": return <ClefCat {...props} />;
    case "drum-dragon": return <DrumDragon {...props} />;
  }
}

const INK = "#2b2d42";

function Eyes({ cx, cy, gap, closed, r = 3.2 }: { cx: number; cy: number; gap: number; closed: boolean; r?: number }) {
  if (closed) {
    return (
      <g stroke={INK} strokeWidth={2.2} strokeLinecap="round" fill="none">
        <path d={`M${cx - gap - r} ${cy} q${r} ${r * 0.9} ${r * 2} 0`} />
        <path d={`M${cx + gap - r} ${cy} q${r} ${r * 0.9} ${r * 2} 0`} />
      </g>
    );
  }
  return (
    <g>
      <circle cx={cx - gap} cy={cy} r={r} fill={INK} />
      <circle cx={cx + gap} cy={cy} r={r} fill={INK} />
      <circle cx={cx - gap + 1} cy={cy - 1} r={r * 0.35} fill="#fff" />
      <circle cx={cx + gap + 1} cy={cy - 1} r={r * 0.35} fill="#fff" />
    </g>
  );
}

function Smile({ cx, cy, w = 8 }: { cx: number; cy: number; w?: number }) {
  return <path d={`M${cx - w / 2} ${cy} q${w / 2} ${w * 0.6} ${w} 0`} stroke={INK} strokeWidth={2} strokeLinecap="round" fill="none" />;
}

function Cheeks({ cx, cy, gap }: { cx: number; cy: number; gap: number }) {
  return (
    <g fill="#ff8fab" opacity={0.6}>
      <circle cx={cx - gap} cy={cy} r={2.6} />
      <circle cx={cx + gap} cy={cy} r={2.6} />
    </g>
  );
}

/** A limb that pivots at `pivot` and waves when asked. */
function Limb({ pivot, d, stroke, width, waving, amplitude = 28, children }: { pivot: [number, number]; d: string; stroke: string; width: number; waving: boolean; amplitude?: number; children?: React.ReactNode }) {
  return (
    <g transform={`translate(${pivot[0]} ${pivot[1]})`}>
      <motion.g
        animate={waving ? { rotate: [0, amplitude, -amplitude * 0.4, amplitude, 0] } : { rotate: 0 }}
        transition={waving ? { duration: 1.1, repeat: Infinity, ease: "easeInOut" } : { duration: 0.3 }}
        style={{ originX: "0px", originY: "0px", transformBox: "view-box" }}
      >
        <path d={d} stroke={stroke} strokeWidth={width} strokeLinecap="round" fill="none" />
        {children}
      </motion.g>
    </g>
  );
}

// --- Note sprite ------------------------------------------------------------------------------
function NoteSprite({ eyesClosed, waving, outfit, outfitColor }: CreatureProps) {
  const body = "#6366f1";
  const anchors: Anchors = { headTop: [50, 44], neck: [50, 74], headSide: [31, 52], eyes: [50, 60], chest: [50, 70], back: [50, 60], headWidth: 40 };
  return (
    <g>
      <Outfit kind={outfit} color={outfitColor} anchors={anchors} layer="back" />
      {/* stem + flag */}
      <path d="M70 62 L70 16" stroke={INK} strokeWidth={4} strokeLinecap="round" />
      <path d="M70 16 q16 6 10 22 q-2 -10 -10 -10 Z" fill={INK} />
      {/* arms */}
      <Limb pivot={[31, 66]} d="M0 0 L-10 12" stroke={INK} width={3.5} waving={false} />
      <Limb pivot={[69, 68]} d="M0 0 L12 -12" stroke={INK} width={3.5} waving={waving} amplitude={35}>
        <circle cx={12} cy={-12} r={3} fill={body} stroke={INK} strokeWidth={1.5} />
      </Limb>
      {/* note head body */}
      <ellipse cx={50} cy={63} rx={22} ry={20} fill={body} stroke={INK} strokeWidth={2.5} />
      <ellipse cx={42} cy={54} rx={7} ry={4} fill="#a5b4fc" opacity={0.7} />
      <Eyes cx={50} cy={60} gap={7.5} closed={eyesClosed} />
      <Cheeks cx={50} cy={67} gap={12} />
      <Smile cx={50} cy={68} w={9} />
      {/* feet */}
      <ellipse cx={41} cy={87} rx={6} ry={3.5} fill={INK} />
      <ellipse cx={59} cy={87} rx={6} ry={3.5} fill={INK} />
      <Outfit kind={outfit} color={outfitColor} anchors={anchors} layer="front" />
    </g>
  );
}

// --- Metronome mouse ---------------------------------------------------------------------------
function MetronomeMouse({ eyesClosed, waving, outfit, outfitColor }: CreatureProps) {
  const fur = "#c8b6a6";
  const anchors: Anchors = { headTop: [50, 11], neck: [50, 42], headSide: [36, 20], eyes: [50, 27], chest: [50, 58], back: [50, 60], headWidth: 30 };
  return (
    <g>
      <Outfit kind={outfit} color={outfitColor} anchors={anchors} layer="back" />
      {/* tail */}
      <Limb pivot={[68, 86]} d="M0 0 q12 -2 14 -12 q2 -8 -4 -10" stroke={fur} width={3} waving={waving} amplitude={20} />
      {/* metronome body */}
      <path d="M31 90 L69 90 L61 42 L39 42 Z" fill="#8d5a3b" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
      <path d="M43 50 L57 50 L59 84 L41 84 Z" fill="#f7e9d7" stroke={INK} strokeWidth={1.5} />
      {/* pendulum */}
      <g transform="translate(50 84)">
        <motion.g animate={{ rotate: [-16, 16, -16] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }} style={{ originX: "0px", originY: "0px", transformBox: "view-box" }}>
          <path d="M0 0 L0 -30" stroke={INK} strokeWidth={2} strokeLinecap="round" />
          <rect x={-4} y={-24} width={8} height={6} rx={1.5} fill="#ffd166" stroke={INK} strokeWidth={1.2} />
        </motion.g>
      </g>
      {/* arms */}
      <Limb pivot={[38, 56]} d="M0 0 L-9 9" stroke={fur} width={3.5} waving={false} />
      <Limb pivot={[62, 56]} d="M0 0 L9 -9" stroke={fur} width={3.5} waving={waving} amplitude={35} />
      {/* head */}
      <circle cx={37} cy={15} r={7} fill={fur} stroke={INK} strokeWidth={2} />
      <circle cx={63} cy={15} r={7} fill={fur} stroke={INK} strokeWidth={2} />
      <circle cx={37} cy={15} r={3.5} fill="#ffb3c6" />
      <circle cx={63} cy={15} r={3.5} fill="#ffb3c6" />
      <circle cx={50} cy={27} r={15} fill={fur} stroke={INK} strokeWidth={2.5} />
      <Eyes cx={50} cy={25} gap={6} closed={eyesClosed} r={2.8} />
      <ellipse cx={50} cy={32} rx={2.6} ry={2} fill="#f06292" />
      <g stroke={INK} strokeWidth={1.2} strokeLinecap="round">
        <path d="M46 33 L37 31" /><path d="M46 34 L38 36" />
        <path d="M54 33 L63 31" /><path d="M54 34 L62 36" />
      </g>
      <Outfit kind={outfit} color={outfitColor} anchors={anchors} layer="front" />
    </g>
  );
}

// --- Clef cat ----------------------------------------------------------------------------------
function ClefCat({ eyesClosed, waving, outfit, outfitColor }: CreatureProps) {
  const fur = "#f4a261";
  const anchors: Anchors = { headTop: [50, 23], neck: [50, 55], headSide: [34, 30], eyes: [50, 39], chest: [50, 70], back: [50, 66], headWidth: 34 };
  return (
    <g>
      <Outfit kind={outfit} color={outfitColor} anchors={anchors} layer="back" />
      {/* tail */}
      <Limb pivot={[68, 80]} d="M0 0 q14 -4 12 -16 q-1 -6 -6 -6" stroke={fur} width={4.5} waving={waving} amplitude={18} />
      {/* body */}
      <ellipse cx={50} cy={70} rx={20} ry={18} fill={fur} stroke={INK} strokeWidth={2.5} />
      <ellipse cx={50} cy={74} rx={11} ry={11} fill="#fde2c8" />
      {/* treble clef mark on belly */}
      <path d="M50 66 q-5 4 -1 8 q4 2 5 -2 q1 -5 -4 -3 q-3 2 0 5" stroke="#b5651d" strokeWidth={1.6} fill="none" strokeLinecap="round" />
      {/* arms */}
      <Limb pivot={[33, 66]} d="M0 0 L-8 10" stroke={fur} width={4} waving={false} />
      <Limb pivot={[67, 66]} d="M0 0 L9 -10" stroke={fur} width={4} waving={waving} amplitude={35} />
      {/* head + ears */}
      <path d="M34 30 L37 14 L48 26 Z" fill={fur} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      <path d="M66 30 L63 14 L52 26 Z" fill={fur} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      <circle cx={50} cy={40} r={17} fill={fur} stroke={INK} strokeWidth={2.5} />
      <path d="M40 27 l3 6 M50 24 l0 6 M60 27 l-3 6" stroke="#d17b3f" strokeWidth={2} strokeLinecap="round" />
      <Eyes cx={50} cy={39} gap={6.5} closed={eyesClosed} r={3} />
      <path d="M48 45 L52 45 L50 47.5 Z" fill="#f06292" />
      <path d="M50 47.5 q-3 4 -6 1 M50 47.5 q3 4 6 1" stroke={INK} strokeWidth={1.6} fill="none" strokeLinecap="round" />
      <g stroke={INK} strokeWidth={1.2} strokeLinecap="round">
        <path d="M42 45 L32 43" /><path d="M42 47 L33 49" />
        <path d="M58 45 L68 43" /><path d="M58 47 L67 49" />
      </g>
      {/* paws */}
      <ellipse cx={42} cy={88} rx={6} ry={3.5} fill={fur} stroke={INK} strokeWidth={1.5} />
      <ellipse cx={58} cy={88} rx={6} ry={3.5} fill={fur} stroke={INK} strokeWidth={1.5} />
      <Outfit kind={outfit} color={outfitColor} anchors={anchors} layer="front" />
    </g>
  );
}

// --- Drum dragon -------------------------------------------------------------------------------
function DrumDragon({ eyesClosed, waving, outfit, outfitColor }: CreatureProps) {
  const skin = "#2dd4a3";
  const anchors: Anchors = { headTop: [50, 19], neck: [50, 52], headSide: [34, 28], eyes: [50, 36], chest: [50, 70], back: [50, 62], headWidth: 36 };
  return (
    <g>
      <Outfit kind={outfit} color={outfitColor} anchors={anchors} layer="back" />
      {/* wings */}
      <path d="M30 60 q-14 -14 -10 -26 q8 8 14 12 Z" fill="#14b8a6" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      <path d="M70 60 q14 -14 10 -26 q-8 8 -14 12 Z" fill="#14b8a6" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      {/* tail */}
      <Limb pivot={[70, 82]} d="M0 0 q14 0 16 -12" stroke={skin} width={5} waving={false}>
        <path d="M14 -16 L20 -8 L11 -8 Z" fill="#ef476f" stroke={INK} strokeWidth={1.5} strokeLinejoin="round" />
      </Limb>
      {/* body */}
      <ellipse cx={50} cy={68} rx={23} ry={21} fill={skin} stroke={INK} strokeWidth={2.5} />
      {/* drum belly */}
      <ellipse cx={50} cy={74} rx={13} ry={9} fill="#ef476f" stroke={INK} strokeWidth={1.8} />
      <ellipse cx={50} cy={70} rx={13} ry={5} fill="#fde68a" stroke={INK} strokeWidth={1.5} />
      <path d="M37 74 L37 80 M63 74 L63 80 M41 79 q9 6 18 0" stroke={INK} strokeWidth={1.4} fill="none" />
      {/* arms + drumsticks */}
      <Limb pivot={[31, 62]} d="M0 0 L-8 8" stroke={skin} width={4} waving={false}>
        <path d="M-8 8 L-4 -6" stroke="#8d5a3b" strokeWidth={2.2} strokeLinecap="round" />
      </Limb>
      <Limb pivot={[69, 62]} d="M0 0 L8 -8" stroke={skin} width={4} waving={waving} amplitude={40}>
        <path d="M8 -8 L14 -20" stroke="#8d5a3b" strokeWidth={2.2} strokeLinecap="round" />
        <circle cx={14} cy={-20} r={2.2} fill="#fde68a" stroke={INK} strokeWidth={1} />
      </Limb>
      {/* head, horns, snout */}
      <path d="M40 22 L36 10 L46 18 Z" fill="#fde68a" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      <path d="M60 22 L64 10 L54 18 Z" fill="#fde68a" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      <circle cx={50} cy={36} r={17} fill={skin} stroke={INK} strokeWidth={2.5} />
      <ellipse cx={50} cy={44} rx={10} ry={6} fill="#a7f3d0" stroke={INK} strokeWidth={1.5} />
      <circle cx={46.5} cy={43} r={1.4} fill={INK} />
      <circle cx={53.5} cy={43} r={1.4} fill={INK} />
      <Eyes cx={50} cy={35} gap={7} closed={eyesClosed} r={3.2} />
      <Smile cx={50} cy={48.5} w={8} />
      {/* feet */}
      <ellipse cx={40} cy={89} rx={7} ry={3.8} fill={skin} stroke={INK} strokeWidth={1.5} />
      <ellipse cx={60} cy={89} rx={7} ry={3.8} fill={skin} stroke={INK} strokeWidth={1.5} />
      <Outfit kind={outfit} color={outfitColor} anchors={anchors} layer="front" />
    </g>
  );
}

// ---------------------------------------------------------------------------------------------
// Outfits (accessories)
// ---------------------------------------------------------------------------------------------

function Outfit({ kind, color, anchors, layer }: { kind: OutfitSvgKey; color: string; anchors: Anchors; layer: "back" | "front" }) {
  if (kind === "none") return null;
  if (layer === "back") {
    if (kind !== "cape") return null;
    const [x, y] = anchors.back;
    return (
      <motion.path
        d={`M${x - 20} ${y - 6} q20 -6 40 0 L${x + 26} ${y + 30} q-26 -8 -52 0 Z`}
        fill={color} stroke={INK} strokeWidth={2} strokeLinejoin="round" opacity={0.95}
        animate={{ skewX: [0, 4, 0, -3, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        style={{ originX: 0.5, originY: 0 }}
      />
    );
  }
  switch (kind) {
    case "hat": {
      const [x, y] = anchors.headTop;
      return (
        <g transform={`translate(${x} ${y})`}>
          <path d="M-11 2 L0 -24 L11 2 Z" fill={color} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
          <path d="M-11 2 q11 4 22 0" stroke={INK} strokeWidth={2} fill="none" />
          <circle cx={-3} cy={-8} r={1.8} fill="#fff" opacity={0.8} /><circle cx={4} cy={-14} r={1.5} fill="#fff" opacity={0.8} />
          <circle cx={0} cy={-24} r={3.5} fill="#ffd166" stroke={INK} strokeWidth={1.5} />
        </g>
      );
    }
    case "crown": {
      const [x, y] = anchors.headTop;
      return (
        <g transform={`translate(${x} ${y})`}>
          <path d="M-12 2 L-12 -12 L-6 -5 L0 -15 L6 -5 L12 -12 L12 2 Z" fill={color} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
          <circle cx={-12} cy={-12} r={2} fill="#ef476f" /><circle cx={0} cy={-15} r={2} fill="#06d6a0" /><circle cx={12} cy={-12} r={2} fill="#ef476f" />
        </g>
      );
    }
    case "bow": {
      const [x, y] = anchors.headSide;
      return (
        <g transform={`translate(${x} ${y}) rotate(-15)`}>
          <path d="M0 0 L-10 -6 L-10 6 Z" fill={color} stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
          <path d="M0 0 L10 -6 L10 6 Z" fill={color} stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
          <circle cx={0} cy={0} r={2.6} fill={color} stroke={INK} strokeWidth={1.5} />
        </g>
      );
    }
    case "scarf": {
      const [x, y] = anchors.neck;
      const w = anchors.headWidth * 0.55;
      return (
        <g transform={`translate(${x} ${y})`}>
          <path d={`M${-w} -3 q${w} 5 ${w * 2} 0 L${w} 4 q${-w} 5 ${-w * 2} 0 Z`} fill={color} stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
          <motion.path d={`M${w * 0.4} 3 L${w * 0.6} 16 L${w * 0.95} 14 L${w * 0.75} 3 Z`} fill={color} stroke={INK} strokeWidth={1.8} strokeLinejoin="round"
            animate={{ rotate: [0, 6, 0] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }} style={{ originX: 0.5, originY: 0 }} />
          <path d={`M${-w * 0.5} 0 l0 4 M${-w * 0.2} 1 l0 4 M${w * 0.15} 1 l0 4`} stroke="#fff" strokeWidth={1.4} opacity={0.8} />
        </g>
      );
    }
    case "headphones": {
      const [x, y] = anchors.eyes;
      const w = anchors.headWidth / 2;
      return (
        <g transform={`translate(${x} ${y - 6})`}>
          <path d={`M${-w - 1} 6 q0 ${-w - 6} ${w + 1} ${-w - 6} q${w + 1} 0 ${w + 1} ${w + 6}`} stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round" />
          <rect x={-w - 5} y={2} width={8} height={12} rx={3} fill={color} stroke={INK} strokeWidth={1.8} />
          <rect x={w - 3} y={2} width={8} height={12} rx={3} fill={color} stroke={INK} strokeWidth={1.8} />
        </g>
      );
    }
    case "glasses": {
      const [x, y] = anchors.eyes;
      return (
        <g transform={`translate(${x} ${y})`}>
          <path d="M-13 -1 L-14 -4 L14 -4 L13 -1 Z" fill={color} />
          <path d="M-13 -1 L-13 5 Q-7 8 -1 4 L-1 -1 Z" fill={color} opacity={0.9} />
          <path d="M13 -1 L13 5 Q7 8 1 4 L1 -1 Z" fill={color} opacity={0.9} />
          <path d="M-10 0 l3 -1" stroke="#fff" strokeWidth={1.2} opacity={0.7} /><path d="M4 0 l3 -1" stroke="#fff" strokeWidth={1.2} opacity={0.7} />
        </g>
      );
    }
    case "star": {
      const [x, y] = anchors.chest;
      return (
        <motion.g transform={`translate(${x - 10} ${y - 4})`} animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1.8, repeat: Infinity }} style={{ originX: 0.5, originY: 0.5 }}>
          <path d={starPath(0, 0, 5, 2.2)} fill={color} stroke={INK} strokeWidth={1.2} strokeLinejoin="round" />
        </motion.g>
      );
    }
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------------------------
// Mood effects
// ---------------------------------------------------------------------------------------------

const SPARKLE_SPOTS: [number, number, number][] = [[14, 30, 0], [86, 26, 0.25], [20, 72, 0.5], [88, 68, 0.15], [50, 6, 0.4], [30, 12, 0.7], [74, 10, 0.85]];

function Sparkles() {
  return (
    <g>
      {SPARKLE_SPOTS.map(([x, y, delay], i) => (
        <motion.path
          key={i}
          d={starPath(x, y, 5, 2)}
          fill={i % 2 ? "#ffd166" : "#06d6a0"}
          animate={{ opacity: [0, 1, 0], scale: [0.4, 1.2, 0.4], rotate: [0, 40, 0] }}
          transition={{ duration: 1.1, repeat: Infinity, delay, ease: "easeInOut" }}
          style={{ originX: 0.5, originY: 0.5 }}
        />
      ))}
    </g>
  );
}

function Zeds() {
  return (
    <g fontFamily="var(--font-display), system-ui, sans-serif" fontWeight={700} fill={INK}>
      {[0, 1, 2].map((i) => (
        <motion.text
          key={i}
          x={72}
          y={30}
          fontSize={10 + i * 3}
          animate={{ opacity: [0, 0.9, 0], x: [72, 80 + i * 3, 90 + i * 4], y: [30, 18 - i * 4, 6 - i * 4] }}
          transition={{ duration: 2.8, repeat: Infinity, delay: i * 0.9, ease: "easeOut" }}
        >
          z
        </motion.text>
      ))}
    </g>
  );
}

function QuestionMark() {
  return (
    <motion.g animate={{ y: [0, -4, 0], rotate: [-6, 6, -6] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }} style={{ originX: 0.5, originY: 1 }}>
      <circle cx={82} cy={18} r={10} fill="#fff" stroke={INK} strokeWidth={2} />
      <text x={82} y={23} textAnchor="middle" fontSize={15} fontWeight={800} fill="#4f46e5" fontFamily="var(--font-display), system-ui, sans-serif">?</text>
    </motion.g>
  );
}

/** Five-point star path centred on (cx, cy). */
export function starPath(cx: number, cy: number, outer: number, inner: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(cx + Math.cos(a) * r).toFixed(2)} ${(cy + Math.sin(a) * r).toFixed(2)}`);
  }
  return `M${pts.join(" L")} Z`;
}
