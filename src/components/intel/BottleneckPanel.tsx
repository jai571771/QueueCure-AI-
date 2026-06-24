import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import type { Bottleneck } from "@/lib/intel.functions";

const VT_LABEL: Record<string, string> = {
  general: "General", follow_up: "Follow-up", prescription: "Prescription",
  lab_review: "Lab Review", vaccination: "Vaccination", emergency: "Emergency",
};
const sevChip = {
  severe: "bg-destructive/15 text-destructive ring-destructive/30",
  moderate: "bg-warning/15 text-warning ring-warning/30",
  mild: "bg-primary/15 text-primary ring-primary/30",
} as const;

export function BottleneckPanel({ items }: { items?: Bottleneck[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h2 className="font-display text-lg font-semibold">Bottleneck Detection</h2>
        <span className="text-xs text-muted-foreground">Visit types running slow today</span>
      </div>
      <ul className="divide-y divide-border">
        {!items || items.length === 0 ? (
          <li className="px-5 py-10 text-center text-sm text-muted-foreground">
            No bottlenecks detected — consultations running on baseline.
          </li>
        ) : items.map((b) => {
          const Trend = b.trend === "up" ? TrendingUp : b.trend === "down" ? TrendingDown : Minus;
          const trendColor = b.trend === "up" ? "text-destructive" : b.trend === "down" ? "text-success" : "text-muted-foreground";
          return (
            <li key={b.visit_type} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <div className="min-w-[160px] flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{VT_LABEL[b.visit_type] ?? b.visit_type}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 ring-inset ${sevChip[b.severity]}`}>
                    {b.severity}
                  </span>
                  <Trend className={`h-3.5 w-3.5 ${trendColor}`} />
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{b.explanation}</p>
              </div>
              <div className="text-right">
                <p className="font-display text-lg font-bold">+{b.deviation_pct}%</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">vs baseline</p>
              </div>
              <div className="text-right">
                <p className="font-display text-lg font-bold text-warning">+{b.impact_minutes}m</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">queue impact</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
