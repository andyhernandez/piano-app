"use client";
import * as React from "react";
import { Logo } from "@/components/ds";

export const SETUP_STEPS = 4;

/** The 78px setting-up header: logo · Setting up · four step pills on the right · "Step n of 4". */
export function SetupHeader({ step }: { step: number }) {
  return (
    <div style={{ height: 78, flex: "none", borderBottom: "2px solid var(--kc-hairline)", background: "var(--kc-panel)", display: "flex", alignItems: "center", gap: 22, padding: "0 30px" }}>
      <Logo href={null} />
      <span style={{ fontSize: 15, fontWeight: 800, color: "var(--kc-ink-faint)" }}>Setting up</span>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {Array.from({ length: SETUP_STEPS }, (_, i) => i + 1).map((i) => (
            <span key={i} style={{ display: "block", height: 12, borderRadius: 999, width: i === step ? 34 : 12, background: i < step ? "var(--kc-mint)" : i === step ? "var(--kc-indigo)" : "var(--kc-border)", transition: "width 160ms ease-out" }} />
          ))}
        </div>
        <span style={{ fontSize: 15, fontWeight: 800 }}>Step {step} of {SETUP_STEPS}</span>
      </div>
    </div>
  );
}

/** A text field: 46px, 2px border, 14px radius; the border goes indigo while it has focus. */
export function TextField({ value, onChange, placeholder, label, mono, maxLength, autoFocus, style, inputMode }: { value: string; onChange: (v: string) => void; placeholder?: string; label: string; mono?: boolean; maxLength?: number; autoFocus?: boolean; style?: React.CSSProperties; inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"] }) {
  return (
    <input
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      autoFocus={autoFocus}
      inputMode={inputMode}
      style={{
        height: 46, padding: "0 14px", borderRadius: 14, background: "var(--kc-base)", border: "2px solid var(--kc-border)", boxSizing: "border-box",
        color: "var(--kc-ink)", fontFamily: mono ? "var(--kc-font-mono)" : "var(--kc-font-sans)", fontSize: 16, fontWeight: 700, outline: "none", minWidth: 0, ...style,
      }}
      onFocus={(e) => { e.currentTarget.style.borderColor = "var(--kc-indigo)"; }}
      onBlur={(e) => { e.currentTarget.style.borderColor = "var(--kc-border)"; }}
    />
  );
}

/** The bottom action row of a setting-up step: primary on the left, then whatever else, a note on the right. */
export function StepActions({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 14, ...style }}>{children}</div>;
}

/** Spell the small numbers the copy uses: "twenty minutes", "five days". */
export function numberWord(n: number): string {
  const words = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];
  if (n === 30) return "thirty";
  if (n === 40) return "forty";
  if (n === 45) return "forty-five";
  if (n === 60) return "sixty";
  return words[n] ?? String(n);
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
