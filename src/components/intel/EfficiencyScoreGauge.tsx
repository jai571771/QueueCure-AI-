import { motion } from "framer-motion";
import type { EfficiencyScore } from "@/lib/intel.functions";
import { ExplainCard } from "@/components/common/ExplainCard";

const gradeTone: Record<string, string> = {
  A: "text-success ring-success/30 bg-success/10",
  B: "text-primary ring-primary/30 bg-primary/10",
  C: "text-warning ring-warning/30 bg-warning/10",
  D: "text-destructive ring-destructive/30 bg-destructive/10",
};

export function EfficiencyScoreGauge({ data }: { data?: EfficiencyScore }) {
  if (!data) return <div className="h-48 animate-pulse rounded-2xl bg-muted/40" />;
  const pct = Math.max(0, Math.min(100, data.score));
  const tone = gradeTone[data.grade] ?? gradeTone.C;
  const subs = data.sub_scores;
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Clinic Efficiency Score</p>
          <p className="text-xs text-muted-foreground">Composite operational health</p>
        </div>
        <span className={`grid h-12 w-12 place-items-center rounded-xl font-display text-2xl font-bold ring-1 ${tone}`}>
          {data.grade}
        </span>
      </div>
      <div className="mt-4 flex items-end gap-6">
        <div className="relative h-32 w-32 shrink-0">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <circle cx="60" cy="60" r="50" stroke="hsl(var(--muted))" strokeWidth="10" fill="none" />
            <motion.circle
              cx="60" cy="60" r="50" stroke="hsl(var(--primary))" strokeWidth="10" fill="none"
              strokeLinecap="round" strokeDasharray={2 * Math.PI * 50}
              initial={{ strokeDashoffset: 2 * Math.PI * 50 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 50 * (1 - pct / 100) }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <p className="font-display text-3xl font-bold leading-none">{data.score}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">/ 100</p>
            </div>
          </div>
        </div>
        <div className="grid flex-1 grid-cols-2 gap-3 text-sm">
          <Sub label="Avg wait" value={`${subs.avg_wait.value_minutes}m`} score={subs.avg_wait.score} />
          <Sub label="Accuracy" value={`${subs.prediction_accuracy.value_pct}%`} score={subs.prediction_accuracy.score} />
          <Sub label="Clearance" value={`${subs.clearance_speed.value_minutes}m`} score={subs.clearance_speed.score} />
          <Sub label="Utilization" value={`${subs.doctor_utilization.value_pct}%`} score={subs.doctor_utilization.score} />
        </div>
      </div>
      <div className="mt-4">
        <ExplainCard
          eyebrow="Optimize"
          what={data.what ?? `Efficiency score ${data.score} (grade ${data.grade})`}
          why={data.why ?? `Biggest lever: ${data.biggest_lever}`}
          impact={data.impact ?? `Fixing ${data.biggest_lever.toLowerCase()} could lift this score`}
          action={data.action ?? data.biggest_lever}
          severity={data.grade === "A" ? "info" : data.grade === "B" ? "mild" : data.grade === "C" ? "moderate" : "high"}
        />
      </div>
    </div>
  );
}

function Sub({ label, value, score }: { label: string; value: string; score: number }) {
  const tone = score >= 80 ? "text-success" : score >= 60 ? "text-warning" : "text-destructive";
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="mt-0.5 flex items-baseline gap-1.5">
        <p className="font-display text-base font-bold">{value}</p>
        <span className={`text-xs font-semibold ${tone}`}>{score}</span>
      </div>
    </div>
  );
}
