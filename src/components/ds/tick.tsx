"use client";
import * as React from "react";

export type TickMood = "happy" | "cheer";

/**
 * Tick, the metronome mascot. An indigo trapezoid on an ink base with white eyes and a smile; the pendulum
 * swings ±20° at the session tempo (one swing per beat). `mini` is the 52px rounded-square face used beside an
 * instruction. Drawn entirely in CSS. Stops swinging under prefers-reduced-motion (see globals.css).
 */
export function Tick({ mood = "happy", size = "full", bpm = 72, style }: { mood?: TickMood; size?: "full" | "mini"; bpm?: number; style?: React.CSSProperties }) {
  if (size === "mini") {
    return (
      <span aria-hidden style={{ position: "relative", width: 52, height: 52, flex: "none", borderRadius: 16, background: "var(--kc-indigo)", display: "block", ...style }}>
        <Eye top={15} left={12} r={11} pupil={6} />
        <Eye top={15} left={29} r={11} pupil={6} />
        {mood === "cheer"
          ? <span style={{ position: "absolute", top: 31, left: 19, width: 14, height: 7, borderRadius: "0 0 7px 7px", background: "#ffffff" }} />
          : <span style={{ position: "absolute", top: 31, left: 19, width: 14, height: 7, border: "3px solid #ffffff", borderTop: "none", borderRadius: "0 0 12px 12px", boxSizing: "border-box" }} />}
      </span>
    );
  }
  const swing = `${(60 / Math.max(30, bpm)).toFixed(3)}s`;
  return (
    <div aria-hidden style={{ position: "relative", width: 104, height: 132, flex: "none", ...style }}>
      <span style={{ position: "absolute", inset: "0 0 10px 0", background: "var(--kc-indigo)", clipPath: "polygon(32% 0,68% 0,100% 100%,0 100%)" }} />
      <span style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 14, borderRadius: 7, background: "var(--kc-ink)" }} />
      {mood === "cheer" ? (
        <>
          <span style={{ position: "absolute", top: 46, left: 30, width: 18, height: 9, border: "4px solid #ffffff", borderBottom: "none", borderRadius: "18px 18px 0 0", boxSizing: "border-box" }} />
          <span style={{ position: "absolute", top: 46, left: 56, width: 18, height: 9, border: "4px solid #ffffff", borderBottom: "none", borderRadius: "18px 18px 0 0", boxSizing: "border-box" }} />
          <span style={{ position: "absolute", top: 64, left: 38, width: 28, height: 14, borderRadius: "0 0 14px 14px", background: "#ffffff" }} />
        </>
      ) : (
        <>
          <Eye top={42} left={30} r={18} pupil={9} />
          <Eye top={42} left={56} r={18} pupil={9} />
          <span style={{ position: "absolute", top: 66, left: 40, width: 24, height: 10, border: "4px solid #ffffff", borderTop: "none", borderRadius: "0 0 20px 20px", boxSizing: "border-box" }} />
        </>
      )}
      {/* The pendulum: a white rod with a weight, pivoting from the top of the face. */}
      <span className="kc-pendulum" style={{ position: "absolute", top: 88, left: 50, width: 4, height: 30, marginLeft: -2, borderRadius: 2, background: "#ffffff", ["--kc-swing" as string]: swing } as React.CSSProperties}>
        <span style={{ position: "absolute", bottom: -4, left: -5, width: 14, height: 14, borderRadius: "50%", background: "#ffffff", border: "3px solid var(--kc-indigo)", boxSizing: "border-box" }} />
      </span>
    </div>
  );
}

function Eye({ top, left, r, pupil }: { top: number; left: number; r: number; pupil: number }) {
  const off = Math.round((r - pupil) / 2);
  return (
    <span style={{ position: "absolute", top, left, width: r, height: r, borderRadius: "50%", background: "#ffffff" }}>
      <span style={{ position: "absolute", top: off, left: off + 1, width: pupil, height: pupil, borderRadius: "50%", background: "var(--kc-ink)" }} />
    </span>
  );
}

/** Tick beside a white speech bubble. Guided mode shows one at the top of Today, the setup steps and the skill check. */
export function TickSays({ children, who = "Tick says", mood = "happy", bpm, style }: { children: React.ReactNode; who?: string; mood?: TickMood; bpm?: number; style?: React.CSSProperties }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 18, ...style }}>
      <Tick mood={mood} bpm={bpm} />
      <div style={{ position: "relative", flex: 1, background: "var(--kc-panel)", border: "2px solid var(--kc-border)", borderRadius: 22, padding: "16px 20px", marginBottom: 24 }}>
        <span style={{ position: "absolute", left: -11, bottom: 22, width: 18, height: 18, background: "var(--kc-panel)", borderLeft: "2px solid var(--kc-border)", borderBottom: "2px solid var(--kc-border)", transform: "rotate(45deg)" }} />
        <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 15, fontWeight: 600, color: "var(--kc-indigo)" }}>{who}</div>
        <div style={{ fontSize: 18, lineHeight: 1.4, fontWeight: 700, marginTop: 2 }}>{children}</div>
      </div>
    </div>
  );
}

/** A mini Tick and a one-line Fredoka instruction, under the practice header. */
export function Instruction({ children, mood, style }: { children: React.ReactNode; mood?: TickMood; style?: React.CSSProperties }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, ...style }}>
      <Tick size="mini" mood={mood} />
      <p style={{ margin: 0, fontFamily: "var(--kc-font-display)", fontSize: 25, fontWeight: 500, lineHeight: 1.2 }}>{children}</p>
    </div>
  );
}
