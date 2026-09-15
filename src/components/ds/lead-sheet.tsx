import * as React from "react";
import { Staff, type StaffNote, type NoteValue, type NoteState } from "./staff";

export interface LeadSheetBar { chord: string; lyric?: string; dim?: boolean }
export interface LeadMelodyNote { bar: number; beat: number; step: number; value?: NoteValue; dotted?: boolean; beam?: string; stem?: "up" | "down"; state?: NoteState }

/** Chord symbols over a single staff: what a student above their reading level gets instead of the full score. */
export function LeadSheet({ bars, melody = [], beatsPerBar = 4, width = 830, height = 150, style }: { bars: LeadSheetBar[]; melody?: LeadMelodyNote[]; beatsPerBar?: number; width?: number; height?: number; style?: React.CSSProperties }) {
  const barWidth = width / bars.length;
  const hasLyrics = bars.some((b) => b.lyric);
  const chordSize = Math.max(11, Math.min(20, (height / 6.5) * 1.1));
  const chordRow = chordSize + 8;
  const lyricSize = Math.max(11, Math.min(15, chordSize * 0.8));
  const lyricRow = hasLyrics ? lyricSize + 8 : 6;
  const lineGap = Math.max(8, (height - chordRow - lyricRow) / 5.6);
  const stemLen = lineGap * 2.8;
  const staffTop = chordRow + lineGap * 1.6;
  const staffBottom = staffTop + 4 * lineGap;
  const notes: StaffNote[] = melody.map((m) => ({ x: (m.bar + m.beat / beatsPerBar) * barWidth + Math.min(10, barWidth * 0.1), step: m.step, value: m.value || "quarter", dotted: m.dotted, beam: m.beam, stem: m.stem || "up", state: m.state }));
  const barlines = bars.map((_, i) => ({ x: i * barWidth })).concat([{ x: width - 1 }]);
  return (
    <div style={{ width, height, position: "relative", ...style }}>
      {bars.map((b, i) => (
        <React.Fragment key={"b" + i}>
          <div style={{ position: "absolute", left: i * barWidth + 2, top: 0, fontFamily: "var(--kc-font-mono)", fontSize: chordSize, fontWeight: 600, lineHeight: 1, color: b.dim ? "var(--kc-paper-ink-dim)" : "var(--kc-paper-ink)" }}>{b.chord}</div>
          {b.lyric && <div style={{ position: "absolute", left: i * barWidth + 2, top: staffBottom + 8, fontFamily: "var(--kc-font-sans)", fontSize: lyricSize, lineHeight: 1, color: "var(--kc-paper-ink)" }}>{b.lyric}</div>}
        </React.Fragment>
      ))}
      <Staff width={width} height={height} lineGap={lineGap} stemLen={stemLen} systems={[{ clef: "none", top: staffTop }]} notes={notes} barlines={barlines} style={{ position: "absolute", left: 0, top: 0 }} />
    </div>
  );
}
