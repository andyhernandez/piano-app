"use client";
import { getAudio } from "@/lib/audio";

/**
 * Open the skill check from a tap. The ear check plays its first phrase on arrival, and iOS only lets audio start
 * inside a user gesture, so the unlock happens here, on the tap that opens the screen.
 */
export function openSkillCheck(push: (href: string) => void) {
  void getAudio().unlock().catch(() => undefined);
  push("/skill-check");
}
