import { motion } from "framer-motion";
import { Activity, AlertTriangle, ShieldCheck } from "lucide-react";
import type { QueueHealth } from "@/lib/intel.functions";

const map = {
  healthy: { label: "Healthy", dot: "bg-success", text: "text-success", icon: ShieldCheck, ring: "ring-success/30" },
  moderate: { label: "Moderate", dot: "bg-warning", text: "text-warning", icon: Activity, ring: "ring-warning/30" },
  critical: { label: "Critical", dot: "bg-destructive", text: "text-destructive", icon: AlertTriangle, ring: "ring-destructive/30" },
} as const;

export function QueueHealthWidget({ health }: { health: QueueHealth | undefined }) {
  if (!health) return <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">Loading…</div>;
  const s = map[health.status];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Queue Health</p>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${s.ring} ${s.text}`}>
          <span className={`h-2 w-2 rounded-full ${s.dot}`} /> {s.label}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3">
        <Stat label="Waiting" value={health.waiting} />
        <Stat label="Avg service" value={`${Math.round(health.avg_service_seconds/60)}m`} />
        <Stat label="Clearance ETA" value={`${health.clearance_minutes}m`} />
      </div>
      <p className="mt-4 rounded-lg bg-muted/60 p-3 text-sm text-foreground">
        <span className="font-semibold">Recommendation: </span>{health.recommended_action}
      </p>
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-display text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}
