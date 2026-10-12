"use client";
import * as React from "react";
import { ActionNote, Button, Headline, Icon, Pill } from "@/components/ds";
import { getInput } from "@/lib/input/manager";
import { micPermissionState } from "@/lib/input/mic";
import { nativeMidiAvailable, pairBluetoothKeyboard, probeAnyMidi } from "@/lib/input/native-midi";
import { midiToName } from "@/lib/music/notes";
import type { InputMode } from "@/lib/types";
import { numberWord, capitalize } from "./chrome";

type Probe = "probing" | "found" | "none";
type MicState = "granted" | "denied" | "prompt" | "unknown" | "asking";

/**
 * A2 · Your keyboard. Probes Web MIDI on mount and listens for a few notes; the three cards below are the
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
    ? "Checking USB and Bluetooth MIDI. Everything works without it — it just means we hear exactly which note you played, not only that you played."
    : probe === "found"
      ? "Found over USB while you were on step one. Everything works without it — it just means we hear exactly which note you played, not only that you played."
      : "Nothing on USB or Bluetooth MIDI right now. Everything works without it — plug one in later and the header picks it up.";

  const micLine = mic === "granted" ? "Microphone allowed" : mic === "denied" ? "Blocked in the browser settings" : mic === "asking" ? "Asking the browser" : "Asks for permission once";
  const primary = choice === "midi" ? "Use the keyboard" : choice === "mic" ? "Use the microphone" : "Use the timer";
  const heardLine = heard ? `${capitalize(numberWord(heard))} note${heard === 1 ? "" : "s"} heard · play a few more if you like` : "Connected over MIDI · play a few notes";

  const card = (m: InputMode): React.CSSProperties => ({
    height: 196, borderRadius: 22, padding: "20px 22px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 9, textAlign: "left", cursor: "pointer", color: "var(--kc-ink)", fontFamily: "var(--kc-font-sans)",
    ...(choice === m ? { background: "var(--kc-indigo-wash)", border: "3px solid var(--kc-indigo)" } : { background: "var(--kc-panel)", border: "2px solid var(--kc-border)", boxShadow: "var(--kc-shadow-press)" }),
  });
  const stat = (v: React.ReactNode, l: string) => (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 34, fontWeight: 600, lineHeight: 1 }}>{v}</div>
      <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.4, color: "var(--kc-ink-muted)" }}>{l}</div>
    </div>
  );

  return (
    <div style={{ flex: 1, minHeight: 0, padding: "30px 34px", display: "flex", flexDirection: "column", gap: 22 }}>
      <Headline title={title} lede={lede} />

      {probe === "found" ? (
        <div style={{ background: "var(--kc-mint-wash)", border: "3px solid var(--kc-mint)", borderRadius: 22, padding: "22px 24px", display: "flex", alignItems: "center", gap: 20 }}>
          <span style={{ width: 64, height: 64, flex: "none", borderRadius: 18, background: "var(--kc-mint)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="piano" size={36} color="var(--kc-ink)" /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 24, fontWeight: 600, lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{device}</div>
            <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.4, color: "var(--kc-mint-ink)" }}>{heardLine}</div>
          </div>
          {stat(heard, "notes heard")}
          {stat(lastNote ?? "—", "last note")}
          <Button variant="secondary" size="pill" icon="refresh" onClick={retry} style={{ height: 52 }}>Detect again</Button>
        </div>
      ) : (
        <div style={{ background: "var(--kc-panel)", border: "2px solid var(--kc-border)", boxShadow: "var(--kc-shadow-press)", borderRadius: 22, padding: "22px 24px", display: "flex", alignItems: "center", gap: 20 }}>
          <span style={{ width: 64, height: 64, flex: "none", borderRadius: 18, background: "var(--kc-cream)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="piano" size={36} color={probe === "probing" ? "var(--kc-ink-muted)" : "var(--kc-ink-faint)"} /></span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 24, fontWeight: 600, lineHeight: 1.15 }}>{probe === "probing" ? "Looking for a keyboard" : "No MIDI keyboard"}</div>
            <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.4, color: "var(--kc-ink-muted)" }}>{probe === "probing" ? "A second or two." : "Plug one in over USB, then detect again. Bluetooth works on most tablets."}</div>
          </div>
          {stat(heard, "notes heard")}
          {stat(lastNote ?? "—", "last note")}
          {nativeMidiAvailable() && <Button variant="secondary" size="pill" icon="bluetooth" onClick={() => void pairBluetoothKeyboard().then(retry)} style={{ height: 52 }}>Pair over Bluetooth</Button>}
          <Button variant="secondary" size="pill" icon="refresh" disabled={probe === "probing"} onClick={retry} style={{ height: 52 }}>Detect again</Button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontFamily: "var(--kc-font-display)", fontSize: 18, fontWeight: 600, lineHeight: 1.15 }}>What changes without it</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14 }}>
          <button type="button" onClick={() => pick("midi")} className="kc-press" style={card("midi")}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Icon name="piano" size={26} color={choice === "midi" ? "var(--kc-indigo)" : "var(--kc-ink-muted)"} /><span style={{ fontFamily: "var(--kc-font-display)", fontSize: 19, fontWeight: 600, lineHeight: 1.15 }}>Keyboard connected</span></div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--kc-ink-muted)", lineHeight: 1.45 }}>Every note and its timing. Reading marks the exact note you missed; timing shows how early or late, in milliseconds.</div>
            <div style={{ marginTop: "auto" }}><Pill tone={choice === "midi" ? "indigo-fill" : "neutral"}>All seven stops</Pill></div>
          </button>
          <button type="button" onClick={() => pick("mic")} className="kc-press" style={card("mic")}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Icon name="mic" size={26} color={choice === "mic" ? "var(--kc-indigo)" : "var(--kc-ink-muted)"} /><span style={{ fontFamily: "var(--kc-font-display)", fontSize: 19, fontWeight: 600, lineHeight: 1.15 }}>Microphone</span></div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--kc-ink-muted)", lineHeight: 1.45 }}>Pitch and pulse from sound. Good enough to catch a wrong note in a slow scale — it can&apos;t separate two hands.</div>
            <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 10 }}><Pill tone={choice === "mic" ? "indigo-fill" : "neutral"}>Six of seven</Pill><span style={{ fontSize: 13, fontWeight: 700, color: "var(--kc-ink-faint)" }}>{micLine}</span></div>
          </button>
          <button type="button" onClick={() => pick("timer")} className="kc-press" style={card("timer")}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Icon name="timer" size={26} color={choice === "timer" ? "var(--kc-indigo)" : "var(--kc-ink-muted)"} /><span style={{ fontFamily: "var(--kc-font-display)", fontSize: 19, fontWeight: 600, lineHeight: 1.15 }}>Timer only</span></div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--kc-ink-muted)", lineHeight: 1.45 }}>An acoustic piano in another room. You say when a stop is done; the record keeps minutes, not accuracy.</div>
            <div style={{ marginTop: "auto" }}><Pill tone={choice === "timer" ? "indigo-fill" : "neutral"}>Four of seven</Pill></div>
          </button>
        </div>
      </div>

      <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 14 }}>
        <Button icon="arrow_forward" iconAfter onClick={onContinue}>{primary}</Button>
        {choice !== "mic" && <Button variant="secondary" size="control" onClick={() => pick("mic")} style={{ height: 58 }}>Set up the mic instead</Button>}
        {choice === "mic" && probe === "found" && <Button variant="secondary" size="control" onClick={() => pick("midi")} style={{ height: 58 }}>Use the keyboard instead</Button>}
        <ActionNote>Switchable mid-session from the header.</ActionNote>
      </div>
    </div>
  );
}
