"use client";
import type { SkillProfile } from "@/lib/types";

/** Radar chart for the three skills (§3). Pure SVG. */
export function SkillRadar({ profile, size = 200, previous }: { profile: SkillProfile; size?: number; previous?: SkillProfile | null }) {
  const c = size / 2;
  const r = size * 0.38;
  const axes = [
    { key: "ear" as const, label: "Ear", angle: -90 },
    { key: "eye" as const, label: "Eye", angle: 30 },
    { key: "pulse" as const, label: "Pulse", angle: 150 },
  ];
  const pt = (angle: number, v: number) => {
    const a = (angle * Math.PI) / 180;
    return [c + Math.cos(a) * r * v, c + Math.sin(a) * r * v] as const;
  };
  const poly = (p: SkillProfile) => axes.map((ax) => pt(ax.angle, p[ax.key] / 100).join(",")).join(" ");
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label={`Skill profile: ear ${profile.ear}, eye ${profile.eye}, pulse ${profile.pulse}`}>
      {[0.25, 0.5, 0.75, 1].map((lvl) => (
        <polygon key={lvl} points={axes.map((ax) => pt(ax.angle, lvl).join(",")).join(" ")} fill="none" stroke="currentColor" strokeOpacity={0.15} />
      ))}
      {axes.map((ax) => { const [x, y] = pt(ax.angle, 1); return <line key={ax.key} x1={c} y1={c} x2={x} y2={y} stroke="currentColor" strokeOpacity={0.2} />; })}
      {previous && <polygon points={poly(previous)} fill="#94a3b8" fillOpacity={0.25} stroke="#94a3b8" strokeDasharray="4 3" />}
      <polygon points={poly(profile)} fill="#4f46e5" fillOpacity={0.35} stroke="#4f46e5" strokeWidth={3} strokeLinejoin="round" />
      {axes.map((ax) => {
        const [x, y] = pt(ax.angle, 1.22);
        return <text key={ax.key} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.07} fontWeight={800} fill="currentColor">{ax.label} {profile[ax.key]}</text>;
      })}
    </svg>
  );
}
