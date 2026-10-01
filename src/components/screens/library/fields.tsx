"use client";
import * as React from "react";

/*
 * Form controls in the design's chrome: white fill, a 2px border, 14px radius, Nunito 15/700.
 * The design system has no input component, so these stay local to the Library.
 */
const base: React.CSSProperties = {
  height: 46, boxSizing: "border-box", padding: "0 14px", borderRadius: 14, background: "var(--kc-panel)",
  border: "2px solid var(--kc-border)", color: "var(--kc-ink)", fontFamily: "var(--kc-font-sans)", fontSize: 15, fontWeight: 700, outline: "none", width: "100%",
};

export function TextField({ style, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} style={{ ...base, ...style }} />;
}

export function SelectField({ style, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...rest} style={{ ...base, appearance: "auto", ...style }}>{children}</select>;
}

export function TextArea({ style, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} style={{ ...base, height: 76, padding: "10px 14px", resize: "none", fontFamily: "var(--kc-font-mono)", fontSize: 13, fontWeight: 500, lineHeight: 1.5, ...style }} />;
}

export function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0, ...style }}>
      <span style={{ fontSize: 14, fontWeight: 800, color: "var(--kc-ink-faint)", lineHeight: 1 }}>{label}</span>
      {children}
    </label>
  );
}
