"use client";
import * as React from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { BLOCK_LABELS, BLOCK_ORDER, type BlockType, type BlockWeights } from "@/lib/types";
import { normalize, weightsToPercent } from "@/lib/engine/weights";

const SHORT: Record<BlockType, string> = {
  scales: "Scales",
  rhythm: "Rhythm",
  reading: "Reading",
  theory: "Theory",
  repertoire: "Repertoire",
  improv: "Improv",
};

/**
 * Six block-weight sliders (percent). `value` null means "follow the skill profile" and the sliders show
 * `derived`. Moving any slider forks from the shown weights into an override; "Reset to profile" hands back null.
 * Stored values are raw fractions; the session engine normalizes them, so we show the live-normalized share too.
 */
export function WeightsEditor({ value, derived, onChange }: { value: BlockWeights | null; derived: BlockWeights; onChange: (v: BlockWeights | null) => void }) {
  const [drag, setDrag] = React.useState<{ block: BlockType; pct: number } | null>(null);
  const current = value ?? derived;
  const raw = weightsToPercent(current);
  const shown: Record<BlockType, number> = { ...raw };
  if (drag) shown[drag.block] = drag.pct;
  const shownWeights = BLOCK_ORDER.reduce((acc, b) => ({ ...acc, [b]: shown[b] / 100 }), {} as BlockWeights);
  const normalized = weightsToPercent(normalize(shownWeights));
  const rawTotal = BLOCK_ORDER.reduce((s, b) => s + shown[b], 0);

  const commit = (block: BlockType, pct: number) => {
    const next: BlockWeights = { ...current, [block]: pct / 100 };
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {value ? <Badge variant="secondary">Custom override</Badge> : <Badge variant="muted">Following skill profile</Badge>}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Sliders total {rawTotal}% · every block keeps at least 8%</span>
          <Button variant="ghost" size="sm" onClick={() => onChange(null)} disabled={!value}><RotateCcw className="h-4 w-4" /> Reset to profile</Button>
        </div>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {BLOCK_ORDER.map((b) => (
          <li key={b} className="rounded-2xl border-2 bg-card px-4 py-2">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-bold" title={BLOCK_LABELS[b]}>{SHORT[b]}</span>
              <span className="tabular-nums text-muted-foreground">
                <b className="text-foreground">{shown[b]}%</b>{normalized[b] !== shown[b] && <span> → {normalized[b]}% of session</span>}
              </span>
            </div>
            <Slider
              aria-label={`${BLOCK_LABELS[b]} share`}
              min={0}
              max={60}
              step={1}
              value={[shown[b]]}
              onValueChange={([v]) => setDrag({ block: b, pct: v })}
              onValueCommit={([v]) => { setDrag(null); commit(b, v); }}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
