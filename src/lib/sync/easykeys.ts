import type { SyncProvider } from "./provider";
import type { SyncOp } from "../db/schema";

const BATCH = 500;

/**
 * Sync against the EasyKeys cloud (piano-app-admin on Laravel Cloud). The family code travels in the
 * X-Family-Code header and is the only key; the server keeps each family's rows apart and hands back a version
 * number as the pull cursor.
 */
export class EasyKeysSyncProvider implements SyncProvider {
  readonly name = "easykeys";
  constructor(private url: string, private familyCode: string) {}

  private headers(extra: Record<string, string> = {}) {
    return { Accept: "application/json", "X-Family-Code": this.familyCode, ...extra };
  }

  async push(ops: SyncOp[]): Promise<number[]> {
    const accepted: number[] = [];
    for (let i = 0; i < ops.length; i += BATCH) {
      const batch = ops.slice(i, i + BATCH);
      const res = await fetch(`${this.url}/api/sync/push`, {
        method: "POST",
        headers: this.headers({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          ops: batch.map((o) => ({ table: o.table, key: o.key, payload: o.op === "delete" ? null : o.payload, deleted: o.op === "delete", updated_at: o.createdAt })),
        }),
      });
      if (!res.ok) throw new Error(`Sync push failed: ${res.status}`);
      accepted.push(...batch.map((o) => o.id!).filter((id) => id != null));
    }
    return accepted;
  }

  async pull(cursor: string | null) {
    const q = cursor && /^\d+$/.test(cursor) ? `?cursor=${cursor}` : "";
    const res = await fetch(`${this.url}/api/sync/pull${q}`, { headers: this.headers() });
    if (!res.ok) throw new Error(`Sync pull failed: ${res.status}`);
    const body = (await res.json()) as { rows: { table: string; key: string; payload: unknown; deleted: boolean }[]; cursor: string | null };
    return { rows: body.rows ?? [], cursor: body.cursor ?? cursor };
  }

  async setDigestSubscription(email: string | null, enabled: boolean): Promise<void> {
    if (!email) return;
    const res = await fetch(`${this.url}/api/sync/digest`, {
      method: "PUT",
      headers: this.headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({ email, enabled }),
    });
    if (!res.ok) throw new Error(`Digest subscription failed: ${res.status}`);
  }
}
