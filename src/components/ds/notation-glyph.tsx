import * as React from "react";

export const GLYPHS = {
  "clef-treble": "\u{1D11E}", "clef-bass": "\u{1D122}", "clef-alto": "\u{1D121}", "clef-percussion": "\u{1D125}",
  "note-whole": "\u{1D15D}", "note-half": "\u{1D15E}", "note-quarter": "\u{1D15F}", "note-eighth": "\u{1D160}", "note-sixteenth": "\u{1D161}",
  "rest-whole": "\u{1D13B}", "rest-half": "\u{1D13C}", "rest-quarter": "\u{1D13D}", "rest-eighth": "\u{1D13E}", "rest-sixteenth": "\u{1D13F}",
  flat: "♭", natural: "♮", sharp: "♯", "double-flat": "\u{1D12B}", "double-sharp": "\u{1D12A}",
  "time-common": "\u{1D134}", "time-cut": "\u{1D135}", "repeat-open": "\u{1D106}", "repeat-close": "\u{1D107}", "bar-final": "\u{1D102}",
  fermata: "\u{1D110}", pedal: "\u{1D1AE}",
} as const;

export type GlyphName = keyof typeof GLYPHS;

const UI_SIZES: Record<string, Record<string, number>> = {
  badge: { "clef-treble": 21, "clef-bass": 24, "clef-alto": 24, "clef-percussion": 21, pedal: 19, _default: 21 },
  cell: { _default: 17 },
  inline: { _default: 15 },
};

/** A musical symbol from Noto Music, never redrawn. On a staff everything is 28px; in UI the sizes are matched by eye. */
export function NotationGlyph({ name, context = "staff", color, size, style, ...rest }: { name: GlyphName; context?: "staff" | "badge" | "cell" | "inline"; color?: string; size?: number; style?: React.CSSProperties } & Omit<React.HTMLAttributes<HTMLSpanElement>, "style" | "color">) {
  const resolved = size ?? (context === "staff" ? 28 : UI_SIZES[context][name] ?? UI_SIZES[context]._default);
  return (
    <span role="img" aria-label={name.replace(/-/g, " ")} style={{ fontFamily: "var(--kc-font-music)", fontSize: resolved, lineHeight: 1, color: color ?? "var(--kc-glyph)", ...style }} {...rest}>
      {GLYPHS[name]}
    </span>
  );
}

export function NotationPair({ name = "clef-treble", color, style }: { name?: GlyphName; color?: string; style?: React.CSSProperties }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 5, ...style }}>
      <NotationGlyph name={name} context="badge" size={14} color={color} />
      <NotationGlyph name={name} context="badge" size={14} color={color} />
    </span>
  );
}

/** Inline tempo mark: a quarter-note glyph followed by the bpm, e.g. 𝅘𝅥76. */
export function Tempo({ bpm, size = 13 }: { bpm: number; size?: number }) {
  return (
    <span style={{ whiteSpace: "nowrap" }}>
      <NotationGlyph name="note-quarter" context="inline" size={size} color="currentColor" />
      {bpm}
    </span>
  );
}

/** Key name with a real accidental glyph: "B♭ major", "F♯ minor". */
export function keyLabel(key: string, mode: string): string {
  const k = key.replace("#", "♯").replace("b", "♭");
  const m = mode === "major" ? "major" : mode === "natural-minor" ? "minor" : "harmonic minor";
  return `${k} ${m}`;
}
