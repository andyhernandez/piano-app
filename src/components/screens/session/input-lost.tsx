"use client";
import * as React from "react";
import type { BlockType, Child, InputMode, Session } from "@/lib/types";
import { getInput } from "@/lib/input/manager";
import { DISCIPLINE, fmtClock } from "@/lib/engine/record";
import { Button, Headline, Icon, Panel, Pill } from "@/components/ds";
import { blockHeadline, capitalize, numberWord } from "./words";

/**
 * E1 — the keyboard or microphone stopped answering mid-block. The clock is stopped; nothing is lost. Three
 * cards: look for the device again, listen with the microphone instead, or carry on with the timer.
 */
export function InputLost({ session, child, type, lostMode, lastNoteAt, onResolved }: { session: Session; child: Child; type: BlockType; lostMode: InputMode; lastNoteAt: number | null; onResolved: (mode: InputMode) => void }) {
  const input = React.useMemo(() => getInput(), []);
  const [looking, setLooking] = React.useState(false);
  const [note, setNote] = React.useState<string | null>(null);
  const [now] = React.useState(() => Date.now());
  const device = lostMode === "mic" ? "microphone" : "keyboard";
  const ago = lastNoteAt ? Math.max(0, Math.round((now - lastNoteAt) / 1000)) : null;
  const kept = session.blocks.filter((b) => b.completed || b.skipped);

  const lookAgain = async () => {
    setLooking(true);
    setNote(null);
    await input.use(lostMode === "mic" ? "mic" : "midi", child.settings.micCalibration);
    setLooking(false);
    if (input.mode !== "timer" && input.connected) onResolved(input.mode);
    else setNote(lostMode === "mic" ? "The microphone still isn't answering." : "Nothing on the cable yet.");
  };
  const listenWithMic = async () => {
    setLooking(true);
    setNote(null);
    await input.use("mic", child.settings.micCalibration);
    setLooking(false);
    if (input.mode === "mic") onResolved("mic");
    else setNote("The microphone didn't answer. Check the browser's permission.");
  };
  const carryOnWithTimer = async () => {
    await input.use("timer", null);
    onResolved("timer");
  };

  return (
    <div style={{ position: "absolute", inset: 0, background: "var(--kc-base)", padding: "34px 38px", display: "flex", flexDirection: "column", gap: 26, minHeight: 0, overflow: "auto" }}>
      <Headline size={38} title={`The ${device} stopped answering.`} lede="Everything played so far is recorded. Keep playing either way — pick what should listen for the rest of the block." />
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14 }}>
        <Panel padding="roomy" style={{ minHeight: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}><Icon name="piano" size={26} color={lostMode === "mic" ? "var(--kc-ink-dim)" : "var(--kc-clay)"} /><span style={{ fontSize: 19, fontWeight: 600 }}>The keyboard</span></div>
          <Pill tone={lostMode === "mic" ? "neutral" : "clay"}>{lostMode === "mic" ? "NOT PLUGGED IN" : "NOT RESPONDING"}</Pill>
          <div style={{ fontSize: 15, lineHeight: 1.45, color: "var(--kc-ink-muted)" }}>
            {ago != null ? `Last note heard ${ago} seconds ago. ` : ""}Usually the USB cable at the keyboard end, or the keyboard went to sleep.
          </div>
          <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
            <Button variant="secondary" size="control" disabled={looking} onClick={() => void lookAgain()} style={{ width: "100%" }}>Look again</Button>
            <span style={{ fontSize: 14, color: note && lostMode !== "mic" ? "var(--kc-clay)" : "var(--kc-ink-faint)" }}>{note && lostMode !== "mic" ? note : "Press a key and it reconnects on its own."}</span>
          </div>
        </Panel>
        <Panel padding="roomy" state="current" style={{ minHeight: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}><Icon name="mic" size={26} color="var(--kc-mint)" /><span style={{ fontSize: 19, fontWeight: 600 }}>The microphone</span></div>
          <Pill tone="mint" icon="hearing">{lostMode === "mic" ? "LISTEN AGAIN" : "READY TO LISTEN"}</Pill>
          <div style={{ fontSize: 15, lineHeight: 1.45, color: "var(--kc-ink-muted)" }}>Pitch and pulse, one hand at a time. {DISCIPLINE[type].title} carries on; the block keeps its level and its minutes.</div>
          <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
            <Button size="control" disabled={looking} onClick={() => void (lostMode === "mic" ? lookAgain() : listenWithMic())} style={{ width: "100%" }}>Listen with the mic</Button>
            {note && lostMode === "mic" && <span style={{ fontSize: 14, color: "var(--kc-clay)" }}>{note}</span>}
          </div>
        </Panel>
        <Panel padding="roomy" style={{ minHeight: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}><Icon name="timer" size={26} color="var(--kc-ink-dim)" /><span style={{ fontSize: 19, fontWeight: 600 }}>Just the timer</span></div>
          <Pill>MINUTES ONLY</Pill>
          <div style={{ fontSize: 15, lineHeight: 1.45, color: "var(--kc-ink-muted)" }}>Nothing listens. You say when the block is done, and the record keeps the time and the page you read.</div>
          <div style={{ marginTop: "auto" }}>
            <Button variant="secondary" size="control" onClick={() => void carryOnWithTimer()} style={{ width: "100%" }}>Carry on with the timer</Button>
          </div>
        </Panel>
      </div>
      <Panel style={{ flexDirection: "row", alignItems: "center", gap: 22, flex: "none" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 600 }}>{kept.length ? `${capitalize(numberWord(kept.length))} block${kept.length === 1 ? " is" : "s are"} already in the record` : "The clock is stopped"}</div>
          <div style={{ fontSize: 14, color: "var(--kc-ink-dim)" }}>
            {kept.length ? `${kept.map((b) => `${DISCIPLINE[b.type].short} ${fmtClock(b.durationSec)}${blockHeadline(b).text !== "DONE" ? ` · ${blockHeadline(b).text.toLowerCase()}` : ""}`).join(", ")}. ` : ""}
            The rest of the block is marked as measured by whatever you pick.
          </div>
        </div>
        <Pill>{kept.length ? `${kept.length} KEPT` : "NOTHING LOST"}</Pill>
      </Panel>
    </div>
  );
}
