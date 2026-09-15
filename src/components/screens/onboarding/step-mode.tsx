"use client";
import * as React from "react";
import { Button, CheckItem, Headline, Pill, SectionLabel, keyLabel } from "@/components/ds";
import type { ScaleId } from "@/lib/types";
import { StepActions, capitalize, numberWord } from "./chrome";

type Mode = "guided" | "own";

/** A3 · Guided or own plan. Two cards, one engine. */
export function StepMode({ mode, onMode, scale, minutes, onContinue }: { mode: Mode; onMode: (m: Mode) => void; scale: ScaleId; minutes: number; onContinue: () => void }) {
  const key = keyLabel(scale.key, scale.mode);
  const card = (m: Mode): React.CSSProperties => ({
    background: mode === m ? "var(--kc-mint-wash)" : "var(--kc-panel)", border: mode === m ? "1.5px solid var(--kc-mint)" : "1px solid var(--kc-border)", borderRadius: 11, padding: "24px 26px",
    display: "flex", flexDirection: "column", gap: 16, minHeight: 0, textAlign: "left", cursor: "pointer", color: "var(--kc-ink)", fontFamily: "var(--kc-font-sans)", boxSizing: "border-box",
  });
  const preview = (m: Mode): React.CSSProperties => ({ marginTop: "auto", background: "var(--kc-base)", border: mode === m ? "1px solid var(--kc-mint-edge)" : "1px solid var(--kc-border)", borderRadius: 10, padding: "16px 18px" });
  return (
    <div style={{ flex: 1, minHeight: 0, padding: 38, display: "flex", flexDirection: "column", gap: 26 }}>
      <Headline title="How much should the app decide?" lede="Same engine either way — the same six disciplines, the same weighting, the same record. This only changes how much of it is on screen at once." />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, flex: 1, minHeight: 0 }}>
        <button type="button" onClick={() => onMode("guided")} style={card("guided")}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em" }}>Guided</h2>
            {mode === "guided" && <Pill tone="mint" icon="check">Chosen</Pill>}
          </div>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.45, color: "var(--kc-ink-muted)" }}>One instruction at a time. Good for practicing alone at eleven, and for an adult who wants to be told what to do for twenty minutes.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <CheckItem>The next exercise, its settings already chosen</CheckItem>
            <CheckItem>Coaching after each attempt, naming the bar</CheckItem>
            <CheckItem>A quiet timer and a plain progress strip</CheckItem>
            <CheckItem on={false}>No reordering, no tempo dial, no raw numbers</CheckItem>
          </div>
          <div style={preview("guided")}>
            <SectionLabel size="meta">What you see</SectionLabel>
            <div style={{ fontSize: 19, fontWeight: 600, marginTop: 8 }}>Start with the {key} scale.</div>
            <div style={{ fontSize: 14, color: "var(--kc-ink-dim)", marginTop: 4 }}>Two octaves, hands separately first.</div>
          </div>
        </button>
        <button type="button" onClick={() => onMode("own")} style={card("own")}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em" }}>Own plan</h2>
            {mode === "own" && <Pill tone="mint" icon="check">Chosen</Pill>}
          </div>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.45, color: "var(--kc-ink-muted)" }}>The whole queue, editable, with the real numbers. For anyone who already knows what they want to work on today.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <OwnItem>Reorder, retime, skip, save routines</OwnItem>
            <OwnItem>Tempo, level, key, hands and loop points exposed</OwnItem>
            <OwnItem>Accuracy, evenness and drift in milliseconds</OwnItem>
            <OwnItem>Run past the timer when it's going well</OwnItem>
          </div>
          <div style={preview("own")}>
            <SectionLabel size="meta">What you see</SectionLabel>
            <div style={{ fontSize: 19, fontWeight: 600, marginTop: 8 }}>{capitalize(numberWord(minutes))} minutes, in {key}</div>
            <div style={{ fontSize: 14, color: "var(--kc-ink-dim)", marginTop: 4 }}>Six rows, weighted toward reading. Edit anything.</div>
          </div>
        </button>
      </div>
      <StepActions style={{ marginTop: 0 }}>
        <Button icon="arrow_forward" onClick={onContinue}>{mode === "guided" ? "Use guided" : "Use own plan"}</Button>
        <span style={{ fontSize: 14, color: "var(--kc-ink-dim)" }}>Change it whenever — it's one setting, not a commitment.</span>
      </StepActions>
    </div>
  );
}

/** The own-plan list uses muted ticks: the design does not colour them mint. */
function OwnItem({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 10, fontSize: 15, color: "var(--kc-ink-muted)", lineHeight: 1.45 }}>
      <span className="kc-icon" aria-hidden style={{ fontSize: 20, color: "var(--kc-ink-muted)" }}>check</span>
      <span>{children}</span>
    </div>
  );
}
