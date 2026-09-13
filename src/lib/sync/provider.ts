import type { SyncOp } from "../db/schema";

/**
 * Cloud sync provider interface (§2). The app is local-first: every write lands in IndexedDB and
 * an outbox row. A provider drains the outbox and can pull remote changes for multi-device use.
 */
export interface SyncProvider {
  readonly name: string;
  /** Push a batch of ops. Resolve with the ids that were accepted. */
  push(ops: SyncOp[]): Promise<number[]>;
  /** Pull rows changed since a cursor. Returns rows + new cursor. */
  pull(cursor: string | null): Promise<{ rows: { table: string; key: string; payload: unknown; deleted: boolean }[]; cursor: string | null }>;
  /** Upload a binary recording; returns a URL or storage key. */
  uploadRecording?(id: string, blob: Blob, mimeType: string): Promise<string>;
  /** Register the parent's weekly digest email with the cloud (no-op locally). */
  setDigestSubscription?(email: string | null, enabled: boolean): Promise<void>;
}

export class NoopSyncProvider implements SyncProvider {
  readonly name = "local-only";
  async push(ops: SyncOp[]) { return ops.map((o) => o.id!).filter((i) => i != null); }
  async pull() { return { rows: [], cursor: null }; }
}
