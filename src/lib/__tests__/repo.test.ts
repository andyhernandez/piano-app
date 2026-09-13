import { beforeEach, describe, expect, it } from "vitest";
import { resetDbForTests } from "../db/schema";
import { repo } from "../db/repo";
import type { Session } from "../types";

describe("repo", () => {
  beforeEach(() => { resetDbForTests(); });

  it("stores and queries sessions by date", async () => {
    const mk = (id: string, date: string, completed = true): Session => ({
      id, childId: "k1", date, startedAt: `${date}T10:00:00Z`, endedAt: null, scale: { key: "C", mode: "major" },
      weights: { scales: 0.2, rhythm: 0.15, reading: 0.2, theory: 0.15, repertoire: 0.2, improv: 0.1 }, plannedMinutes: 20, inputMode: "timer",
      blocks: [], durationSec: 1200, completed, xpEarned: 0, starsEarned: 0,
    });
    await repo.putSession(mk("a", "2026-03-02"));
    await repo.putSession(mk("b", "2026-03-04"));
    await repo.putSession(mk("c", "2026-03-10"));
    const week = await repo.sessionsBetween("k1", "2026-03-02", "2026-03-08");
    expect(week.map((s) => s.id).sort()).toEqual(["a", "b"]);
    expect((await repo.sessionsOn("k1", "2026-03-04")).length).toBe(1);
    const all = await repo.listSessions("k1");
    expect(all[0].id).toBe("c");
    expect(await repo.outboxCount()).toBe(3);
  });

  it("kv round trip", async () => {
    await repo.setKV("x", { a: 1 });
    expect(await repo.getKV<{ a: number }>("x")).toEqual({ a: 1 });
  });

  it("teacher lookup by invite code is case-insensitive", async () => {
    await repo.putTeacher({ id: "t", name: "Ms K", inviteCode: "ABC123", childIds: [], createdAt: "" });
    expect((await repo.teacherByCode("abc123"))?.id).toBe("t");
  });
});

describe("sync outbox", () => {
  beforeEach(() => { resetDbForTests(); });
  it("enqueueAll re-enqueues every synced row after the outbox was drained", async () => {
    await repo.putParent({ id: "par_1", email: null, pin: null, childIds: ["kid_1"], createdAt: "", weeklyDigest: false, sync: null });
    await repo.clearOps((await repo.pendingOps()).map((o) => o.id!));
    expect(await repo.outboxCount()).toBe(0);
    await repo.enqueueAll();
    const ops = await repo.pendingOps();
    expect(ops.map((o) => `${o.table}:${o.key}`)).toEqual(["parents:par_1"]);
  });
});
