"use client";
import * as React from "react";
import { Button, Headline, ActionNote, Icon } from "@/components/ds";
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

const KEYS: (string | null)[] = ["1", "2", "3", "4", "5", "6", "7", "8", "9", null, "0", "⌫"];

/**
 * Four big boxes for the household code and an on-screen keypad beside them. Sits in the main column where the
 * gated content will appear; the rail, when there is one, stays. A hardware keyboard works too. Compares against
 * the hashed code on the parent record.
 */
export function CodePrompt({ title = "The grown-up bit sits behind a code", lede, onUnlock }: { title?: string; lede?: React.ReactNode; onUnlock?: () => void }) {
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
    setWrong(0);
    if (next.length === 4) submit(next);
  };
  const press = (k: string) => {
    if (k === "⌫") onChange(code.slice(0, -1));
    else onChange(code + k);
    inputRef.current?.focus();
  };

  return (
    <div style={{ flex: 1, minHeight: 0, padding: "34px 40px", display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 40, flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 26 }}>
          <Headline kicker="Household" title={title} lede={lede ?? "Profiles, settings and the teacher link. Practising never asks for it."} />
          <label style={{ display: "flex", flexDirection: "column", gap: 12, width: "max-content", cursor: "text" }} onClick={() => inputRef.current?.focus()}>
            <span style={{ fontSize: 14, fontWeight: 900, letterSpacing: ".06em", color: "var(--kc-ink-faint)" }}>FOUR-DIGIT CODE</span>
            <div style={{ display: "flex", gap: 12 }}>
              {[0, 1, 2, 3].map((i) => {
                const filled = i < code.length;
                const current = i === code.length;
                const look: React.CSSProperties = filled
                  ? { background: "var(--kc-indigo-wash)", border: "2px solid var(--kc-lilac)", color: "var(--kc-indigo)" }
                  : current ? { background: "var(--kc-panel)", border: "3px solid var(--kc-indigo)" } : { background: "var(--kc-panel)", border: "2px solid var(--kc-border)" };
                return (
                  <span key={i} style={{ width: 76, height: 92, borderRadius: 20, boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--kc-font-display)", fontSize: 40, ...look }}>
                    {filled ? "•" : ""}
                  </span>
                );
              })}
            </div>
            <input ref={inputRef} autoFocus inputMode="numeric" pattern="\d*" autoComplete="off" aria-label="Household code" value={code} onChange={(e) => onChange(e.target.value)} style={{ position: "absolute", opacity: 0, width: 1, height: 1, pointerEvents: "none" }} />
          </label>
          {wrong > 0 && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 800, color: "var(--kc-indigo-shadow)" }}>
              <Icon name="info" size={22} color="var(--kc-indigo)" />
              That is not the code. Try again.
            </span>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Button icon="lock_open" onClick={() => submit(code)} disabled={code.length < 4}>Unlock</Button>
            <ActionNote>Stays unlocked until you lock it again or close the app.</ActionNote>
          </div>
        </div>
        <div style={{ width: 300, flex: "none", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {KEYS.map((k, i) => k === null ? <span key={i} /> : (
            <button key={k} type="button" aria-label={k === "⌫" ? "Delete" : k} onClick={() => press(k)} className="kc-press kc-btn-secondary" style={{ height: 76, borderRadius: 20, background: "var(--kc-panel)", border: "2px solid var(--kc-border)", boxShadow: "var(--kc-shadow-press)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--kc-font-display)", fontSize: 30, fontWeight: 600, color: "var(--kc-ink)", cursor: "pointer", padding: 0 }}>
              {k}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
