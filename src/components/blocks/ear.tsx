"use client";
import * as React from "react";
import type { BlockProps } from "./types";
import { BottomBar, Button } from "@/components/ds";

/** Placeholder until the Ear block lands: lets a session pass through the stop. */
export function EarBlock({ nextTitle, onDone, inputMode }: BlockProps) {
  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1 }} />
      <BottomBar actions={<Button size="control" onClick={() => onDone({ completed: true, skipped: false, inputMode, details: { phrases: 0, byEarFirstTry: 0, foundOnStaff: 0 } })}>{nextTitle ? `Next — ${nextTitle}` : "Finish"}</Button>} />
    </div>
  );
}
