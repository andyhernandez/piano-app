/**
 * Minimal MediaRecorder wrapper for the Creative Sandbox's mic-mode fallback. Self-contained on purpose
 * (the shared recording library is owned elsewhere). Safe to call in environments without MediaRecorder.
 */
export interface CapturedAudio {
  blob: Blob;
  mimeType: string;
}

const CANDIDATE_MIMES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

function pickMime(): string {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") return "";
  for (const m of CANDIDATE_MIMES) if (MediaRecorder.isTypeSupported(m)) return m;
  return "";
}

export function audioCaptureSupported(): boolean {
  return typeof window !== "undefined" && typeof MediaRecorder !== "undefined" && typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
}

export class AudioCapture {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];

  get recording(): boolean {
    return this.recorder?.state === "recording";
  }

  /** Ask for the mic and start recording. Must be called from a user gesture. Throws if denied/unsupported. */
  async start(): Promise<void> {
    if (!audioCaptureSupported()) throw new Error("Audio capture is not supported here");
    if (this.recording) return;
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    const mimeType = pickMime();
    this.recorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined);
    this.chunks = [];
    this.recorder.ondataavailable = (e: BlobEvent) => { if (e.data && e.data.size > 0) this.chunks.push(e.data); };
    this.recorder.start(250);
  }

  /** Stop and resolve with the captured audio (null if nothing was recorded). Releases the mic. */
  stop(): Promise<CapturedAudio | null> {
    const rec = this.recorder;
    if (!rec || rec.state === "inactive") { this.release(); return Promise.resolve(null); }
    return new Promise((resolve) => {
      rec.onstop = () => {
        const mimeType = rec.mimeType || this.chunks[0]?.type || "audio/webm";
        const blob = new Blob(this.chunks, { type: mimeType });
        this.chunks = [];
        this.release();
        resolve(blob.size > 0 ? { blob, mimeType } : null);
      };
      try { rec.stop(); } catch { this.release(); resolve(null); }
    });
  }

  /** Abort without keeping anything. */
  dispose(): void {
    const rec = this.recorder;
    if (rec && rec.state !== "inactive") {
      rec.onstop = null;
      try { rec.stop(); } catch { /* already stopped */ }
    }
    this.chunks = [];
    this.release();
  }

  private release() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.recorder = null;
  }
}
