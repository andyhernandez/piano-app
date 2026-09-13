/**
 * Tiny MediaRecorder wrapper for one-tap audio recordings (§4C no-MIDI mode).
 * start() asks for the microphone (must be called from a user gesture on iOS), stop() resolves with the Blob.
 */
export class AudioRecorder {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  mimeType = "";

  static supported(): boolean {
    return typeof window !== "undefined" && typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
  }

  /** Prefer webm/opus (Chrome, Firefox, Android); Safari records mp4/aac. */
  static pickMimeType(): string {
    if (typeof MediaRecorder === "undefined") return "";
    const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4;codecs=mp4a.40.2", "audio/mp4", "audio/ogg;codecs=opus"];
    return candidates.find((c) => MediaRecorder.isTypeSupported(c)) ?? "";
  }

  get recording(): boolean {
    return this.recorder?.state === "recording";
  }

  /** Throws (e.g. NotAllowedError) if permission is denied or recording is unsupported. */
  async start(): Promise<void> {
    if (!AudioRecorder.supported()) throw new Error("Audio recording is not supported on this device");
    if (this.recording) return;
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    this.mimeType = AudioRecorder.pickMimeType();
    this.recorder = this.mimeType ? new MediaRecorder(this.stream, { mimeType: this.mimeType }) : new MediaRecorder(this.stream);
    if (!this.mimeType) this.mimeType = this.recorder.mimeType || "audio/webm";
    this.chunks = [];
    this.recorder.ondataavailable = (e: BlobEvent) => { if (e.data.size > 0) this.chunks.push(e.data); };
    this.recorder.start(1000);
  }

  /** Stop and resolve with the recorded audio. Resolves an empty blob if nothing was recorded. */
  stop(): Promise<Blob> {
    const rec = this.recorder;
    if (!rec || rec.state === "inactive") {
      this.release();
      return Promise.resolve(new Blob(this.chunks, { type: this.mimeType || "audio/webm" }));
    }
    return new Promise((resolve) => {
      rec.onstop = () => {
        const blob = new Blob(this.chunks, { type: this.mimeType || rec.mimeType || "audio/webm" });
        this.release();
        resolve(blob);
      };
      try { rec.stop(); } catch { this.release(); resolve(new Blob(this.chunks, { type: this.mimeType || "audio/webm" })); }
    });
  }

  /** Discard the recording and release the microphone. */
  cancel(): void {
    try { if (this.recorder && this.recorder.state !== "inactive") { this.recorder.onstop = null; this.recorder.stop(); } } catch { /* ignore */ }
    this.chunks = [];
    this.release();
  }

  private release() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.recorder = null;
  }
}
