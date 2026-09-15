"use client";
import * as React from "react";
import { QueueRow, IconButton, Button, SectionLabel } from "@/components/ds";
import type { QueueState } from "@/components/ds";
import type { BlockType, Child, Session } from "@/lib/types";
import { BLOCK_ORDER } from "@/lib/types";
import { useAppStore } from "@/lib/store/app-store";
import type { SessionPlan } from "@/lib/store/app-store";
import { buildQueue, orderedBlocks } from "@/lib/engine/queue";
import { DISCIPLINE } from "@/lib/engine/record";
import { normalize } from "@/lib/engine/weights";
import { RowMenu } from "./row-menu";

/** Which rows are done, current or pending given the session in progress (a repeated type counts once). */
export function rowStates(order: BlockType[], session: Session | null): QueueState[] {
  const seen = new Set<BlockType>();
  const states: QueueState[] = order.map((t) => {
    const r = session?.blocks.find((b) => b.type === t);
    if (r && (r.completed || r.skipped) && !seen.has(t)) { seen.add(t); return "done"; }
    return "pending";
  });
  const firstPending = states.indexOf("pending");
  if (firstPending >= 0) states[firstPending] = "current";
  return states;
}

/**
 * The own-plan queue: every block, reorderable from the row menu, durations on a stepper, a dashed row to add
 * a block. Edits persist to the profile's settings so the session runner walks the same list.
 */
export function QueueEditor({ child, plan, session }: { child: Child; plan: SessionPlan; session: Session | null }) {
  const updateSettings = useAppStore((s) => s.updateSettings);
  const [adding, setAdding] = React.useState(false);
  const order = orderedBlocks(child);
  const rows = buildQueue(child, plan);
  const states = rowStates(order, session);
  const locked = !!session;
  const customised = !!child.settings.queueOrder || !!child.settings.extraBlocks?.length;

  const persist = (next: BlockType[]) => {
    const extras = next.filter((t, i) => next.indexOf(t) !== i);
    void updateSettings(child.id, { queueOrder: next, extraBlocks: extras });
  };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const next = order.slice();
    [next[i], next[j]] = [next[j], next[i]];
    persist(next);
  };
  const skip = (i: number) => persist(order.filter((_, k) => k !== i));
  const add = (t: BlockType) => { persist([...order, t]); setAdding(false); };
  const reset = () => void updateSettings(child.id, { queueOrder: undefined, extraBlocks: undefined });

  /** Nudge one block's share by a minute; the weights and the session length follow. */
  const nudge = (t: BlockType, delta: number) => {
    const seconds = { ...plan.blockSeconds };
    seconds[t] = Math.max(60, seconds[t] + delta);
    const total = BLOCK_ORDER.reduce((a, b) => a + seconds[b], 0);
    const weights = normalize({ scales: seconds.scales / total, rhythm: seconds.rhythm / total, reading: seconds.reading / total, theory: seconds.theory / total, repertoire: seconds.repertoire / total, improv: seconds.improv / total });
    void updateSettings(child.id, { weightsOverride: weights, sessionMinutes: Math.max(5, Math.round(total / 60)) });
  };

  const missing = BLOCK_ORDER.filter((t) => !order.includes(t));

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
      {rows.map((q, i) => {
        const state = states[i];
        const again = order.indexOf(q.type) !== i;
        return (
          <QueueRow
            key={`${q.type}-${i}`}
            index={q.index}
            title={again ? `${q.title} — again` : q.title}
            detail={q.detail}
            duration={q.duration}
            settings={q.settings}
            state={state}
            draggable={false}
            style={{ flexShrink: 0 }}
            menu={
              <div style={{ display: "flex", alignItems: "center", gap: 6, flex: "none" }}>
                <IconButton icon="remove" shape="square" size={30} label="A minute less" disabled={locked || q.seconds <= 60} onClick={() => nudge(q.type, -60)} style={{ opacity: locked ? 0.4 : 1 }} />
                <IconButton icon="add" shape="square" size={30} label="A minute more" disabled={locked} onClick={() => nudge(q.type, 60)} style={{ opacity: locked ? 0.4 : 1 }} />
                <RowMenu
                  label={`Options for ${DISCIPLINE[q.type].title.toLowerCase()}`}
                  items={[
                    { label: "Move up", onClick: () => move(i, -1), disabled: locked || i === 0 },
                    { label: "Move down", onClick: () => move(i, 1), disabled: locked || i === order.length - 1 },
                    { label: "Skip today", onClick: () => skip(i), disabled: locked || order.length <= 1 },
                  ]}
                />
              </div>
            }
          />
        );
      })}
      {adding ? (
        <div style={{ border: "1px dashed var(--kc-border-dashed)", borderRadius: "var(--kc-radius-panel)", padding: "14px 20px", display: "flex", flexDirection: "column", gap: 10, flexShrink: 0 }}>
          <SectionLabel size="meta">ADD TO TODAY</SectionLabel>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {BLOCK_ORDER.map((t) => (
              <Button key={t} size="control" variant="secondary" onClick={() => add(t)}>
                {missing.includes(t) ? `${DISCIPLINE[t].title} (add back)` : DISCIPLINE[t].title}
              </Button>
            ))}
            <Button size="control" variant="quiet" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div style={{ border: "1px dashed var(--kc-border-dashed)", borderRadius: "var(--kc-radius-panel)", padding: "13px 20px", fontSize: 14, color: "var(--kc-ink-faint)", display: "flex", gap: 14, flexShrink: 0, alignItems: "center" }}>
          <button type="button" disabled={locked} onClick={() => setAdding(true)} style={{ flex: 1, background: "transparent", border: "none", padding: 0, textAlign: "left", color: "inherit", fontSize: "inherit", cursor: locked ? "default" : "pointer", fontFamily: "inherit" }}>
            + Add to today · reorder from the row menu · saved as your routine
          </button>
          {customised && !locked && (
            <button type="button" onClick={reset} style={{ background: "transparent", border: "none", padding: 0, color: "var(--kc-ink-dim)", fontSize: "inherit", cursor: "pointer", fontFamily: "inherit" }}>Back to the plan</button>
          )}
        </div>
      )}
    </div>
  );
}
