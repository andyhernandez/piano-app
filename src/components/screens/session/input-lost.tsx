"use client";
import * as React from "react";
import type { BlockType, Child, InputMode, Session } from "@/lib/types";
import { getInput } from "@/lib/input/manager";
import { DISCIPLINE, fmtClock } from "@/lib/engine/record";
import { STOP_SHORT } from "@/lib/engine/queue";
import { Button, Headline, Icon, Panel, Pill, Small, Tick } from "@/components/ds";
import { blockHeadline, capitalize, numberWord } from "./words";

/**
 * E1 — the keyboard or microphone stopped answering mid-stop. The clock is stopped; nothing is lost. Three
 * cards: look for the device again, listen with the microphone instead (the recommended one), or carry on
 * with the timer.
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

  const tile = (icon: string, on: boolean) => (
    <span style={{ width: 52, height: 52, flex: "none", borderRadius: 16, background: on ? "var(--kc-indigo)" : "var(--kc-cream)", color: on ? "#ffffff" : "var(--kc-ink)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Icon name={icon} size={28} />
    </span>
  );
  const cardTitle = (text: string) => <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 20, fontWeight: 600, lineHeight: 1.15 }}>{text}</div>;
  const body: React.CSSProperties = { fontSize: 15, fontWeight: 700, lineHeight: 1.45, color: "var(--kc-ink-muted)" };

  return (
    <div style={{ position: "absolute", inset: 0, background: "var(--kc-base)", padding: "26px 32px", display: "flex", flexDirection: "column", gap: 20, minHeight: 0, overflow: "auto" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 18 }}>
        <Tick />
        <div style={{ flex: 1 }}>
          <Headline size={44} title={`The ${device} stopped answering.`} lede={`Everything played so far is saved. Keep playing either way — pick what should listen for the rest of this stop.`} />
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }}>
        <Panel padding="roomy" style={{ minHeight: 0, borderRadius: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>{tile("piano", false)}{cardTitle("The keyboard")}</div>
          <div><Pill tone="neutral" icon="link_off">{lostMode === "mic" ? "Not plugged in" : "Not responding"}</Pill></div>
          <div style={body}>
            {ago != null ? `Last note heard ${ago} seconds ago. ` : ""}Usually the USB cable at the keyboard end, or the keyboard went to sleep. Press a key and it reconnects on its own.
          </div>
          <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
            <Button variant="secondary" size="control" icon="refresh" disabled={looking} onClick={() => void lookAgain()} style={{ alignSelf: "flex-start", height: 56 }}>Look again</Button>
            {note && lostMode !== "mic" && <Small color="var(--kc-indigo)">{note}</Small>}
          </div>
        </Panel>
        <Panel padding="roomy" state="current" style={{ minHeight: 0, borderRadius: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>{tile("mic", true)}{cardTitle("The microphone")}</div>
          <div><Pill tone="indigo-fill" icon="hearing">{lostMode === "mic" ? "Listen again" : "Ready to listen"}</Pill></div>
          <div style={body}>Pitch and pulse, one hand at a time. {DISCIPLINE[type].title} carries on — the stop keeps its level and its minutes.</div>
          <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
            <Button size="control" icon="mic" disabled={looking} onClick={() => void (lostMode === "mic" ? lookAgain() : listenWithMic())} style={{ alignSelf: "flex-start" }}>Listen with the mic</Button>
            {note && lostMode === "mic" && <Small color="var(--kc-indigo)">{note}</Small>}
          </div>
        </Panel>
        <Panel padding="roomy" style={{ minHeight: 0, borderRadius: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>{tile("timer", false)}{cardTitle("Just the timer")}</div>
          <div><Pill tone="neutral">Minutes only</Pill></div>
          <div style={body}>Nothing listens. You say when the stop is done, and the record keeps the time and the page you read.</div>
          <div style={{ marginTop: "auto" }}>
            <Button variant="secondary" size="control" onClick={() => void carryOnWithTimer()} style={{ alignSelf: "flex-start", height: 56 }}>Carry on with the timer</Button>
          </div>
        </Panel>
      </div>
      <Panel padding="card" style={{ flexDirection: "row", alignItems: "center", gap: 16, flex: "none" }}>
        <Icon name="verified" size={30} color="var(--kc-mint-ink)" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 18, fontWeight: 600, lineHeight: 1.15 }}>{kept.length ? `${capitalize(numberWord(kept.length))} stop${kept.length === 1 ? "" : "s"} already in the record` : "The clock is stopped"}</div>
          <Small>
            {kept.length ? `${kept.map((b) => `${STOP_SHORT[b.type]} ${fmtClock(b.durationSec).replace(/^0/, "")}${blockHeadline(b).text !== "DONE" ? ` · ${blockHeadline(b).text.toLowerCase()}` : ""}`).join(". ")}. ` : ""}
            The rest of this stop is marked as measured by whatever you pick.
          </Small>
        </div>
        <Pill tone="mint">Nothing lost</Pill>
      </Panel>
    </div>
  );
}
