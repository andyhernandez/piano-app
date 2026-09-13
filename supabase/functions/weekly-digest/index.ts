// Weekly digest email (spec §7). Deploy with `supabase functions deploy weekly-digest` and schedule
// it weekly with `supabase functions schedule` or pg_cron. Requires secrets:
//   RESEND_API_KEY  - transactional email provider (https://resend.com)
//   DIGEST_FROM     - e.g. "KeyCadence <digest@yourdomain.com>"
// Reads kc_rows for each subscribed owner, summarises the last 7 days of sessions per child, and
// sends one email per parent. No child names leave the household except in that parent's own email.

// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const BLOCK_LABELS: Record<string, string> = {
  scales: "Scale Gym", rhythm: "Rhythm Lab", reading: "Sight Reading", theory: "Chord Lab", repertoire: "Repertoire", improv: "Sandbox",
};

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function digestFor(owner: string) {
  const since = new Date(); since.setDate(since.getDate() - 7);
  const sinceKey = dateKey(since);
  const { data: rows, error } = await supabase.from("kc_rows").select("table_name,key,payload").eq("owner", owner).in("table_name", ["children", "sessions"]);
  if (error) throw error;
  const children = rows.filter((r: any) => r.table_name === "children").map((r: any) => r.payload);
  const sessions = rows.filter((r: any) => r.table_name === "sessions").map((r: any) => r.payload).filter((s: any) => s.date >= sinceKey);
  const lines: string[] = [];
  for (const c of children) {
    const mine = sessions.filter((s: any) => s.childId === c.id);
    const completed = mine.filter((s: any) => s.completed);
    const minutes = Math.round(mine.reduce((a: number, s: any) => a + (s.durationSec ?? 0), 0) / 60);
    const blocks = new Map<string, number>();
    for (const s of mine) for (const b of s.blocks ?? []) if (b.completed) blocks.set(b.type, (blocks.get(b.type) ?? 0) + 1);
    const top = [...blocks.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t, n]) => `${BLOCK_LABELS[t] ?? t} ×${n}`).join(", ");
    const badges = mine.flatMap((s: any) => (s.blocks ?? []).map((b: any) => b.midiScore?.badge).filter(Boolean));
    lines.push(`${c.name}: ${completed.length} session${completed.length === 1 ? "" : "s"} · ${minutes} min · streak ${c.streak?.current ?? 0} 🔥` +
      (top ? `\n  Most practised: ${top}` : "") +
      (badges.length ? `\n  Badges: ${badges.join(", ")}` : "") +
      `\n  XP ${c.xp} · Stars ${c.stars} · Keys ${c.keys}`);
  }
  return lines.length ? lines.join("\n\n") : "No practice logged this week. A fresh start is one session away!";
}

async function sendEmail(to: string, text: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: Deno.env.get("DIGEST_FROM"), to, subject: "Your KeyCadence week 🎹", text }),
  });
  if (!res.ok) throw new Error(`email failed: ${res.status} ${await res.text()}`);
}

Deno.serve(async () => {
  const { data: subs, error } = await supabase.from("kc_digest_subscriptions").select("owner,email").eq("enabled", true);
  if (error) return new Response(error.message, { status: 500 });
  const results: Record<string, string> = {};
  for (const s of subs ?? []) {
    try {
      await sendEmail(s.email, await digestFor(s.owner));
      results[s.owner] = "sent";
    } catch (e) {
      results[s.owner] = (e as Error).message;
    }
  }
  return new Response(JSON.stringify(results), { headers: { "Content-Type": "application/json" } });
});
