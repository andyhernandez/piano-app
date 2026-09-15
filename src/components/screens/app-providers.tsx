"use client";
import * as React from "react";
import { useAppStore } from "@/lib/store/app-store";
import { getInput } from "@/lib/input/manager";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const boot = useAppStore((s) => s.boot);
  const booted = useAppStore((s) => s.booted);
  React.useEffect(() => { void boot(); }, [boot]);
  React.useEffect(() => {
    // Dev handle for scripted screenshots: seed state through the store's own actions.
    if (process.env.NODE_ENV !== "production") Object.assign(window, { __kc: useAppStore, __kcInput: getInput() });
  }, []);
  if (!booted) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--kc-ink-dim)", fontSize: 17, fontWeight: 600 }}>KeyCadence</div>
    );
  }
  return <>{children}</>;
}
