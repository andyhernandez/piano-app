"use client";
import * as React from "react";
import { Shirt } from "lucide-react";
import type { Child } from "@/lib/types";
import { useAppStore } from "@/lib/store/app-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import { Companion } from "./companion";
import { outfitMeta } from "./outfits";

/** Pick an outfit for the companion from what the kid has unlocked, with a live preview. */
export function Wardrobe({ child }: { child: Child }) {
  const updateChild = useAppStore((s) => s.updateChild);
  const [preview, setPreview] = React.useState<string | null>(null);
  const outfits = child.unlocks.outfits.length ? child.unlocks.outfits : ["default"];
  const shown = preview ?? child.companion.outfit;
  const previewState = { ...child.companion, outfit: shown };

  async function choose(id: string) {
    setPreview(id);
    await updateChild(child.id, (c) => ({ ...c, companion: { ...c.companion, outfit: id } }));
    setPreview(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Shirt className="h-5 w-5" /> Wardrobe</CardTitle>
        <CardDescription>Finish regions and open chests to find more outfits.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-3">
          <Companion state={previewState} mood="wave" size={120} />
          <div>
            <div className="font-display text-xl font-semibold">{child.companion.name}</div>
            <div className="text-sm text-muted-foreground">Wearing: {outfitMeta(shown).name}</div>
          </div>
        </div>
        <ul className="grid w-full grid-cols-3 gap-2 sm:grid-cols-4">
          {outfits.map((id) => {
            const meta = outfitMeta(id);
            const active = id === child.companion.outfit;
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => choose(id)}
                  aria-pressed={active}
                  className={cn("flex h-full min-h-20 w-full flex-col items-center justify-center gap-1 rounded-2xl border-2 p-2 text-center transition-all active:scale-95", active ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-muted")}
                >
                  <span className="text-2xl" aria-hidden>{meta.emoji}</span>
                  <span className="text-xs font-bold leading-tight">{meta.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
