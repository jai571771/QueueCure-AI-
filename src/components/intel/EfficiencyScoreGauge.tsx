import { motion } from "framer-motion";
import type { EfficiencyScore } from "@/lib/intel.functions";
import { AnimatedCounter } from "@/components/common/AnimatedCounter";
import { Shield, Sparkles, Activity, Clock, Zap, Target } from "lucide-react";

const gradeTone: Record<string, string> = {
  A: "text-success border-success/30 bg-success/10",
  B: "text-intelligence border-intelligence/30 bg-intelligence/10",
  C: "text-warning border-warning/30 bg-warning/10",
  D: "text-destructive border-destructive/30 bg-destructive/10",
};

export function EfficiencyScoreGauge({ data }: { data?: EfficiencyScore }) {
  if (!data) return <div className="h-80 animate-pulse rounded-2xl bg-card border border-border" />;

  const pct = Math.max(0, Math.min(100, data.score));
  const tone = gradeTone[data.grade] ?? gradeTone.C;
  const subs = data.sub_scores;

  const whatText = data.what ?? `Clinic efficiency score is computed at ${data.score}/100, receiving an overall Grade ${data.grade}.`;
  const whyText = data.why ?? `The primary performance ceiling is currently driven by: ${data.biggest_lever}.`;
  const impactText = data.impact ?? `Addressing this bottleneck is projected to yield a +${data.estimated_lift_points ?? 8} point lift in operational capacity.`;
  const actionText = data.action ?? `Initiate provider load leveling protocols for ${data.biggest_lever.toLowerCase()}.`;

  return (
    <div className="glass-card border-gradient-intel rounded-2xl p-6 shadow-intel">
      <div className="flex items-center justify-between pb-4 border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-intelligence/15 text-intelligence">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Operations Center</p>
            <p className="font-display text-sm font-bold text-foreground">Clinic Efficiency Index</p>
          </div>
        </div>
        <span className={`grid h-10 w-10 place-items-center rounded-xl font-display text-lg font-bold border ${tone}`}>
          {data.grade}
        </span>
      </div>

      <div className="mt-6 flex flex-col md:flex-row items-center md:items-end gap-8 pb-6 border-b border-border/40">
        {/* Animated Radial Gauge */}
        <div className="relative h-36 w-36 shrink-0">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <circle cx="60" cy="60" r="50" stroke="hsl(var(--muted))" strokeWidth="8" fill="none" opacity="0.3" />
            <motion.circle
              cx="60" cy="60" r="50"
              stroke="var(--intelligence)"
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 50}
              initial={{ strokeDashoffset: 2 * Math.PI * 50 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 50 * (1 - pct / 100) }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="drop-shadow-[0_0_6px_var(--intelligence)]"
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <p className="font-display text-4xl font-extrabold leading-none text-foreground">
                <AnimatedCounter value={data.score} duration={1000} />
              </p>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground mt-1">Efficiency Index</p>
            </div>
          </div>
        </div>

        {/* Sub-scores Grid */}
        <div className="grid grid-cols-2 gap-3 w-full">
          <SubCard icon={Clock} label="Avg wait" value={`${subs.avg_wait.value_minutes}m`} score={subs.avg_wait.score} />
          <SubCard icon={Target} label="Accuracy" value={`${subs.prediction_accuracy.value_pct}%`} score={subs.prediction_accuracy.score} />
          <SubCard icon={Zap} label="Clearance" value={`${subs.clearance_speed.value_minutes}m`} score={subs.clearance_speed.score} />
          <SubCard icon={Shield} label="Utilization" value={`${subs.doctor_utilization.value_pct}%`} score={subs.doctor_utilization.score} />
        </div>
      </div>

      {/* Decision-support Explain Block */}
      <div className="mt-5 space-y-3">
        <ExplainRow label="What" value={whatText} valueClass="font-medium text-foreground text-[13px]" />
        <ExplainRow label="Why" value={whyText} />
        <ExplainRow label="Impact" value={impactText} />
        <ExplainRow label="Action" value={actionText} valueClass="text-intelligence font-medium text-[13px] text-glow-intel" />
      </div>
    </div>
  );
}

function SubCard({ icon: Icon, label, value, score }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; score: number }) {
  const tone = score >= 80 ? "text-success" : score >= 60 ? "text-warning" : "text-destructive";
  return (
    <div className="rounded-xl border border-border/40 bg-background/40 p-3 flex items-center justify-between hover:border-intelligence/30 transition-colors">
      <div>
        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground block mb-0.5">{label}</span>
        <span className="font-display text-base font-bold text-foreground">{value}</span>
      </div>
      <div className="text-right">
        <Icon className="h-3.5 w-3.5 text-muted-foreground/60 mb-0.5 ml-auto" />
        <span className={`text-[11px] font-bold ${tone}`}>{score} pts</span>
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

