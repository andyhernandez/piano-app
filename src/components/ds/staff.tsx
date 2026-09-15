import * as React from "react";

/*
 * The staff, ported from the design system. Clefs, accidentals, rests, meter and repeat marks are Noto Music,
 * placed from the font's own metrics (1em = four staff spaces). Noteheads, stems, beams, ledger lines and slurs
 * are drawn, because they must be positioned and recolored per note. Given a `layout` it places notes by bar
 * and beat and draws the barlines itself.
 */

export type NoteValue = "whole" | "half" | "quarter" | "eighth" | "sixteenth" | "thirty-second";
export type NoteState = "played" | "missed" | "current" | "upcoming" | undefined;
export type Accidental = "sharp" | "flat" | "natural";

export interface StaffSystem { clef: "treble" | "bass" | "alto" | "none"; top?: number; keySignature?: { accidental: Accidental; left: number; step?: number }[]; timeSignature?: "common" | "cut" | [number, number]; timeLeft?: number }
export interface StaffNote { bar?: number; beat?: number; x?: number; y?: number; step: number; value?: NoteValue; dotted?: boolean; beam?: string; stem?: "up" | "down"; state?: NoteState; accidental?: Accidental; system?: number }
export interface StaffRest { bar?: number; beat?: number; x?: number; value: NoteValue; step?: number; state?: NoteState; system?: number }
export interface StaffBarline { bar?: number; beat?: number; x?: number; system?: number; type?: "final" | "repeat-open" | "repeat-close" }
export interface StaffRegion { bar?: number; beat?: number; x?: number; width?: number; bars?: number; top?: number; height?: number; system?: number }
export interface StaffSlur { from: number; to: number; kind?: "slur" | "tie"; above?: boolean }
export interface StaffLayout { bars: number; beatsPerBar?: number; left?: number; right?: number }

export interface StaffProps {
  systems?: StaffSystem[];
  notes?: StaffNote[];
  rests?: StaffRest[];
  barlines?: StaffBarline[];
  regions?: StaffRegion[];
  slurs?: StaffSlur[];
  layout?: StaffLayout;
  width?: number;
  height?: number;
  lineGap?: number;
  stepUnit?: number;
  stemLen?: number;
  style?: React.CSSProperties;
}

const CLEFS: Record<string, { glyph: string; size: number; dy: number; left: number; width: number }> = {
  treble: { glyph: "\u{1D11E}", size: 88, dy: -20, left: 6, width: 0.711 },
  bass: { glyph: "\u{1D122}", size: 62, dy: -10, left: 10, width: 0.66 },
  alto: { glyph: "\u{1D121}", size: 62, dy: -10, left: 10, width: 0.66 },
};
const ACCIDENTALS: Record<Accidental, { glyph: string; baseline: number; width: number }> = {
  sharp: { glyph: "♯", baseline: 0.131, width: 0.325 },
  flat: { glyph: "♭", baseline: 0.07, width: 0.299 },
  natural: { glyph: "♮", baseline: 0.1325, width: 0.276 },
};
const RESTS: Record<string, { glyph: string; anchor: number }> = {
  whole: { glyph: "\u{1D13B}", anchor: 3 }, half: { glyph: "\u{1D13C}", anchor: 3 }, quarter: { glyph: "\u{1D13D}", anchor: 4 }, eighth: { glyph: "\u{1D13E}", anchor: 4 }, sixteenth: { glyph: "\u{1D13F}", anchor: 4 },
};
const TIME_GLYPHS = { common: "\u{1D134}", cut: "\u{1D135}" };
const BARLINES: Record<string, string> = { final: "\u{1D102}", "repeat-open": "\u{1D106}", "repeat-close": "\u{1D107}" };
const BASELINE_IN_BOX = 0.994;
const HEAD_RATIO_W = 26 / 22;
const HEAD_RATIO_H = 19 / 22;
const HOLLOW: Partial<Record<NoteValue, boolean>> = { whole: true, half: true };
const FLAGS: Partial<Record<NoteValue, number>> = { eighth: 1, sixteenth: 2, "thirty-second": 3 };
const BEATS: Record<NoteValue, number> = { whole: 4, half: 2, quarter: 1, eighth: 0.5, sixteenth: 0.25, "thirty-second": 0.125 };

