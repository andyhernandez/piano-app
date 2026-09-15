"use client";
import type { BlockProps } from "./types";
import { Button } from "@/components/ds";

/** PLACEHOLDER: replaced by the block implementation. */
export function HarmonyBlock({ onDone, nextTitle }: BlockProps) {
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 16, color: "var(--kc-ink-dim)" }}>
      <span>Harmony · coming next</span>
      <Button onClick={() => onDone({ completed: true, skipped: false })}>{nextTitle ? `Next — ${nextTitle}` : "Finish"}</Button>
    </div>
  );
}
