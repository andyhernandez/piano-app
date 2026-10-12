import * as React from "react";
import { NotationGlyph, NotationPair } from "./notation-glyph";
import { Icon } from "./icon";

export type Format = "full-notation" | "single-staff" | "letter-notes" | "lead-sheet" | "chord-chart" | "rhythm-only" | "right-hand" | "left-hand" | "by-ear" | "duet" | "backing-track" | "scale-exercise";

function Head({ left, top, color }: { left: number; top: number; color: string }) {
  return <span style={{ position: "absolute", left, top, width: 7, height: 5, borderRadius: "50%", background: color, transform: "rotate(-18deg)" }} />;
}
function LeadSheetMark({ color, dim }: { color: string; dim: string }) {
  return (
    <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
      <span style={{ display: "flex", gap: 7, fontFamily: "var(--kc-font-display)", fontSize: 13, fontWeight: 600, lineHeight: 1, color }}><span>G</span><span style={{ color: dim }}>C</span></span>
      <span style={{ position: "relative", width: 30, height: 12 }}>
        <span style={{ position: "absolute", left: 0, right: 0, top: 5, height: 1.5, background: dim }} />
        <Head left={2} top={1} color={color} /><Head left={12} top={6} color={color} /><Head left={22} top={3} color={color} />
      </span>
    </span>
  );
}
function ChordChartMark({ color, dim }: { color: string; dim: string }) {
  return <span style={{ display: "grid", gridTemplateColumns: "repeat(3, 6px)", gap: 5 }}>{[1, 0, 1, 0, 1, 0].map((on, i) => <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: on ? color : dim }} />)}</span>;
}
function RhythmMark({ color, dim }: { color: string; dim: string }) {
  return <span style={{ display: "flex", alignItems: "center", gap: 4 }}>{[1, 0, 1, 0].map((on, i) => <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: on ? color : dim }} />)}</span>;
}
function StaffMark({ color, dim, lines, heads, width }: { color: string; dim: string; lines: number[]; heads: [number, number][]; width: number }) {
  return (
    <span style={{ position: "relative", width, height: 22 }}>
      {lines.map((top) => <span key={top} style={{ position: "absolute", left: 0, right: 0, top, height: 1.5, background: dim }} />)}
      {heads.map(([l, t]) => <Head key={l} left={l} top={t} color={color} />)}
    </span>
  );
}
function WaveMark({ color }: { color: string }) {
  return <span style={{ display: "flex", alignItems: "center", gap: 2, height: 20 }}>{[30, 62, 40, 88, 54, 74, 36].map((h, i) => <span key={i} style={{ width: 3, height: h + "%", borderRadius: 999, background: color }} />)}</span>;
}

/** The format a piece is read in: a 56px rounded tile on the indigo wash, solid indigo when assigned. */
export function FormatBadge({ format, assigned = false, size = 56, style }: { format: Format; assigned?: boolean; size?: number; style?: React.CSSProperties }) {
  const color = assigned ? "#ffffff" : "var(--kc-indigo)";
  const dim = assigned ? "var(--kc-lilac)" : "var(--kc-lilac)";
  const marks: Record<Format, React.ReactNode> = {
    "full-notation": <NotationGlyph name="clef-treble" context="badge" size={30} color={color} />,
    "single-staff": <StaffMark color={color} dim={dim} width={32} lines={[4, 10, 16]} heads={[[3, 7], [13, 1], [23, 13]]} />,
    "letter-notes": <span style={{ fontFamily: "var(--kc-font-display)", fontSize: 15, fontWeight: 600, letterSpacing: "0.04em", color }}>CDE</span>,
    "lead-sheet": <LeadSheetMark color={color} dim={dim} />,
    "chord-chart": <ChordChartMark color={color} dim={dim} />,
    "rhythm-only": <RhythmMark color={color} dim={dim} />,
    "right-hand": <NotationGlyph name="clef-treble" context="badge" size={24} color={color} />,
    "left-hand": <NotationGlyph name="clef-bass" context="badge" size={24} color={color} />,
    "by-ear": <Icon name="hearing" size={26} color={color} />,
    duet: <NotationPair color={color} />,
    "backing-track": <WaveMark color={color} />,
    "scale-exercise": <StaffMark color={color} dim={dim} width={34} lines={[3, 19]} heads={[[0, 15], [8, 11], [16, 7], [24, 3]]} />,
  };
  return (
    <span style={{ flex: "none", width: size, height: size, borderRadius: "var(--kc-radius-tile)", overflow: "hidden", background: assigned ? "var(--kc-indigo)" : "var(--kc-indigo-wash)", display: "flex", alignItems: "center", justifyContent: "center", ...style }}>
      {marks[format]}
    </span>
  );
}
