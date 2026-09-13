"use client";
import * as React from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { useAppStore } from "@/lib/store/app-store";
import { hashPin, pinMatches } from "./helpers";

/** Set, change or remove the 4-digit grown-up PIN. Stored hashed (see helpers.ts). */
export function PinSettings() {
  const parent = useAppStore((s) => s.parent);
  const updateParent = useAppStore((s) => s.updateParent);
  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const hasPin = !!parent?.pin;

  const save = async () => {
    if (hasPin && !pinMatches(parent!.pin!, current)) return setMsg({ ok: false, text: "The current PIN didn't match." });
    if (!/^\d{4}$/.test(next)) return setMsg({ ok: false, text: "The new PIN must be exactly 4 digits." });
    if (next !== confirm) return setMsg({ ok: false, text: "The two new PINs don't match." });
    await updateParent({ pin: hashPin(next) });
    setCurrent(""); setNext(""); setConfirm("");
    setMsg({ ok: true, text: "PIN saved. The grown-ups area now asks for it." });
  };

  const remove = async () => {
    if (!pinMatches(parent!.pin!, current)) return setMsg({ ok: false, text: "Enter the current PIN to remove it." });
    await updateParent({ pin: null });
    setCurrent("");
    setMsg({ ok: true, text: "PIN removed. The gate falls back to a quick maths question." });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" /> Grown-up PIN</CardTitle>
        <CardDescription>{hasPin ? "A PIN protects this area." : "No PIN yet: the area is protected by a maths question only. Add a 4-digit PIN for a firmer lock."}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-3">
          {hasPin && (
            <div><Label htmlFor="pin-current">Current PIN</Label><Input id="pin-current" type="password" inputMode="numeric" maxLength={4} value={current} onChange={(e) => setCurrent(e.target.value.replace(/\D/g, ""))} autoComplete="off" /></div>
          )}
          <div><Label htmlFor="pin-next">New PIN</Label><Input id="pin-next" type="password" inputMode="numeric" maxLength={4} value={next} onChange={(e) => setNext(e.target.value.replace(/\D/g, ""))} autoComplete="new-password" /></div>
          <div><Label htmlFor="pin-confirm">Repeat new PIN</Label><Input id="pin-confirm" type="password" inputMode="numeric" maxLength={4} value={confirm} onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ""))} autoComplete="new-password" /></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={save}>{hasPin ? "Change PIN" : "Set PIN"}</Button>
          {hasPin && <Button variant="outline" onClick={remove}>Remove PIN</Button>}
        </div>
        {msg && <p className={msg.ok ? "text-sm font-semibold text-accent-foreground" : "text-sm font-semibold text-destructive"}>{msg.text}</p>}
      </CardContent>
    </Card>
  );
}
