"use client";
import * as React from "react";
import { ActionNote, Button, CheckItem, Headline, Pill, keyLabel } from "@/components/ds";
import type { ScaleId } from "@/lib/types";
import { StepActions, capitalize, numberWord } from "./chrome";

type Mode = "guided" | "own";

/** A3 · Guided or own plan. Two big cards, one engine. The chosen one sits on the indigo wash with a 3px border. */
export function StepMode({ mode, onMode, scale, minutes, onContinue }: { mode: Mode; onMode: (m: Mode) => void; scale: ScaleId; minutes: number; onContinue: () => void }) {
  const key = keyLabel(scale.key, scale.mode);
  const card = (m: Mode): React.CSSProperties => ({
    borderRadius: 24, padding: "24px 26px", display: "flex", flexDirection: "column", gap: 14, minHeight: 0, textAlign: "left", cursor: "pointer", color: "var(--kc-ink)", fontFamily: "var(--kc-font-sans)", boxSizing: "border-box",
    ...(mode === m ? { background: "var(--kc-indigo-wash)", border: "3px solid var(--kc-indigo)" } : { background: "var(--kc-panel)", border: "2px solid var(--kc-border)", boxShadow: "var(--kc-shadow-press)" }),
  });
  const preview = (m: Mode): React.CSSProperties => ({ marginTop: "auto", background: "var(--kc-panel)", border: mode === m ? "2px solid var(--kc-lilac)" : "2px solid var(--kc-border)", borderRadius: 18, padding: "14px 18px" });
  const label: React.CSSProperties = { fontSize: 13, fontWeight: 900, letterSpacing: ".06em", color: "var(--kc-ink-faint)" };
  const title: React.CSSProperties = { fontFamily: "var(--kc-font-display)", fontSize: 20, fontWeight: 600, marginTop: 4 };
  const sub: React.CSSProperties = { fontSize: 14, fontWeight: 700, lineHeight: 1.4, color: "var(--kc-ink-muted)" };
  return (
    <div style={{ flex: 1, minHeight: 0, padding: "30px 34px", display: "flex", flexDirection: "column", gap: 22 }}>
      <Headline title="How much should the app decide?" lede="Same engine either way — the same seven stops, the same weighting, the same record. This only changes how much of it is on screen at once." />
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <button type="button" onClick={() => onMode("guided")} className="kc-press" style={card("guided")}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 28, fontWeight: 600, lineHeight: 1.15 }}>Guided</div>
            {mode === "guided" && <Pill tone="indigo-fill" icon="check">Chosen</Pill>}
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--kc-ink-muted)", lineHeight: 1.45 }}>One instruction at a time. Good for practising alone at eleven, and for an adult who just wants to be told what to do for twenty minutes.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            <CheckItem>The next exercise, its settings already chosen</CheckItem>
            <CheckItem>Tick coaches after each try, naming the bar</CheckItem>
            <CheckItem>A quiet timer and the path of seven stops</CheckItem>
            <CheckItem on={false}>No reordering, no tempo dial, no raw numbers</CheckItem>
          </div>
          <div style={preview("guided")}>
            <div style={label}>WHAT YOU SEE</div>
            <div style={title}>Start with the {key} scale.</div>
            <div style={sub}>Two octaves, hands separately first.</div>
          </div>
        </button>
        <button type="button" onClick={() => onMode("own")} className="kc-press" style={card("own")}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 28, fontWeight: 600, lineHeight: 1.15 }}>Own plan</div>
            {mode === "own" && <Pill tone="indigo-fill" icon="check">Chosen</Pill>}
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--kc-ink-muted)", lineHeight: 1.45 }}>The whole queue, editable, with the real numbers. For anyone who already knows what they want to work on today.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            <CheckItem>Reorder, retime, skip, save routines</CheckItem>
            <CheckItem>Tempo, level, key, hands and loop points</CheckItem>
            <CheckItem>Accuracy, evenness and drift in milliseconds</CheckItem>
            <CheckItem>Run past the timer when it&apos;s going well</CheckItem>
          </div>
          <div style={preview("own")}>
            <div style={label}>WHAT YOU SEE</div>
            <div style={title}>{capitalize(numberWord(minutes))} minutes, in {key}</div>
            <div style={sub}>Seven rows, weighted toward reading. Edit anything.</div>
          </div>
        </button>
      </div>
      <StepActions style={{ marginTop: 0 }}>
        <Button icon="arrow_forward" iconAfter onClick={onContinue}>{mode === "guided" ? "Use guided" : "Use own plan"}</Button>
        <ActionNote>Change it whenever — it&apos;s one setting, not a promise.</ActionNote>
      </StepActions>
    </div>
  );
}
