"use client";
import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Delete, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppStore } from "@/lib/store/app-store";
import { cn } from "@/lib/utils/cn";
import { pinMatches } from "./helpers";

/**
 * Kid-proof gate for the grown-ups area. With a PIN set: 4-digit keypad. Without one: a quick
 * arithmetic question a 6-12 year old is unlikely to answer on the first try (and no guilt if they do).
 */
export function PinGate({ children }: { children: React.ReactNode }) {
  const parent = useAppStore((s) => s.parent);
  const unlocked = useAppStore((s) => s.parentUnlocked);
  const setUnlocked = useAppStore((s) => s.setParentUnlocked);

  if (unlocked) return <>{children}</>;
  if (parent?.pin) return <PinPad pin={parent.pin} onUnlock={() => setUnlocked(true)} />;
  return <MathGate onUnlock={() => setUnlocked(true)} />;
}

function PinPad({ pin, onUnlock }: { pin: string; onUnlock: () => void }) {
  const [entered, setEntered] = React.useState("");
  const [shake, setShake] = React.useState(0);
  const [wrong, setWrong] = React.useState(false);

  const press = (d: string) => {
    if (entered.length >= 4) return;
    const next = entered + d;
    setEntered(next);
    setWrong(false);
    if (next.length === 4) {
      if (pinMatches(pin, next)) {
        onUnlock();
      } else {
        setShake((s) => s + 1);
        setWrong(true);
        window.setTimeout(() => setEntered(""), 350);
      }
    }
  };

  return (
    <GateFrame title="Grown-ups only" description="Enter the 4-digit grown-up PIN.">
      <motion.div key={shake} animate={shake ? { x: [0, -10, 10, -6, 6, 0] } : undefined} transition={{ duration: 0.35 }} className="flex justify-center gap-3" aria-live="polite" aria-label={`${entered.length} of 4 digits entered`}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cn("h-5 w-5 rounded-full border-2 transition-colors", i < entered.length ? (wrong ? "border-destructive bg-destructive" : "border-primary bg-primary") : "border-border bg-card")} />
        ))}
      </motion.div>
      {wrong && <p className="text-center text-sm font-semibold text-destructive">That PIN didn&apos;t match. Try again.</p>}
      <div className="mx-auto grid w-full max-w-xs grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <Button key={d} variant="outline" size="lg" className="h-16 text-2xl" onClick={() => press(d)} aria-label={`Digit ${d}`}>{d}</Button>
        ))}
        <span aria-hidden />
        <Button variant="outline" size="lg" className="h-16 text-2xl" onClick={() => press("0")} aria-label="Digit 0">0</Button>
        <Button variant="ghost" size="lg" className="h-16" onClick={() => { setEntered((e) => e.slice(0, -1)); setWrong(false); }} aria-label="Delete last digit"><Delete className="h-6 w-6" /></Button>
      </div>
    </GateFrame>
  );
}

function makeQuestion() {
  const a = 3 + Math.floor(Math.random() * 7); // 3..9
  const b = 3 + Math.floor(Math.random() * 7);
  const answer = a * b;
  const wrongs = new Set<number>();
  while (wrongs.size < 2) {
    const delta = (Math.floor(Math.random() * 3) + 1) * (Math.random() < 0.5 ? -1 : 1) * (Math.random() < 0.5 ? 1 : a);
    const w = answer + delta;
    if (w > 0 && w !== answer) wrongs.add(w);
  }
  const choices = [answer, ...wrongs].sort(() => Math.random() - 0.5);
  return { a, b, answer, choices };
}

function MathGate({ onUnlock }: { onUnlock: () => void }) {
  const [q, setQ] = React.useState(makeQuestion);
  const [missed, setMissed] = React.useState(false);
  const choose = (n: number) => {
    if (n === q.answer) onUnlock();
    else { setMissed(true); setQ(makeQuestion()); }
  };
  return (
    <GateFrame title="I'm a grown-up" description="Quick check before the settings. No PIN is set yet; you can add one inside.">
      <p className="text-center font-display text-4xl font-semibold">What is {q.a} × {q.b}?</p>
      <div className="mx-auto grid w-full max-w-sm grid-cols-3 gap-3">
        {q.choices.map((c) => (
          <Button key={c} variant="outline" size="lg" className="h-16 text-2xl" onClick={() => choose(c)}>{c}</Button>
        ))}
      </div>
      {missed && <p className="text-center text-sm text-muted-foreground">Not quite. Here&apos;s another one.</p>}
    </GateFrame>
  );
}

function GateFrame({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-5 py-6">
      <Card>
        <CardHeader className="items-center text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-muted"><Lock className="h-7 w-7 text-muted-foreground" /></div>
          <CardTitle className="text-3xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">{children}</CardContent>
      </Card>
      <p className="flex items-center justify-center gap-2 text-center text-sm text-muted-foreground">
        <ShieldCheck className="h-4 w-4" /> Kids: this area is for parents and teachers. <Link href="/" className="font-bold text-primary underline-offset-4 hover:underline">Back to Today</Link>
      </p>
    </div>
  );
}
