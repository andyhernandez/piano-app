"use client";
import type { BlockComponentProps } from "@/components/session/block-props";
import { BlockShell } from "@/components/session/block-shell";

/** STUB: to be implemented. */
export function RepertoireBlock(props: BlockComponentProps) {
  return (
    <BlockShell type="repertoire" remainingSec={props.remainingSec} plannedSec={props.plannedSec} onDone={() => props.onComplete()} onAddMinute={() => props.addSeconds(60)}>
      <p className="text-muted-foreground">Coming soon.</p>
    </BlockShell>
  );
}
