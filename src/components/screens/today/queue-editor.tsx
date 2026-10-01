"use client";
import * as React from "react";
import { Icon, Button } from "@/components/ds";
import type { QueueState } from "@/components/ds";
import type { BlockWeights, BlockType, Child, Session } from "@/lib/types";
import { BLOCK_ORDER } from "@/lib/types";
import { useAppStore } from "@/lib/store/app-store";
import type { SessionPlan } from "@/lib/store/app-store";
import { buildQueue, orderedBlocks, TEMPO_GLYPH } from "@/lib/engine/queue";
import { DISCIPLINE, fmtClock } from "@/lib/engine/record";
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

/** A setting chip; a leading quarter-note glyph is drawn in the music font. */
function Chip({ text, tone = "cream" }: { text: string; tone?: "cream" | "indigo" }) {
  const tempo = text.startsWith(TEMPO_GLYPH);
  return (
    <span style={{ height: 30, padding: "0 10px", borderRadius: 999, background: tone === "indigo" ? "var(--kc-indigo-wash)" : "var(--kc-cream)", display: "inline-flex", alignItems: "center", gap: 2, fontSize: 13, fontWeight: 800, color: tone === "indigo" ? "var(--kc-indigo-shadow)" : "var(--kc-ink)", whiteSpace: "nowrap" }}>
      {tempo ? <><span style={{ fontFamily: "var(--kc-font-music)" }}>{TEMPO_GLYPH}</span>{text.slice(TEMPO_GLYPH.length)}</> : text}
    </span>
  );
}

function StepButton({ icon, label, onClick, disabled }: { icon: string; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} disabled={disabled} style={{ width: 30, height: 30, borderRadius: 10, border: "2px solid var(--kc-border)", background: "var(--kc-panel)", color: "var(--kc-ink)", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.4 : 1, boxSizing: "border-box" }}>
      <Icon name={icon} size={18} />
    </button>
  );
}

/**
 * The own-plan queue: seven compact rows (drag handle, icon tile, name and detail, setting chips, a −/time/+
 * stepper, a menu) with a segmented total bar beneath. Edits persist to the profile's settings so the session
 * runner walks the same list.
 */
