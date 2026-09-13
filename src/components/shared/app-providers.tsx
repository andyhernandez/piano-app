"use client";
import * as React from "react";
import { useAppStore } from "@/lib/store/app-store";
import { CelebrationToaster } from "./celebrations";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const boot = useAppStore((s) => s.boot);
  const booted = useAppStore((s) => s.booted);
  React.useEffect(() => { void boot(); }, [boot]);
  return (
    <>
      {booted ? children : <BootSplash />}
      <CelebrationToaster />
    </>
  );
}

function BootSplash() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="text-5xl animate-bounce-soft">🎹</div>
        <div className="font-display text-xl">KeyCadence</div>
      </div>
    </div>
  );
}
