"use client";
import * as React from "react";
import { Button, SectionLabel, Icon } from "@/components/ds";
import { useAppStore } from "@/lib/store/app-store";
import { pinMatches } from "@/lib/household/pin";

export type CodeArea = "settings" | "teacherLink" | "deleteRecording" | "household";

/** True when the given household action currently sits behind the four-digit code and it has not been entered. */
export function useCodeLocked(area: CodeArea): boolean {
  const parent = useAppStore((s) => s.parent);
  const unlocked = useAppStore((s) => s.parentUnlocked);
  if (!parent?.pin || unlocked) return false;
  if (area === "household") return true;
  return parent.codeFor?.[area] !== false;
}

/**
 * Four boxes for the household code. Sits in the main column where the gated content will appear; the rail,
 * when there is one, stays. Compares against the hashed code on the parent record.
 */
export function CodePrompt({ title = "Enter the household code", lede, onUnlock }: { title?: string; lede?: React.ReactNode; onUnlock?: () => void }) {
  const parent = useAppStore((s) => s.parent);
  const setParentUnlocked = useAppStore((s) => s.setParentUnlocked);
  const [code, setCode] = React.useState("");
  const [wrong, setWrong] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const submit = (value: string) => {
    if (pinMatches(parent?.pin, value)) {
      setParentUnlocked(true);
      onUnlock?.();
    } else {
      setWrong((w) => w + 1);
      setCode("");
    }
  };

  const onChange = (raw: string) => {
    const next = raw.replace(/\D/g, "").slice(0, 4);
    setCode(next);
    if (next.length === 4) submit(next);
  };

  return (
    <div style={{ padding: "36px 38px", display: "flex", flexDirection: "column", gap: 22, flex: 1, minHeight: 0 }}>
      <div>
        <SectionLabel>HOUSEHOLD</SectionLabel>
        <h1 style={{ margin: "8px 0 0", fontSize: 42, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.05, maxWidth: 620 }}>{title}</h1>
        <p style={{ margin: "10px 0 0", fontSize: 17, lineHeight: 1.5, color: "var(--kc-ink-muted)", maxWidth: 520 }}>
          {lede ?? "Four digits, set by whoever looks after the settings. Practising never asks for it."}
        </p>
      </div>
      <label style={{ display: "flex", flexDirection: "column", gap: 12, width: "max-content", cursor: "text" }} onClick={() => inputRef.current?.focus()}>
        <SectionLabel size="meta">FOUR-DIGIT CODE</SectionLabel>
        <div style={{ display: "flex", gap: 10 }}>
          {[0, 1, 2, 3].map((i) => {
            const filled = i < code.length;
            const current = i === code.length;
            return (
              <span key={i} style={{ width: 64, height: 76, borderRadius: "var(--kc-radius-control)", boxSizing: "border-box", background: filled ? "var(--kc-mint-wash)" : "var(--kc-panel)", border: current ? "1.5px solid var(--kc-mint)" : wrong && !code ? "1px solid var(--kc-clay)" : "1px solid var(--kc-border)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--kc-font-mono)", fontSize: 26, color: "var(--kc-ink)" }}>
                {filled ? "•" : ""}
              </span>
            );
          })}
        </div>
        <input ref={inputRef} autoFocus inputMode="numeric" pattern="\d*" autoComplete="off" aria-label="Household code" value={code} onChange={(e) => onChange(e.target.value)} style={{ position: "absolute", opacity: 0, width: 1, height: 1, pointerEvents: "none" }} />
      </label>
      {wrong > 0 && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--kc-clay)" }}>
          <Icon name="error" size={20} />
          That is not the code. Try again.
        </span>
      )}
      <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 16 }}>
        <Button icon="lock_open" onClick={() => submit(code)} disabled={code.length < 4}>Unlock</Button>
        <span style={{ fontSize: 14, color: "var(--kc-ink-dim)" }}>Stays unlocked until you lock it again or close the app.</span>
      </div>
    </div>
  );
}
