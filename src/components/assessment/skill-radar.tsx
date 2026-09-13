"use client";
import { motion } from "framer-motion";
import type { SkillProfile } from "@/lib/types";

const AXES = [
  { key: "ear" as const, label: "Ear", angle: -90 },
  { key: "eye" as const, label: "Eye", angle: 30 },
  { key: "pulse" as const, label: "Pulse", angle: 150 },
];

/**
 * Radar chart for the three skills (§3). Pure SVG; theme-aware via CSS variables.
 * `previous` draws a dashed ghost so a retake can be compared. `animate` grows the polygon in from the centre.
 */
export function SkillRadar({ profile, size = 200, previous, animate = false, className }: { profile: SkillProfile; size?: number; previous?: SkillProfile | null; animate?: boolean; className?: string }) {
  const c = size / 2;
  const r = size * 0.38;
  const pt = (angle: number, v: number) => {
    const a = (angle * Math.PI) / 180;
    return [c + Math.cos(a) * r * v, c + Math.sin(a) * r * v] as const;
  };
  const poly = (p: SkillProfile, scale = 1) => AXES.map((ax) => pt(ax.angle, (Math.max(0, Math.min(100, p[ax.key])) / 100) * scale).join(",")).join(" ");
  const centre = AXES.map(() => `${c},${c}`).join(" ");
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" className={className} aria-label={`Skill profile: ear ${profile.ear}, eye ${profile.eye}, pulse ${profile.pulse}`}>
      {[0.25, 0.5, 0.75, 1].map((lvl) => (
        <polygon key={lvl} points={AXES.map((ax) => pt(ax.angle, lvl).join(",")).join(" ")} fill="none" stroke="currentColor" strokeOpacity={0.15} />
      ))}
      {AXES.map((ax) => { const [x, y] = pt(ax.angle, 1); return <line key={ax.key} x1={c} y1={c} x2={x} y2={y} stroke="currentColor" strokeOpacity={0.2} />; })}
      {previous && <polygon points={poly(previous)} fill="var(--muted-foreground)" fillOpacity={0.2} stroke="var(--muted-foreground)" strokeDasharray="4 3" />}
      {animate ? (
        <motion.polygon
          initial={{ points: centre, opacity: 0 }}
          animate={{ points: poly(profile), opacity: 1 }}
          transition={{ duration: 1.1, ease: [0.34, 1.56, 0.64, 1] }}
          fill="var(--primary)" fillOpacity={0.35} stroke="var(--primary)" strokeWidth={3} strokeLinejoin="round"
        />
      ) : (
        <polygon points={poly(profile)} fill="var(--primary)" fillOpacity={0.35} stroke="var(--primary)" strokeWidth={3} strokeLinejoin="round" />
      )}
      {AXES.map((ax) => {
        const [x, y] = pt(ax.angle, profile[ax.key] / 100);
        return <circle key={`dot-${ax.key}`} cx={x} cy={y} r={size * 0.02} fill="var(--primary)" opacity={animate ? 0 : 1} style={animate ? { animation: "radar-dot-in 0.3s ease-out 1.1s forwards" } : undefined} />;
      })}
      {AXES.map((ax) => {
        const [x, y] = pt(ax.angle, 1.24);
        return <text key={ax.key} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.07} fontWeight={800} fill="currentColor">{ax.label} {Math.round(profile[ax.key])}</text>;
      })}
      {animate && <style>{`@keyframes radar-dot-in { to { opacity: 1 } }`}</style>}
    </svg>
  );
}
