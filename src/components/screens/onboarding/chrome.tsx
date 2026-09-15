"use client";
import * as React from "react";
import { SectionLabel, SegmentBar } from "@/components/ds";

export const SETUP_STEPS = 4;

/** The 72px setting-up header: wordmark · SETTING UP · STEP n OF 4 · a four-segment bar on the right. */
export function SetupHeader({ step }: { step: number }) {
  return (
    <div style={{ height: 72, flex: "none", borderBottom: "1px solid var(--kc-border)", display: "flex", alignItems: "center", gap: 22, padding: "0 34px" }}>
      <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em" }}>KeyCadence</span>
      <SectionLabel>Setting up · step {step} of {SETUP_STEPS}</SectionLabel>
      <div style={{ marginLeft: "auto", width: 200 }}>
        <SegmentBar total={SETUP_STEPS} filled={step - 1} current={step - 1} height={6} radius={3} />
      </div>
    </div>
  );
}

/** A text field in the design's language: base fill, active border, 40px tall. */
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
        height: 40, padding: "0 14px", borderRadius: "var(--kc-radius-control)", background: "var(--kc-base)", border: "1px solid var(--kc-border-active)",
        color: "var(--kc-ink)", fontFamily: mono ? "var(--kc-font-mono)" : "var(--kc-font-sans)", fontSize: 15, outline: "none", minWidth: 0, ...style,
      }}
      onFocus={(e) => { e.currentTarget.style.borderColor = "var(--kc-mint)"; }}
      onBlur={(e) => { e.currentTarget.style.borderColor = "var(--kc-border-active)"; }}
    />
  );
}

/** The bottom action row of a setting-up step: primary on the left, then whatever else. */
export function StepActions({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 16, ...style }}>{children}</div>;
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
