"use client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

export const FLOW_ZONES = [
  { label: "Stalled", min: 0, className: "bg-muted-foreground/40" },
  { label: "Wobbly", min: 40, className: "bg-primary/50" },
  { label: "Flowing", min: 70, className: "bg-primary" },
  { label: "Unstoppable", min: 90, className: "bg-accent" },
] as const;

export function flowLabel(continuity: number | null): string {
  if (continuity === null) return "Not yet";
  let label: string = FLOW_ZONES[0].label;
  for (const z of FLOW_ZONES) if (continuity >= z.min) label = z.label;
  return label;
}

/** Single "flow" gauge (§11): continuity is shown as a zone, never as a percentage. */
export function FlowMeter({ continuity, className, compact }: { continuity: number | null; className?: string; compact?: boolean }) {
  const value = continuity === null ? 0 : Math.max(0, Math.min(100, continuity));
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-baseline justify-between">
        <span className={cn("font-display font-bold", compact ? "text-sm" : "text-lg")}>Flow</span>
        <span className={cn("font-display font-bold", compact ? "text-sm" : "text-xl", continuity === null && "text-muted-foreground")}>{flowLabel(continuity)}</span>
      </div>
      <div className="relative h-5 w-full overflow-hidden rounded-full bg-muted">
        <div className="absolute inset-0 flex">
          {FLOW_ZONES.map((z, i) => {
            const next = FLOW_ZONES[i + 1]?.min ?? 100;
            return <div key={z.label} style={{ width: `${next - z.min}%` }} className={cn("h-full opacity-35", z.className)} />;
          })}
        </div>
        {continuity !== null && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${value}%` }}
            transition={{ type: "spring", stiffness: 80, damping: 18 }}
            className={cn("absolute inset-y-0 left-0 rounded-full", FLOW_ZONES.find((z, i) => value >= z.min && value < (FLOW_ZONES[i + 1]?.min ?? 101))?.className ?? "bg-primary")}
          />
        )}
      </div>
      {!compact && (
        <div className="flex justify-between text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          {FLOW_ZONES.map((z) => <span key={z.label}>{z.label}</span>)}
        </div>
      )}
    </div>
  );
}