export function QueueEditor({ child, plan, session, newTypes = [] }: { child: Child; plan: SessionPlan; session: Session | null; /** Stops the player has never completed, which carry a "new" chip. */ newTypes?: BlockType[] }) {
  const updateSettings = useAppStore((s) => s.updateSettings);
  const [adding, setAdding] = React.useState(false);
  const [dragging, setDragging] = React.useState<number | null>(null);
  const order = orderedBlocks(child);
  const rows = buildQueue(child, plan);
  const states = rowStates(order, session);
  const locked = !!session;
  const customised = !!child.settings.queueOrder || !!child.settings.extraBlocks?.length || !!child.settings.weightsOverride;

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
  const drop = (from: number, to: number) => {
    if (from === to) return;
    const next = order.slice();
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    persist(next);
  };
  const skip = (i: number) => persist(order.filter((_, k) => k !== i));
  const add = (t: BlockType) => { persist([...order, t]); setAdding(false); };
  const reset = () => void updateSettings(child.id, { queueOrder: undefined, extraBlocks: undefined, weightsOverride: null });

  /** Nudge one block's share by a minute; the weights and the session length follow. */
  const nudge = (t: BlockType, delta: number) => {
    const seconds = { ...plan.blockSeconds };
    seconds[t] = Math.max(60, seconds[t] + delta);
    const total = BLOCK_ORDER.reduce((a, b) => a + seconds[b], 0);
    const weights = normalize(Object.fromEntries(BLOCK_ORDER.map((b) => [b, seconds[b] / total])) as BlockWeights);
    void updateSettings(child.id, { weightsOverride: weights, sessionMinutes: Math.max(5, Math.round(total / 60)) });
  };

  const missing = BLOCK_ORDER.filter((t) => !order.includes(t));
  const total = rows.reduce((a, q) => a + q.seconds, 0);
  const planned = child.settings.sessionMinutes;

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 9 }}>
        {rows.map((q, i) => {
          const state = states[i];
          const again = order.indexOf(q.type) !== i;
          const current = state === "current";
          const done = state === "done";
          const chips = newTypes.includes(q.type) ? [...q.settings, "new"] : q.settings;
          return (
            <div
              key={`${q.type}-${i}`}
              draggable={!locked}
              onDragStart={() => setDragging(i)}
              onDragOver={(e) => { if (dragging !== null) e.preventDefault(); }}
              onDrop={() => { if (dragging !== null) drop(dragging, i); setDragging(null); }}
              onDragEnd={() => setDragging(null)}
              style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0, background: done ? "var(--kc-mint-wash)" : "var(--kc-panel)", border: `2px solid ${current ? "var(--kc-indigo)" : done ? "transparent" : "var(--kc-border)"}`, borderRadius: 18, padding: "7px 14px 7px 8px", boxShadow: current ? "0 3px 0 0 var(--kc-indigo-shadow)" : done ? "none" : "0 3px 0 0 var(--kc-border)", opacity: dragging === i ? 0.5 : 1, boxSizing: "border-box" }}
            >
              <Icon name="drag_indicator" size={22} color="var(--kc-ink-faint)" style={{ cursor: locked ? "default" : "grab" }} />
              <span style={{ width: 36, height: 36, flex: "none", borderRadius: 12, background: current ? "var(--kc-indigo)" : done ? "var(--kc-mint)" : "var(--kc-indigo-wash)", color: current ? "#ffffff" : done ? "var(--kc-ink)" : "var(--kc-indigo)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name={done ? "check" : q.icon} size={24} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 18, fontWeight: 600, lineHeight: 1.15 }}>{again ? `${q.title} — again` : q.title}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--kc-ink-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{q.detail}</div>
              </div>
              {chips.length > 0 && (
                <div style={{ display: "flex", gap: 6, flex: "none" }}>
                  {chips.map((c) => <Chip key={c} text={c} tone={c === "new" ? "indigo" : "cream"} />)}
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 4, flex: "none" }}>
                <StepButton icon="remove" label="A minute less" disabled={locked || q.seconds <= 60} onClick={() => nudge(q.type, -60)} />
                <span style={{ width: 48, textAlign: "center", fontFamily: "var(--kc-font-display)", fontSize: 17, fontWeight: 600 }}>{q.duration.replace(/^0/, "")}</span>
                <StepButton icon="add" label="A minute more" disabled={locked} onClick={() => nudge(q.type, 60)} />
              </div>
              <RowMenu
                label={`Options for ${DISCIPLINE[q.type].title.toLowerCase()}`}
                items={[
                  { label: "Move up", onClick: () => move(i, -1), disabled: locked || i === 0 },
                  { label: "Move down", onClick: () => move(i, 1), disabled: locked || i === order.length - 1 },
                  { label: "Skip today", onClick: () => skip(i), disabled: locked || order.length <= 1 },
                ]}
              />
            </div>
          );
        })}
        {adding ? (
          <div style={{ border: "3px dashed var(--kc-border-dashed)", borderRadius: 18, padding: "12px 16px", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", flexShrink: 0 }}>
            <span style={{ fontFamily: "var(--kc-font-display)", fontSize: 16, fontWeight: 600, marginRight: 6 }}>Add to today</span>
            {BLOCK_ORDER.map((t) => (
              <Button key={t} size="pill" variant="secondary" onClick={() => add(t)}>
                {missing.includes(t) ? `${DISCIPLINE[t].title} (add back)` : DISCIPLINE[t].title}
              </Button>
            ))}
            <Button size="pill" variant="quiet" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        ) : (
          <button type="button" disabled={locked} onClick={() => setAdding(true)} style={{ border: "3px dashed var(--kc-border-dashed)", borderRadius: 18, padding: "10px 16px", background: "transparent", display: "flex", alignItems: "center", gap: 10, flexShrink: 0, cursor: locked ? "default" : "pointer", color: "var(--kc-ink-faint)", fontFamily: "var(--kc-font-display)", fontSize: 16, fontWeight: 600, textAlign: "left", opacity: locked ? 0.5 : 1 }}>
            <Icon name="add_circle" size={22} />
            Add a stop · drag a row to reorder
          </button>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "none" }}>
        <span style={{ flex: 1, height: 12, borderRadius: 999, background: "var(--kc-hairline)", overflow: "hidden", display: "flex" }}>
          {rows.map((q, i) => <span key={`${q.type}-${i}`} style={{ display: "block", width: `${((q.seconds / Math.max(1, total)) * 100).toFixed(2)}%`, height: "100%", background: i % 2 ? "#7a73ee" : "var(--kc-indigo)" }} />)}
        </span>
        <span style={{ fontFamily: "var(--kc-font-display)", fontSize: 18, fontWeight: 600 }}>{fmtClock(total).replace(/^0/, "")}</span>
        <span style={{ fontSize: 14, fontWeight: 800, color: "var(--kc-ink-faint)" }}>of {planned} planned</span>
        {customised && !locked && <Button variant="quiet" size="pill" onClick={reset}>Reset to suggested</Button>}
      </div>
    </div>
  );
}
