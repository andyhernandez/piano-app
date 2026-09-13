import type { SyncProvider } from "./provider";
import type { SyncOp } from "../db/schema";

/**
 * Supabase REST provider using PostgREST directly (no SDK dependency, keeps the bundle small).
 * Schema and policies live in supabase/migrations. Rows are scoped by `owner`, the family code, which is
 * sent as the x-kc-owner header; row-level security only returns rows whose owner matches that header,
 * so the publishable key on its own reveals nothing.
 */
export class SupabaseSyncProvider implements SyncProvider {
  readonly name = "supabase";
  constructor(private url: string, private anonKey: string, private ownerId: string) {}

  private headers(extra: Record<string, string> = {}) {
    return {
      apikey: this.anonKey,
      Authorization: `Bearer ${this.anonKey}`,
      "x-kc-owner": this.ownerId,
      "Content-Type": "application/json",
      ...extra,
    };
  }

  async push(ops: SyncOp[]): Promise<number[]> {
    if (!ops.length) return [];
    const body = ops.map((o) => ({
      table_name: o.table,
      key: o.key,
      payload: o.payload,
      deleted: o.op === "delete",
      updated_at: o.createdAt,
      owner: this.ownerId,
    }));
    const res = await fetch(`${this.url}/rest/v1/kc_rows?on_conflict=owner,table_name,key`, {
      method: "POST",
      headers: this.headers({ Prefer: "resolution=merge-duplicates,return=minimal" }),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Supabase push failed: ${res.status} ${await res.text()}`);
    return ops.map((o) => o.id!).filter((i) => i != null);
  }

  async pull(cursor: string | null) {
    const since = cursor ?? "1970-01-01T00:00:00Z";
    const q = new URLSearchParams({
      select: "table_name,key,payload,deleted,updated_at",
      owner: `eq.${this.ownerId}`,
      updated_at: `gt.${since}`,
      order: "updated_at.asc",
      limit: "500",
    });
    const res = await fetch(`${this.url}/rest/v1/kc_rows?${q}`, { headers: this.headers() });
    if (!res.ok) throw new Error(`Supabase pull failed: ${res.status}`);
    const rows = (await res.json()) as { table_name: string; key: string; payload: unknown; deleted: boolean; updated_at: string }[];
    return {
      rows: rows.map((r) => ({ table: r.table_name, key: r.key, payload: r.payload, deleted: r.deleted })),
      cursor: rows.length ? rows[rows.length - 1].updated_at : cursor,
    };
  }

  /** Register or update the parent's weekly digest subscription (see supabase/functions/weekly-digest). */
  async setDigestSubscription(email: string | null, enabled: boolean): Promise<void> {
    if (!email) return;
    const res = await fetch(`${this.url}/rest/v1/kc_digest_subscriptions?on_conflict=owner`, {
      method: "POST",
      headers: this.headers({ Prefer: "resolution=merge-duplicates,return=minimal" }),
      body: JSON.stringify([{ owner: this.ownerId, email, enabled, updated_at: new Date().toISOString() }]),
    });
    if (!res.ok) throw new Error(`Digest subscription failed: ${res.status}`);
  }

  async uploadRecording(id: string, blob: Blob, mimeType: string): Promise<string> {
    const path = `${this.ownerId}/${id}`;
    const res = await fetch(`${this.url}/storage/v1/object/recordings/${path}`, {
      method: "POST",
      headers: { apikey: this.anonKey, Authorization: `Bearer ${this.anonKey}`, "x-kc-owner": this.ownerId, "Content-Type": mimeType, "x-upsert": "true" },
      body: blob,
    });
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    return `${this.url}/storage/v1/object/recordings/${path}`;
  }
}
