import { motion } from "framer-motion";
import { Gauge, TrendingUp, AlertOctagon } from "lucide-react";
import type { QueueRisk } from "@/lib/intel.functions";

const map = {
  low: { label: "Low Risk", dot: "bg-success", text: "text-success", icon: Gauge, ring: "ring-success/30" },
  moderate: { label: "Moderate Risk", dot: "bg-warning", text: "text-warning", icon: TrendingUp, ring: "ring-warning/30" },
  high: { label: "High Risk", dot: "bg-destructive", text: "text-destructive", icon: AlertOctagon, ring: "ring-destructive/30" },
} as const;

function fmtClock(iso: string) {
  try { return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); }
  catch { return "—"; }
}

export function QueueRiskWidget({ risk }: { risk: QueueRisk | undefined }) {
  if (!risk) return <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">Loading…</div>;
  const s = map[risk.level];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Queue Risk</p>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${s.ring} ${s.text}`}>
          <span className={`h-2 w-2 rounded-full ${s.dot}`} /> {s.label}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Stat label="Expected Clearance" value={fmtClock(risk.expected_clearance_at)} />
        <Stat label="Current Load" value={`${risk.queue_load} waiting`} />
        <Stat label="Doctor Capacity" value={`${risk.service_rate_per_hour}/hr`} />
        <Stat label="Arrival Rate" value={`${risk.arrival_rate_per_hour}/hr`} />
      </div>
      <p className="mt-4 rounded-lg bg-muted/60 p-3 text-sm text-foreground">
        <span className="font-semibold">Reason: </span>{risk.reason}
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
