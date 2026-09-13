import { repo } from "../db/repo";
import { db } from "../db/schema";
import type { SyncProvider } from "./provider";
import { NoopSyncProvider } from "./provider";
import { SupabaseSyncProvider } from "./supabase";
import type { Parent } from "../types";

let provider: SyncProvider = new NoopSyncProvider();
let timer: ReturnType<typeof setInterval> | null = null;

export function configureSync(parent: Parent | null) {
  if (parent?.sync) provider = new SupabaseSyncProvider(parent.sync.url, parent.sync.anonKey, parent.id);
  else provider = new NoopSyncProvider();
  // Keep the cloud digest subscription in step with the parent's toggle; best-effort.
  if (parent && provider.setDigestSubscription) void provider.setDigestSubscription(parent.email, parent.weeklyDigest).catch(() => {});
}

/** True when a cloud provider is configured (digest emails can be sent automatically). */
export function cloudSyncEnabled() {
  return provider.name !== "local-only";
}

export function syncProviderName() {
  return provider.name;
}

/** Drain the outbox then pull remote rows. Safe to call often; no-op when offline or local-only. */
export async function syncNow(): Promise<{ pushed: number; pulled: number; error?: string }> {
  if (provider.name === "local-only") {
    const ops = await repo.pendingOps(1000);
    await repo.clearOps(ops.map((o) => o.id!));
    return { pushed: 0, pulled: 0 };
  }
  if (typeof navigator !== "undefined" && !navigator.onLine) return { pushed: 0, pulled: 0, error: "offline" };
  try {
    const ops = await repo.pendingOps();
    const accepted = await provider.push(ops);
    await repo.clearOps(accepted);
    const cursor = (await repo.getKV<string>("sync.cursor")) ?? null;
    const { rows, cursor: next } = await provider.pull(cursor);
    for (const r of rows) await applyRemote(r);
    if (next) await repo.setKV("sync.cursor", next);
    return { pushed: accepted.length, pulled: rows.length };
  } catch (e) {
    return { pushed: 0, pulled: 0, error: (e as Error).message };
  }
}

async function applyRemote(r: { table: string; key: string; payload: unknown; deleted: boolean }) {
  const d = db();
  const table = (d as unknown as Record<string, { put: (v: unknown) => Promise<unknown>; delete: (k: string) => Promise<void> }>)[r.table];
  if (!table) return;
  if (r.deleted) await table.delete(r.key);
  else await table.put(r.payload);
}

export function startBackgroundSync(intervalMs = 60_000) {
  stopBackgroundSync();
  timer = setInterval(() => void syncNow(), intervalMs);
}

export function stopBackgroundSync() {
  if (timer) clearInterval(timer);
  timer = null;
}
