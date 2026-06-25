import { motion } from "framer-motion";
import { Gauge, TrendingUp, AlertTriangle, ShieldAlert } from "lucide-react";
import type { QueueRisk } from "@/lib/intel.functions";

const map = {
  low: { label: "Risk: Minimal", dot: "bg-intelligence/40", text: "text-intelligence/80 border-intelligence/20 bg-intelligence/5" },
  moderate: { label: "Risk: Elevated", dot: "bg-intelligence shadow-[0_0_6px_var(--intelligence)]", text: "text-intelligence border-intelligence/30 bg-intelligence/10" },
  high: { label: "Risk: Critical", dot: "bg-intelligence shadow-[0_0_8px_var(--intelligence)]", text: "text-intelligence border-intelligence/40 bg-intelligence/15 animate-pulse" },
} as const;

function fmtClock(iso: string) {
  try { return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); }
  catch { return "—"; }
}

export function QueueRiskWidget({ risk }: { risk: QueueRisk | undefined }) {
  if (!risk) {
    return (
      <div className="rounded-2xl border border-border bg-card/50 p-6 shadow-sm animate-pulse h-48 flex items-center justify-center text-sm text-muted-foreground">
        Analyzing queue risk...
      </div>
    );
  }

  const s = map[risk.level] || map.low;

  // What, Why, Impact, Action
  const whatText = `Queue congestion risk is rated as ${risk.level.toUpperCase()} with a load of ${risk.queue_load} waiting patient${risk.queue_load === 1 ? "" : "s"}.`;
  const whyText = `Arrival rate (${risk.arrival_rate_per_hour}/hr) is ${risk.arrival_rate_per_hour > risk.service_rate_per_hour ? "exceeding" : "under"} doctor capacity (${risk.service_rate_per_hour}/hr).`;
  const impactText = `Queue clearance will complete at approximately ${fmtClock(risk.expected_clearance_at)} (${risk.clearance_minutes}m duration).`;
  const actionText = risk.reason;

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
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Risk Forecast</p>
            <p className="font-display text-sm font-bold text-foreground">Congestion Risk Analysis</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${s.text}`}>
          <span className={`h-2 w-2 rounded-full ${s.dot}`} /> {s.label}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 pb-4 border-b border-border/40 text-xs">
        <div className="flex justify-between p-2.5 rounded-lg border border-border/30 bg-background/30">
          <span className="text-muted-foreground">Arrivals</span>
          <span className="font-bold text-foreground">{risk.arrival_rate_per_hour}/hr</span>
        </div>
        <div className="flex justify-between p-2.5 rounded-lg border border-border/30 bg-background/30">
          <span className="text-muted-foreground">Capacity</span>
          <span className="font-bold text-foreground">{risk.service_rate_per_hour}/hr</span>
        </div>
        <div className="flex justify-between p-2.5 rounded-lg border border-border/30 bg-background/30">
          <span className="text-muted-foreground">Queue Load</span>
          <span className="font-bold text-foreground">{risk.queue_load} active</span>
        </div>
        <div className="flex justify-between p-2.5 rounded-lg border border-border/30 bg-background/30">
          <span className="text-muted-foreground">Est. Clear</span>
          <span className="font-bold text-intelligence text-glow-intel">{fmtClock(risk.expected_clearance_at)}</span>
        </div>
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

function ExplainRow({ label, value, valueClass = "text-muted-foreground text-[12px]" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="grid grid-cols-[60px_1fr] gap-3">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">{label}</span>
      <span className={`leading-snug ${valueClass}`}>{value}</span>
    </div>
  );
}

