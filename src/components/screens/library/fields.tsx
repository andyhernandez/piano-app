"use client";
import * as React from "react";

/*
 * Form controls in the design's chrome: the base fill, an interactive border, control radius and height.
 * The design system has no input component, so these stay local to the Library.
 */
const base: React.CSSProperties = {
  height: 40, boxSizing: "border-box", padding: "0 12px", borderRadius: "var(--kc-radius-control)", background: "var(--kc-base)",
  border: "1px solid var(--kc-border-active)", color: "var(--kc-ink)", fontFamily: "var(--kc-font-sans)", fontSize: 14, outline: "none", width: "100%",
};

export function TextField({ style, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} style={{ ...base, ...style }} />;
}

export function SelectField({ style, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...rest} style={{ ...base, appearance: "auto", ...style }}>{children}</select>;
}

export function TextArea({ style, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} style={{ ...base, height: 72, padding: "10px 12px", resize: "none", fontFamily: "var(--kc-font-mono)", fontSize: 13, lineHeight: 1.5, ...style }} />;
}

export function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0, ...style }}>
      <span style={{ fontFamily: "var(--kc-font-mono)", fontSize: 10, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--kc-ink-faint)", lineHeight: 1 }}>{label}</span>
      {children}
    </label>
  );
}
