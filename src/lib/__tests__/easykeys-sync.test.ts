import { describe, expect, it, vi } from "vitest";
import { EasyKeysSyncProvider } from "../sync/easykeys";

const CODE = "fam-abcdefghjkmnpqrstuvwxyz2";

function fakeFetch(body: unknown) {
  return vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } }));
}

describe("EasyKeys cloud sync provider", () => {
  it("pushes ops with the family code and marks deletes", async () => {
    const f = fakeFetch({ accepted: 2 });
    vi.stubGlobal("fetch", f);
    const p = new EasyKeysSyncProvider("https://cloud.example", CODE);
    const ids = await p.push([
      { id: 1, table: "children", op: "put", key: "chd-1", payload: { name: "Ada" }, createdAt: "2026-10-14T00:00:00Z" },
      { id: 2, table: "sessions", op: "delete", key: "ses-1", payload: null, createdAt: "2026-10-14T00:00:01Z" },
    ]);
    expect(ids).toEqual([1, 2]);
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://cloud.example/api/sync/push");
    expect((init!.headers as Record<string, string>)["X-Family-Code"]).toBe(CODE);
    const sent = JSON.parse(init!.body as string);
    expect(sent.ops[1]).toEqual({ table: "sessions", key: "ses-1", payload: null, deleted: true, updated_at: "2026-10-14T00:00:01Z" });
    vi.unstubAllGlobals();
  });

  it("pulls with a numeric cursor and ignores an old timestamp cursor", async () => {
    const f = fakeFetch({ rows: [{ table: "children", key: "chd-1", payload: {}, deleted: false }], cursor: "42" });
    vi.stubGlobal("fetch", f);
    const p = new EasyKeysSyncProvider("https://cloud.example", CODE);
    expect((await p.pull("17")).cursor).toBe("42");
    expect(f.mock.calls[0][0]).toBe("https://cloud.example/api/sync/pull?cursor=17");
    await p.pull("2026-10-01T00:00:00Z");
    expect(f.mock.calls[1][0]).toBe("https://cloud.example/api/sync/pull");
    vi.unstubAllGlobals();
  });
});
