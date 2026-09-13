"use client";
import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { repo } from "@/lib/db/repo";
import { BLOCK_LABELS, BLOCK_ORDER, type Child, type Session } from "@/lib/types";
import { addDays, dateKey, weekDays, weekKey } from "@/lib/utils/date";
import { formatDateLong } from "./helpers";

const WEEKS = 12;

/** 12-week practice overview: minutes per week (pure SVG bars) and per-block completion rates. */
export function WeeklyOverview({ child }: { child: Child }) {
  const [today] = React.useState(() => dateKey());
  const thisWeek = React.useMemo(() => weekDays(today), [today]);
  const from = addDays(thisWeek[0], -7 * (WEEKS - 1));
  const to = thisWeek[6];
  const sessions = useLiveQuery(() => repo.sessionsBetween(child.id, from, to), [child.id, from, to]);

  const weeks = React.useMemo(() => {
    const out: { key: string; start: string; minutes: number; sessions: number; completed: number }[] = [];
    for (let i = WEEKS - 1; i >= 0; i--) {
      const start = addDays(thisWeek[0], -7 * i);
      out.push({ key: weekKey(start), start, minutes: 0, sessions: 0, completed: 0 });
    }
    const byKey = new Map(out.map((w) => [w.key, w]));
    for (const s of sessions ?? []) {
      const w = byKey.get(weekKey(s.date));
      if (!w) continue;
      w.minutes += s.durationSec / 60;
      w.sessions += 1;
      if (s.completed) w.completed += 1;
    }
    return out;
  }, [sessions, thisWeek]);

  const target = child.settings.sessionMinutes * child.settings.practiceDaysPerWeek;
  const total = weeks.reduce((a, w) => a + w.minutes, 0);
  const activeWeeks = weeks.filter((w) => w.sessions > 0).length;

  return (
    <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
      <Card>
        <CardHeader>
          <CardTitle>Minutes practised per week</CardTitle>
          <CardDescription>
            Last {WEEKS} weeks · {Math.round(total)} minutes in total · {activeWeeks} active week{activeWeeks === 1 ? "" : "s"} · dashed line is the weekly goal ({target} min)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MinutesChart weeks={weeks} target={target} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Block completion</CardTitle>
          <CardDescription>Share of sessions in which each block was finished (last {WEEKS} weeks).</CardDescription>
        </CardHeader>
        <CardContent>
          <BlockRates sessions={sessions ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}

function MinutesChart({ weeks, target }: { weeks: { key: string; start: string; minutes: number; sessions: number; completed: number }[]; target: number }) {
  const [hover, setHover] = React.useState<number | null>(null);
  const W = 640;
  const H = 240;
  const pad = { top: 16, right: 12, bottom: 36, left: 40 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const maxRaw = Math.max(target, ...weeks.map((w) => w.minutes), 10);
  const step = maxRaw <= 60 ? 15 : maxRaw <= 150 ? 30 : 60;
  const max = Math.ceil(maxRaw / step) * step;
  const ticks = Array.from({ length: max / step + 1 }, (_, i) => i * step);
  const slot = innerW / weeks.length;
  const barW = Math.max(6, slot * 0.6);
  const y = (v: number) => pad.top + innerH - (v / max) * innerH;

  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby="minutes-chart-title" className="h-auto w-full text-foreground">
        <title id="minutes-chart-title">Bar chart of minutes practised in each of the last {weeks.length} weeks.</title>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={W - pad.right} y1={y(t)} y2={y(t)} stroke="currentColor" strokeOpacity={t === 0 ? 0.4 : 0.1} />
            <text x={pad.left - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" fontSize="11" fill="currentColor" fillOpacity={0.6}>{t}</text>
          </g>
        ))}
        <text x={pad.left - 8} y={pad.top - 6} textAnchor="end" fontSize="10" fill="currentColor" fillOpacity={0.6}>min</text>
        {target > 0 && target <= max && (
          <line x1={pad.left} x2={W - pad.right} y1={y(target)} y2={y(target)} stroke="currentColor" strokeOpacity={0.5} strokeDasharray="4 4" />
        )}
        {weeks.map((w, i) => {
          const x = pad.left + i * slot + (slot - barW) / 2;
          const h = Math.max(w.minutes > 0 ? 3 : 0, y(0) - y(w.minutes));
          const isLast = i === weeks.length - 1;
          const label = `Week of ${formatDateLong(w.start)}: ${Math.round(w.minutes)} min, ${w.sessions} session${w.sessions === 1 ? "" : "s"}, ${w.completed} completed`;
          return (
            <g key={w.key} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0} aria-label={label}>
              <rect x={pad.left + i * slot} y={pad.top} width={slot} height={innerH} fill="transparent" />
              <rect x={x} y={y(0) - h} width={barW} height={h} rx={4} className={isLast ? "fill-primary" : "fill-primary/60"} style={{ opacity: hover === null || hover === i ? 1 : 0.5 }} />
              <text x={x + barW / 2} y={H - pad.bottom + 16} textAnchor="middle" fontSize="11" fill="currentColor" fillOpacity={isLast ? 1 : 0.6} fontWeight={isLast ? 700 : 400}>
                {isLast ? "This wk" : shortDate(w.start)}
              </text>
              {(hover === i || (isLast && hover === null && w.minutes > 0)) && (
                <text x={x + barW / 2} y={y(w.minutes) - 6} textAnchor="middle" fontSize="12" fontWeight={700} fill="currentColor">{Math.round(w.minutes)}</text>
              )}
              <title>{label}</title>
            </g>
          );
        })}
      </svg>
      <figcaption className="sr-only">
        <table>
          <thead><tr><th>Week starting</th><th>Minutes</th><th>Sessions</th><th>Completed</th></tr></thead>
          <tbody>
            {weeks.map((w) => <tr key={w.key}><td>{w.start}</td><td>{Math.round(w.minutes)}</td><td>{w.sessions}</td><td>{w.completed}</td></tr>)}
          </tbody>
        </table>
      </figcaption>
    </figure>
  );
}

function shortDate(key: string): string {
  const [, m, d] = key.split("-").map(Number);
  return `${d}/${m}`;
}

function BlockRates({ sessions }: { sessions: Session[] }) {
  const finished = sessions.filter((s) => s.endedAt);
  if (!finished.length) return <p className="text-sm text-muted-foreground">No finished sessions in this window yet.</p>;
  return (
    <ul className="flex flex-col gap-3">
      {BLOCK_ORDER.map((t) => {
        const done = finished.filter((s) => s.blocks.some((b) => b.type === t && b.completed)).length;
        const skipped = finished.filter((s) => s.blocks.some((b) => b.type === t && b.skipped)).length;
        const pct = Math.round((done / finished.length) * 100);
        const scored = finished.flatMap((s) => s.blocks.filter((b) => b.type === t && b.midiScore));
        const avg = scored.length ? Math.round(scored.reduce((a, b) => a + (b.midiScore?.score ?? 0), 0) / scored.length) : null;
        return (
          <li key={t}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-bold">{BLOCK_LABELS[t]}</span>
              <span className="tabular-nums text-muted-foreground">{pct}% · {done}/{finished.length}{skipped ? ` · ${skipped} skipped` : ""}{avg !== null ? ` · avg ${avg}` : ""}</span>
            </div>
            <Progress value={pct} aria-label={`${BLOCK_LABELS[t]} completion ${pct}%`} />
          </li>
        );
      })}
    </ul>
  );
}
