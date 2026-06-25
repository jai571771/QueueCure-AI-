import { motion } from "framer-motion";
import { Activity, ShieldCheck, AlertCircle, Clock, Users, Zap, Shield } from "lucide-react";
import type { QueueHealth } from "@/lib/intel.functions";

const map = {
  healthy: { label: "Flow: Optimal", dot: "bg-success shadow-[0_0_8px_var(--color-success)]", text: "text-success border-success/30 bg-success/5" },
  moderate: { label: "Flow: Strained", dot: "bg-warning shadow-[0_0_8px_var(--color-warning)]", text: "text-warning border-warning/30 bg-warning/5" },
  critical: { label: "Flow: Bottlenecked", dot: "bg-destructive shadow-[0_0_8px_var(--color-destructive)]", text: "text-destructive border-destructive/30 bg-destructive/5" },
} as const;

export function QueueHealthWidget({ health }: { health: QueueHealth | undefined }) {
  if (!health) {
    return (
      <div className="rounded-2xl border border-border bg-card/50 p-6 shadow-sm animate-pulse h-48 flex items-center justify-center text-sm text-muted-foreground">
        Analyzing queue health...
      </div>
    );
  }

  const s = map[health.status] || map.healthy;

  // Decision-support messaging
  const whatText = `Clinic queue flow is operating in a ${health.status} state with ${health.waiting} waiting patient${health.waiting === 1 ? "" : "s"}.`;
  const whyText = health.status === "healthy"
    ? `Active providers (${health.active_doctors}) are matching checking-in patient arrivals. Average service duration stands at ${Math.round(health.avg_service_seconds / 60)}m.`
    : `Provider bandwidth (${health.active_doctors} active) is slightly falling behind intake rates. Current service average is ${Math.round(health.avg_service_seconds / 60)}m.`;
  const impactText = `Estimated clearance time is ${health.clearance_minutes} minutes for all currently queued patients.`;
  const actionText = health.recommended_action;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-card border-gradient-intel rounded-2xl p-6 shadow-intel"
    >
      <div className="flex items-center justify-between pb-4 border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-intelligence/15 text-intelligence">
            <Shield className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Queue Health Audit</p>
            <p className="font-display text-sm font-bold text-foreground">Predictive Flow Analysis</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${s.text}`}>
          <span className={`h-2 w-2 rounded-full ${s.dot}`} /> {s.label}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4 pb-4 border-b border-border/40">
        <StatItem icon={Users} label="Waiting Now" value={String(health.waiting)} />
        <StatItem icon={Clock} label="Avg Service" value={`${Math.round(health.avg_service_seconds / 60)}m`} />
        <StatItem icon={Zap} label="Clearance ETA" value={`${health.clearance_minutes}m`} highlight />
      </div>

      {/* Decision-support Explanation Section */}
      <div className="mt-4 space-y-3">
        <ExplainRow label="What" value={whatText} valueClass="font-medium text-foreground text-[13px]" />
        <ExplainRow label="Why" value={whyText} />
        <ExplainRow label="Impact" value={impactText} />
        <ExplainRow label="Action" value={actionText} valueClass="text-intelligence font-medium text-[13px] text-glow-intel" />
      </div>
    </motion.div>
  );
}

function StatItem({ icon: Icon, label, value, highlight }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="p-3 rounded-xl border border-border/40 bg-background/40">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" /> {label}
      </div>
      <p className={`mt-1 font-display text-2xl font-bold leading-none ${highlight ? "text-intelligence" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}

function ExplainRow({ label, value, valueClass = "text-muted-foreground text-[12px]" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="grid grid-cols-[60px_1fr] gap-3">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">{label}</span>
      <span className={`leading-snug ${valueClass}`}>{value}</span>
    </div>
  );
}

