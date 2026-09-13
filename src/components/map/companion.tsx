"use client";
import type { CompanionState } from "@/lib/types";

export type CompanionMood = "idle" | "cheer" | "wave" | "sleep" | "think";

/** STUB: replaced by the map agent with an animated SVG creature. */
export function Companion({ state, mood = "idle", size = 96 }: { state: CompanionState; mood?: CompanionMood; size?: number }) {
  const emoji = state.species === "note-sprite" ? "🎵" : state.species === "metronome-mouse" ? "🐭" : state.species === "clef-cat" ? "🐱" : "🐲";
  return <div style={{ width: size, height: size, fontSize: size * 0.7 }} className={`flex items-center justify-center ${mood === "cheer" ? "animate-bounce-soft" : ""}`} aria-label={`${state.name} the ${state.species}`}>{emoji}</div>;
}
