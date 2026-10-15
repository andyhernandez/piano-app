import { repo } from "../db/repo";
import { db } from "../db/schema";
import type { SyncProvider } from "./provider";
import { NoopSyncProvider } from "./provider";
import { EasyKeysSyncProvider } from "./easykeys";
import type { Parent } from "../types";
import { CLOUD_URL, newFamilyCode } from "./defaults";

let provider: SyncProvider = new NoopSyncProvider();
let timer: ReturnType<typeof setInterval> | null = null;

export function configureSync(parent: Parent | null) {
  // A device still pointed at the old Supabase project stays quiet until ensureCloudSync moves it over.
  if (parent?.sync?.provider === "easykeys") provider = new EasyKeysSyncProvider(parent.sync.url, parent.sync.familyCode);
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
  if (r.table === "parents") {
    // A family has exactly one parent record. Adopt the remote one: keep this device's sync settings,
    // drop any local placeholder parent, and re-home local children under the adopted id.
    const remote = r.payload as Parent;
    const local = await repo.firstParent();
    if (local && local.id !== remote.id) {
      const merged: Parent = { ...remote, sync: local.sync, childIds: Array.from(new Set([...remote.childIds, ...local.childIds])) };
      await d.parents.delete(local.id);
      await d.parents.put(merged);
      const kids = await d.children.where("parentId").equals(local.id).toArray();
      for (const k of kids) await d.children.put({ ...k, parentId: merged.id });
      return;
    }
    if (local) { await d.parents.put({ ...remote, sync: local.sync }); return; }
  }
  if (r.deleted) await table.delete(r.key);
  else await table.put(r.payload);
}

/** Turn sync on for this device: configure the provider, upload everything local, then pull. */
export async function enableSync(parent: Parent, sync: NonNullable<Parent["sync"]>): Promise<{ pushed: number; pulled: number; error?: string }> {
  const next: Parent = { ...parent, sync, syncOff: false };
  await repo.putParent(next);
  configureSync(next);
  await repo.enqueueAll();
  await repo.setKV("sync.cursor", null);
  return syncNow();
}

/**
 * Join a family that already syncs from another device: switch to its code, pull everything, then push
 * anything local. Returns the number of rows pulled.
 */
export async function joinFamily(parent: Parent, familyCode: string, url: string = CLOUD_URL): Promise<{ pulled: number; error?: string }> {
  const next: Parent = { ...parent, sync: { provider: "easykeys", url, familyCode }, syncOff: false };
  await repo.putParent(next);
  configureSync(next);
  await repo.enqueueAll();
  await repo.setKV("sync.cursor", null);
  const r = await syncNow();
  return { pulled: r.pulled, error: r.error };
}

/**
 * Cloud sync is on by default: a household that has never turned it off joins the EasyKeys cloud with a
 * fresh family code. Automated browsers (tests, screenshots) and builds with NEXT_PUBLIC_CLOUD_DEFAULT=off
 * stay local so they never write to the real database. Returns the parent as it now stands.
 */
export async function ensureCloudSync(parent: Parent): Promise<Parent> {
  // Moved off Supabase: keep the family code, point at the EasyKeys cloud, and upload everything again.
  if (parent.sync?.provider === "supabase") {
    await enableSync(parent, { provider: "easykeys", url: CLOUD_URL, familyCode: parent.sync.familyCode });
    return (await repo.getParent(parent.id)) ?? parent;
  }
  if (parent.sync || parent.syncOff) return parent;
  if (process.env.NEXT_PUBLIC_CLOUD_DEFAULT === "off") return parent;
  if (typeof navigator !== "undefined" && navigator.webdriver) return parent;
  await enableSync(parent, { provider: "easykeys", url: CLOUD_URL, familyCode: newFamilyCode() });
  return (await repo.getParent(parent.id)) ?? parent;
}

export function startBackgroundSync(intervalMs = 60_000) {
  stopBackgroundSync();
  timer = setInterval(() => void syncNow(), intervalMs);
}

export function stopBackgroundSync() {
  if (timer) clearInterval(timer);
  timer = null;
}
