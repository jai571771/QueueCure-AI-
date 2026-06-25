import { motion } from "framer-motion";
import { TrendingDown, TrendingUp, Minus, AlertTriangle } from "lucide-react";
import type { Bottleneck } from "@/lib/intel.functions";

const VT_LABEL: Record<string, string> = {
  general: "General", follow_up: "Follow-up", prescription: "Prescription",
  lab_review: "Lab Review", vaccination: "Vaccination", emergency: "Emergency",
};

const sevChip = {
  severe: "bg-intelligence text-intelligence-foreground border-intelligence/40 shadow-[0_0_8px_var(--intelligence)]",
  moderate: "bg-intelligence/20 text-intelligence border-intelligence/30",
  mild: "bg-intelligence/5 text-intelligence/80 border-intelligence/15",
} as const;

export function BottleneckPanel({ items }: { items?: Bottleneck[] }) {
  // Explainability text
  const whatText = `Tracks visit-types whose current consultation times significantly exceed historical baseline estimates.`;
  const whyText = `Caused by complex patient cases or provider documentation overhead.`;
  const impactText = `Directly compounds queue waiting times, shifting downstream patient ETAs.`;
  const actionText = `Divert upcoming visits of these types or allocate helper staff to current rooms.`;

  return (
    <div className="glass-card border-gradient-intel rounded-2xl p-6 shadow-intel">
      <div className="flex items-center justify-between pb-4 border-b border-border/40 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-intelligence/15 text-intelligence">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Flow Interruption</p>
            <p className="font-display text-sm font-bold text-foreground">Bottleneck Detection</p>
          </div>
        </div>
        <span className="text-xs text-muted-foreground select-none">Realtime delay tracking</span>
      </div>

      <div className="space-y-3 pb-4 border-b border-border/40">
        {!items || items.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No active bottlenecks — clinic operations are running on baseline schedules.
          </div>
        ) : items.map((b) => {
          const Trend = b.trend === "up" ? TrendingUp : b.trend === "down" ? TrendingDown : Minus;
          const trendColor = b.trend === "up" ? "text-intelligence" : b.trend === "down" ? "text-success" : "text-muted-foreground";
          const severityStyle = sevChip[b.severity] || sevChip.mild;

          return (
            <div key={b.visit_type} className="rounded-xl border border-border/30 bg-background/30 p-3.5 flex flex-wrap items-center justify-between gap-4 hover:border-intelligence/30 transition-colors">
              <div className="min-w-[160px] flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-display text-sm font-bold text-foreground">{VT_LABEL[b.visit_type] ?? b.visit_type}</p>
                  <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${severityStyle}`}>
                    {b.severity}
                  </span>
                  <Trend className={`h-3.5 w-3.5 ${trendColor} text-glow-intel`} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground leading-snug">{b.explanation}</p>
              </div>

              <div className="flex items-center gap-5">
                <div className="text-right">
                  <p className="font-display text-lg font-bold text-foreground">+{b.deviation_pct}%</p>
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">vs baseline</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-lg font-bold text-intelligence text-glow-intel">+{b.impact_minutes}m</p>
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">queue impact</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Decision-support Explain Block */}
      <div className="mt-4 space-y-3">
        <ExplainRow label="What" value={whatText} valueClass="font-medium text-foreground text-[13px]" />
        <ExplainRow label="Why" value={whyText} />
        <ExplainRow label="Impact" value={impactText} />
        <ExplainRow label="Action" value={actionText} valueClass="text-intelligence font-medium text-[13px] text-glow-intel" />
      </div>
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

