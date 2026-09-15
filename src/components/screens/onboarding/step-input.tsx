"use client";
import * as React from "react";
import { Button, Headline, Icon, Metric, Pill, SectionLabel } from "@/components/ds";
import { getInput } from "@/lib/input/manager";
import { micPermissionState } from "@/lib/input/mic";
import { nativeMidiAvailable, pairBluetoothKeyboard, probeAnyMidi } from "@/lib/input/native-midi";
import { midiToName } from "@/lib/music/notes";
import type { InputMode } from "@/lib/types";

type Probe = "probing" | "found" | "none";
type MicState = "granted" | "denied" | "prompt" | "unknown" | "asking";

/**
 * A2 · Instrument and input. Probes Web MIDI on mount and listens for a few notes; the three cards below are the
 * choice that becomes `inputModePreference`. Microphone permission is requested only when the mic is chosen.
 */
export function StepInput({ choice, onChoice, onContinue }: { choice: InputMode; onChoice: (m: InputMode) => void; onContinue: () => void }) {
  const [probe, setProbe] = React.useState<Probe>("probing");
  const [device, setDevice] = React.useState("MIDI keyboard");
  const [lastNote, setLastNote] = React.useState<string | null>(null);
  const [heard, setHeard] = React.useState(0);
  const [mic, setMic] = React.useState<MicState>("unknown");
  const [attempt, setAttempt] = React.useState(0);
  const retry = () => { setProbe("probing"); setAttempt((a) => a + 1); };
  const touched = React.useRef(false);

  // Probe the keyboard. A found keyboard becomes the default choice unless the person already picked something.
  React.useEffect(() => {
    let cancelled = false;
    const input = getInput();
    void probeAnyMidi().then(async (present) => {
      if (cancelled) return;
      if (present) await input.use("midi", null);
      if (cancelled) return;
      const found = present && input.mode === "midi";
      setProbe(found ? "found" : "none");
      setDevice(input.label);
      if (found && !touched.current) onChoice("midi");
    });
    void micPermissionState().then((s) => { if (!cancelled) setMic(s); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  // Notes from the keyboard, so the panel proves it is listening.
  React.useEffect(() => {
    const input = getInput();
    const off = input.onNote((e) => {
      if (e.kind !== "on") return;
      setLastNote(midiToName(e.midi));
      setHeard((n) => n + 1);
    });
    const change = input.onChange(() => { if (input.mode === "midi") setDevice(input.label); });
    return () => { off(); change(); };
  }, []);

  // Release whatever we opened when leaving the step; the skill check detects again from the saved preference.
  React.useEffect(() => () => { getInput().stop(); }, []);

  const pick = (m: InputMode) => {
    touched.current = true;
    onChoice(m);
    if (m === "mic" && (mic === "prompt" || mic === "unknown")) {
      setMic("asking");
      void getInput().use("mic", null).then(async () => {
        const state = await micPermissionState();
        setMic(getInput().mode === "mic" ? "granted" : state === "unknown" ? "denied" : state);
        getInput().stop();
        if (probe === "found") void getInput().use("midi", null);
      });
    }
  };

  const title = probe === "probing" ? "Listening for a keyboard." : probe === "found" ? "Your keyboard is already talking to us." : "No keyboard found yet.";
  const lede = probe === "probing"
    ? "Checking USB and Bluetooth MIDI. Everything below works without it — it just means we can hear exactly which note you played, not only that you played."
    : probe === "found"
      ? "Found over USB while you were reading step one. Everything below works without it — it just means we can hear exactly which note you played, not only that you played."
      : "Nothing on USB or Bluetooth MIDI right now. Everything below works without it — plug one in later and the header picks it up.";

  const micLine = mic === "granted" ? "Microphone allowed" : mic === "denied" ? "Blocked in the browser settings" : mic === "asking" ? "Asking the browser" : "Asks for permission once";
  const primary = choice === "midi" ? "Use the keyboard" : choice === "mic" ? "Use the microphone" : "Use the timer";

  const card = (m: InputMode): React.CSSProperties => ({
    background: "var(--kc-panel)", border: choice === m ? "1px solid var(--kc-mint-edge)" : "1px solid var(--kc-border)", boxShadow: choice === m ? "inset 0 0 0 0.5px var(--kc-mint-edge)" : "none",
    borderRadius: 11, padding: "20px 22px", height: 186, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 9, textAlign: "left", cursor: "pointer", color: "var(--kc-ink)", fontFamily: "var(--kc-font-sans)",
  });

  return (
    <div style={{ flex: 1, minHeight: 0, padding: 38, display: "flex", flexDirection: "column", gap: 26 }}>
      <Headline title={title} lede={lede} />

      {probe === "found" ? (
        <div style={{ background: "var(--kc-mint-wash)", border: "1.5px solid var(--kc-mint)", borderRadius: 11, padding: "24px 26px", display: "flex", alignItems: "center", gap: 22 }}>
          <Icon name="piano" size={34} color="var(--kc-mint)" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{device}</div>
            <div style={{ fontSize: 15, color: "var(--kc-ink-muted)" }}>{heard ? `${heard} note${heard === 1 ? "" : "s"} heard · play a few more if you like` : "Connected over MIDI · play a few notes"}</div>
          </div>
          <div style={{ display: "flex", gap: 26 }}>
            <Metric label="Notes heard" value={heard} />
            <Metric label="Last note" value={lastNote ?? "—"} />
          </div>
          <Button variant="secondary" size="control" onClick={retry}>Detect again</Button>
        </div>
      ) : (
        <div style={{ background: "var(--kc-panel)", border: "1px solid var(--kc-border)", borderRadius: 11, padding: "24px 26px", display: "flex", alignItems: "center", gap: 22 }}>
          <Icon name="piano" size={34} color={probe === "probing" ? "var(--kc-ink-muted)" : "var(--kc-ink-faint)"} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 600 }}>{probe === "probing" ? "Looking for a keyboard" : "No MIDI keyboard"}</div>
            <div style={{ fontSize: 15, color: "var(--kc-ink-muted)" }}>{probe === "probing" ? "A second or two." : "Plug one in over USB, then detect again. Bluetooth works on most tablets."}</div>
          </div>
          <div style={{ display: "flex", gap: 26 }}>
            <Metric label="Notes heard" value={heard} />
            <Metric label="Last note" value={lastNote ?? "—"} />
          </div>
          {nativeMidiAvailable() && <Button variant="secondary" size="control" icon="bluetooth" onClick={() => void pairBluetoothKeyboard().then(retry)}>Pair over Bluetooth</Button>}
          <Button variant="secondary" size="control" disabled={probe === "probing"} onClick={retry}>Detect again</Button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <SectionLabel>What changes if you practice without it</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
          <button type="button" onClick={() => pick("midi")} style={card("midi")}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Icon name="piano" size={20} color={choice === "midi" ? "var(--kc-mint)" : "var(--kc-ink-dim)"} /><span style={{ fontSize: 17, fontWeight: 600 }}>Keyboard connected</span></div>
            <div style={{ fontSize: 14, color: "var(--kc-ink-muted)", lineHeight: 1.45 }}>Every note and its timing. Sight reading marks the exact notehead you missed; timing reports drift in milliseconds.</div>
            <div style={{ marginTop: "auto" }}><Pill tone={choice === "midi" ? "mint" : "neutral"}>All six blocks</Pill></div>
          </button>
          <button type="button" onClick={() => pick("mic")} style={card("mic")}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Icon name="mic" size={20} color={choice === "mic" ? "var(--kc-mint)" : "var(--kc-ink-dim)"} /><span style={{ fontSize: 17, fontWeight: 600 }}>Microphone</span></div>
            <div style={{ fontSize: 14, color: "var(--kc-ink-muted)", lineHeight: 1.45 }}>Pitch and pulse from sound. Good enough to catch a wrong note in a slow scale; it can&apos;t separate two hands.</div>
            <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 10 }}><Pill tone={choice === "mic" ? "mint" : "neutral"}>Five of six</Pill><span style={{ fontSize: 12, color: mic === "denied" ? "var(--kc-clay)" : "var(--kc-ink-faint)" }}>{micLine}</span></div>
          </button>
          <button type="button" onClick={() => pick("timer")} style={card("timer")}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Icon name="timer" size={20} color={choice === "timer" ? "var(--kc-mint)" : "var(--kc-ink-dim)"} /><span style={{ fontSize: 17, fontWeight: 600 }}>Timer only</span></div>
            <div style={{ fontSize: 14, color: "var(--kc-ink-muted)", lineHeight: 1.45 }}>An acoustic piano in another room. You say when a block is done; the record keeps minutes, not accuracy.</div>
            <div style={{ marginTop: "auto" }}><Pill tone={choice === "timer" ? "mint" : "neutral"}>Four of six</Pill></div>
          </button>
        </div>
      </div>

      <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 16 }}>
        <Button icon="arrow_forward" onClick={onContinue}>{primary}</Button>
        {choice !== "mic" && <Button variant="secondary" size="control" onClick={() => pick("mic")}>Set up the mic instead</Button>}
        {choice === "mic" && probe === "found" && <Button variant="secondary" size="control" onClick={() => pick("midi")}>Use the keyboard instead</Button>}
        <span style={{ marginLeft: "auto", fontSize: 14, color: "var(--kc-ink-faint)" }}>Switchable mid-session from the header.</span>
      </div>
    </div>
  );
}
