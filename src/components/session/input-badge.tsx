"use client";
import { Mic, Piano, Timer } from "lucide-react";
import type { InputMode } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

export function InputBadge({ mode, label }: { mode: InputMode; label?: string }) {
  const Icon = mode === "midi" ? Piano : mode === "mic" ? Mic : Timer;
  const text = mode === "midi" ? "MIDI" : mode === "mic" ? "Mic" : "Timer";
  return (
    <Badge variant={mode === "timer" ? "muted" : "accent"} title={label}>
      <Icon className="h-3.5 w-3.5" /> {text}
    </Badge>
  );
}