/** Beats a value occupies. */
export function beatsOf(value: NoteValue, dotted?: boolean): number {
  const b = BEATS[value] ?? 1;
  return dotted ? b * 1.5 : b;
}

export function Staff({ systems = [{ clef: "treble" }], notes = [], rests = [], barlines = [], regions = [], slurs = [], layout, width = 830, height = 280, lineGap = 22, stepUnit = lineGap / 2, stemLen = lineGap * 3.5, style }: StaffProps) {
  const laid = systems.map((s, i) => ({ ...s, top: s.top ?? (i === 0 ? 36 : 180) }));
  const headW = lineGap * HEAD_RATIO_W;
  const headH = lineGap * HEAD_RATIO_H;
  const stemW = Math.max(1, lineGap * 0.073);
  const beamH = lineGap * 0.5;
  const beamStep = lineGap * 0.78;
  const em = lineGap * 4;
  const glyphTop = (sys: { top: number }, anchor: number) => sys.top + anchor * lineGap - BASELINE_IN_BOX * em;

  const beatsPerBar = layout?.beatsPerBar ?? 4;
  const furniture = () => {
    const s = laid[0] || ({} as StaffSystem);
    let x = 12;
    if (CLEFS[s.clef]) x = CLEFS[s.clef].left + CLEFS[s.clef].width * em + lineGap * 0.5;
    (s.keySignature || []).forEach((a) => { x += (ACCIDENTALS[a.accidental] || ACCIDENTALS.sharp).width * em * 0.9; });
    if (s.timeSignature) x += em * 0.62;
    return x + lineGap;
  };
  const leftPad = layout ? layout.left ?? furniture() : 0;
  const rightPad = layout?.right ?? lineGap * 1.2;
  const barWidth = layout ? (width - leftPad - rightPad) / layout.bars : 0;
  type Positioned = { x?: number; bar?: number; beat?: number; system?: number; accidental?: Accidental };
  const rawX = (item: Positioned) => (item.x != null ? item.x : leftPad + ((item.bar ?? 0) + (item.beat || 0) / beatsPerBar) * barWidth);

  const nudged = new Map<string, number>();
  if (layout) {
    const minGap = headW * 1.35;
    laid.forEach((_, si) => {
      const items: Positioned[] = [...notes, ...rests].filter((i) => (i.system ?? 0) === si && i.x == null);
      const leftExtent = new Map<number, number>();
      items.forEach((i) => {
        const spec = i.accidental && (ACCIDENTALS[i.accidental] || ACCIDENTALS.sharp);
        const w = spec ? spec.width * em + lineGap * 0.18 : 0;
        const x = rawX(i);
        leftExtent.set(x, Math.max(leftExtent.get(x) || 0, w));
      });
      const onsets = [...leftExtent.keys()].sort((a, b) => a - b);
      let prev = -Infinity;
      onsets.forEach((x) => {
        const next = Math.max(x, prev + minGap + (leftExtent.get(x) ?? 0));
        nudged.set(si + "@" + x, next);
        prev = next;
      });
    });
  }
  const xOf = (item: Positioned) => {
    if (item.x != null) return item.x;
    const x = rawX(item);
    return nudged.get((item.system ?? 0) + "@" + x) ?? x;
  };
  const autoBars: StaffBarline[] = layout
    ? Array.from({ length: layout.bars - 1 }, (_, i) => i + 1).flatMap((b) => laid.map((_, si) => ({ x: leftPad + b * barWidth, system: si }))).concat(laid.map((_, si) => ({ x: width - 0.358 * em, system: si, type: "final" as const })))
    : [];
  const allBarlines = [...autoBars, ...barlines];
  const ink = (state: NoteState) => (state === "missed" ? "var(--kc-clay)" : state === "current" ? "var(--kc-mint)" : state === "upcoming" ? "var(--kc-paper-ink-dim)" : "var(--kc-paper-ink)");
  const placed = notes.map((n) => {
    const sys = laid[n.system ?? 0];
    const value: NoteValue = n.value || "quarter";
    const x = xOf(n);
    const centerY = n.y != null ? n.y + headH / 2 : sys.top + n.step * stepUnit;
    const stepOf = (centerY - sys.top) / stepUnit;
    return { ...n, sys, value, x, centerY, stepOf, cx: x + headW / 2, color: ink(n.state) };
  });
  type Placed = (typeof placed)[number];
  const groups: Record<string, Placed[]> = {};
  placed.forEach((n) => {
    if (n.beam == null || !FLAGS[n.value]) return;
    (groups[n.beam] = groups[n.beam] || []).push(n);
  });
  const stems: { key: string; x: number; top: number; height: number; color: string }[] = [];
  const beams: { key: string; x0: number; y0: number; x1: number; y1: number; color: string }[] = [];
  const flags: { key: string; x: number; y: number; dir: "up" | "down"; color: string }[] = [];
  const stemDir = (n: Placed): "up" | "down" => n.stem || (n.stepOf >= 4 ? "up" : "down");
  const stemX = (n: Placed, dir: "up" | "down") => (dir === "up" ? n.x + headW - stemW : n.x);
  placed.forEach((n) => {
    if (n.value === "whole") return;
    if (n.beam != null && groups[n.beam] && groups[n.beam].length > 1) return;
    const dir = stemDir(n);
    const tipY = dir === "up" ? n.centerY - stemLen : n.centerY + stemLen;
    stems.push({ key: "s" + n.x + n.centerY, x: stemX(n, dir), top: Math.min(n.centerY, tipY), height: stemLen, color: n.color });
    for (let i = 0; i < (FLAGS[n.value] || 0); i++) {
      flags.push({ key: "f" + n.x + n.centerY + i, x: stemX(n, dir) + (dir === "up" ? stemW : 0), y: tipY + (dir === "up" ? i * beamStep : -i * beamStep - beamH), dir, color: n.color });
    }
  });
  Object.entries(groups).forEach(([id, group]) => {
    if (group.length < 2) return;
    const sorted = [...group].sort((a, b) => a.cx - b.cx);
    const avg = sorted.reduce((t, n) => t + n.stepOf, 0) / sorted.length;
    const dir: "up" | "down" = sorted[0].stem || (avg >= 4 ? "up" : "down");
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const x0 = stemX(first, dir) + stemW / 2;
    const x1 = stemX(last, dir) + stemW / 2;
    const span = x1 - x0 || 1;
    const maxSlope = 0.25;
    const slope = Math.max(-maxSlope, Math.min(maxSlope, (last.centerY - first.centerY) / span));
    const rel = sorted.map((n) => n.centerY - slope * (stemX(n, dir) + stemW / 2 - x0));
    const base = dir === "up" ? Math.min(...rel) - stemLen : Math.max(...rel) + stemLen;
    const at = (x: number) => base + slope * (x - x0);
    const y0 = at(x0);
    const y1 = at(x1);
    sorted.forEach((n) => {
      const sx = stemX(n, dir);
      const endY = at(sx + stemW / 2);
      stems.push({ key: "gs" + id + n.x, x: sx, top: Math.min(n.centerY, endY), height: Math.abs(endY - n.centerY), color: n.color });
    });
    const count = Math.min(...sorted.map((n) => FLAGS[n.value] || 1));
    for (let i = 0; i < count; i++) {
      const off = dir === "up" ? i * beamStep : -i * beamStep - beamH;
      beams.push({ key: "bm" + id + i, x0, y0: y0 + off, x1, y1: y1 + off, color: sorted[0].color });
    }
  });

  const ledgers: { key: string; left: number; w: number; top: number; color: string }[] = [];
  placed.forEach((n, i) => {
    const w = headW * 1.6;
    const left = n.cx - w / 2;
    const lastAbove = 2 * Math.ceil(n.stepOf / 2);
    for (let s = -2; s >= lastAbove; s -= 2) ledgers.push({ key: "lg" + i + s, left, w, top: n.sys.top + s * stepUnit, color: n.color });
    const lastBelow = 2 * Math.floor(n.stepOf / 2);
    for (let s = 10; s <= lastBelow; s += 2) ledgers.push({ key: "lg" + i + s, left, w, top: n.sys.top + s * stepUnit, color: n.color });
  });

  const curves = slurs.map((s, i) => {
    const a = placed[s.from];
    const b = placed[s.to];
    if (!a || !b) return null;
    const above = s.above ?? stemDir(a) === "down";
    const lift = s.kind === "tie" ? lineGap * 0.55 : lineGap * 1.25;
    const edge = (n: Placed) => n.centerY + (above ? -headH / 2 : headH / 2);
    const x0 = a.cx + (s.kind === "tie" ? headW * 0.3 : 0);
    const x1 = b.cx - (s.kind === "tie" ? headW * 0.3 : 0);
    const y0 = edge(a);
    const y1 = edge(b);
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2 + (above ? -lift * 2 : lift * 2);
    return { key: "sl" + i, d: `M ${x0} ${y0} Q ${cx} ${cy} ${x1} ${y1}`, color: a.color };
  }).filter((c): c is NonNullable<typeof c> => !!c);
  const boxHeight = Math.max(height, ...laid.map((s) => s.top + 4 * lineGap + lineGap * 0.6));

  return (
    <div style={{ width, height: boxHeight, position: "relative", flex: "none", ...style }}>
      {laid.map((sys, si) => (
        <React.Fragment key={"sys" + si}>
          {[0, 1, 2, 3, 4].map((n) => <div key={n} style={{ position: "absolute", left: 0, right: 0, top: sys.top + n * lineGap, height: 1, background: "var(--kc-paper-ink)" }} />)}
          {CLEFS[sys.clef] && <div style={{ position: "absolute", left: CLEFS[sys.clef].left, top: sys.top + (CLEFS[sys.clef].dy * lineGap) / 22, fontFamily: "var(--kc-font-music)", fontSize: (CLEFS[sys.clef].size * lineGap) / 22, lineHeight: 1, color: "var(--kc-paper-ink)" }}>{CLEFS[sys.clef].glyph}</div>}
          {(sys.keySignature || []).map((a, ai) => {
            const spec = ACCIDENTALS[a.accidental] || ACCIDENTALS.sharp;
            return <div key={ai} style={{ position: "absolute", left: a.left, top: sys.top + (a.step ?? 0) * stepUnit + (spec.baseline - BASELINE_IN_BOX) * em, fontFamily: "var(--kc-font-music)", fontSize: em, lineHeight: 1, color: "var(--kc-paper-ink)" }}>{spec.glyph}</div>;
          })}
          {sys.timeSignature && (Array.isArray(sys.timeSignature)
            ? <div style={{ position: "absolute", left: sys.timeLeft ?? 116, top: sys.top - lineGap * 0.15, display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1.08, fontFamily: "var(--kc-font-sans)", fontWeight: 600, fontSize: lineGap * 1.9, color: "var(--kc-paper-ink)" }}><span>{sys.timeSignature[0]}</span><span>{sys.timeSignature[1]}</span></div>
            : <div style={{ position: "absolute", left: sys.timeLeft ?? 116, top: glyphTop(sys, 4), fontFamily: "var(--kc-font-music)", fontSize: em, lineHeight: 1, color: "var(--kc-paper-ink)" }}>{TIME_GLYPHS[sys.timeSignature]}</div>)}
        </React.Fragment>
      ))}
      {regions.map((r, i) => {
        const sys = laid[r.system ?? 0];
        return <div key={"r" + i} style={{ position: "absolute", left: xOf(r), width: r.width ?? (layout ? barWidth * (r.bars ?? 1) : 40), top: r.top ?? sys.top - 14, height: r.height ?? 4 * lineGap + 28, background: "rgba(90,209,192,.28)", border: "1px solid #2f9f77", borderRadius: 3 }} />;
      })}
      {allBarlines.map((b, i) => {
        const sys = laid[b.system ?? 0];
        const x = xOf(b);
        if (b.type && BARLINES[b.type]) return <div key={"bl" + i} style={{ position: "absolute", left: x, top: glyphTop(sys, 4), fontFamily: "var(--kc-font-music)", fontSize: em, lineHeight: 1, color: "var(--kc-paper-ink)" }}>{BARLINES[b.type]}</div>;
        return <div key={"bl" + i} style={{ position: "absolute", left: x, top: sys.top, width: 1, height: 4 * lineGap, background: "var(--kc-paper-ink)" }} />;
      })}
      {rests.map((r, i) => {
        const sys = laid[r.system ?? 0];
        const spec = RESTS[r.value] || RESTS.quarter;
        return <div key={"rest" + i} style={{ position: "absolute", left: xOf(r), top: glyphTop(sys, spec.anchor) + (r.step != null ? (r.step - 4) * stepUnit : 0), fontFamily: "var(--kc-font-music)", fontSize: em, lineHeight: 1, color: ink(r.state) }}>{spec.glyph}</div>;
      })}
      {ledgers.map((l) => <div key={l.key} style={{ position: "absolute", left: l.left, top: l.top, width: l.w, height: 1, background: "var(--kc-paper-ink)" }} />)}
      {stems.map((s) => <div key={s.key} style={{ position: "absolute", left: s.x, top: s.top, width: stemW, height: s.height, background: s.color }} />)}
      {beams.map((b) => {
        const dx = b.x1 - b.x0;
        const dy = b.y1 - b.y0;
        return <div key={b.key} style={{ position: "absolute", left: b.x0, top: b.y0, width: Math.sqrt(dx * dx + dy * dy), height: beamH, background: b.color, transform: `rotate(${(Math.atan2(dy, dx) * 180) / Math.PI}deg)`, transformOrigin: "left top" }} />;
      })}
      {flags.map((f) => <div key={f.key} style={{ position: "absolute", left: f.x, top: f.y, width: lineGap * 1.15, height: beamH, background: f.color, borderRadius: beamH / 2, transform: `rotate(${f.dir === "up" ? 32 : -32}deg)`, transformOrigin: "left top" }} />)}
      {curves.length > 0 && (
        <svg width={width} height={boxHeight} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }}>
          {curves.map((c) => <path key={c.key} d={c.d} fill="none" stroke={c.color} strokeWidth={Math.max(1.2, lineGap * 0.09)} strokeLinecap="round" />)}
        </svg>
      )}
      {placed.map((n, i) => (
        <React.Fragment key={"n" + i}>
          {n.accidental && <div style={{ position: "absolute", left: n.x - (ACCIDENTALS[n.accidental] || ACCIDENTALS.sharp).width * em - lineGap * 0.18, top: n.centerY + ((ACCIDENTALS[n.accidental] || ACCIDENTALS.sharp).baseline - BASELINE_IN_BOX) * em, fontFamily: "var(--kc-font-music)", fontSize: em, lineHeight: 1, color: n.color }}>{(ACCIDENTALS[n.accidental] || ACCIDENTALS.sharp).glyph}</div>}
          <div style={{ position: "absolute", left: n.x, top: n.centerY - headH / 2, width: headW, height: headH, borderRadius: "50%", background: HOLLOW[n.value] ? "var(--kc-paper)" : n.color, border: HOLLOW[n.value] ? Math.max(2, lineGap * 0.14) + "px solid " + n.color : "none", boxSizing: "border-box", transform: "rotate(-18deg)" }} />
          {n.dotted && <div style={{ position: "absolute", left: n.x + headW + lineGap * 0.22, top: n.centerY - (n.stepOf % 2 === 0 ? stepUnit : 0) - lineGap * 0.14, width: lineGap * 0.28, height: lineGap * 0.28, borderRadius: "50%", background: n.color }} />}
        </React.Fragment>
      ))}
    </div>
  );
}
