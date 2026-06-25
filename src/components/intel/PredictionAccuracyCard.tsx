import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts";
import type { PredictionAccuracy } from "@/lib/intel.functions";
import { Sparkles, Gauge, Target, Compass } from "lucide-react";
import { AnimatedCounter } from "@/components/common/AnimatedCounter";

const VT_LABEL: Record<string, string> = {
  general: "General", follow_up: "Follow-up", prescription: "Prescription",
  lab_review: "Lab Review", vaccination: "Vaccination", emergency: "Emergency",
};

export function PredictionAccuracyCard({ data }: { data?: PredictionAccuracy }) {
  if (!data) return <div className="h-80 animate-pulse rounded-2xl bg-card border border-border" />;
  
  const conf = data.confidence_distribution;
  const pieData = [
    { name: "High", value: conf.high, color: "var(--intelligence)" },
    { name: "Medium", value: conf.medium, color: "color-mix(in oklab, var(--intelligence) 60%, transparent)" },
    { name: "Low", value: conf.low, color: "color-mix(in oklab, var(--intelligence) 25%, transparent)" },
  ];

  // Explainability text
  const whatText = `Aggregates live ETA prediction performance against actual patient consultation durations.`;
  const whyText = `Calculates MAE (Mean Absolute Error) and structural bias from our EWMA time model.`;
  const impactText = `Keeps ETA predictions within a tight ±${data.mae_minutes}m average error range for patients.`;
  const actionText = data.mae_minutes > 5 
    ? `MAE has crossed the 5-min threshold. Model auto-recalibration scheduled.` 
    : `Prediction variance is healthy. No calibration required.`;

  return (
    <div className="glass-card border-gradient-intel rounded-2xl p-6 shadow-intel">
      <div className="flex items-center justify-between pb-4 border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-intelligence/15 text-intelligence">
            <Target className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Model Diagnostics</p>
            <p className="font-display text-sm font-bold text-foreground">Prediction Reliability</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl font-extrabold text-intelligence text-glow-intel leading-none">
            <AnimatedCounter value={data.accuracy_pct ?? 0} duration={1000} suffix="%" />
          </p>
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mt-1">±5m Tolerance</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <Kpi label="MAE (Error)" value={`${data.mae_minutes}m`} sub="avg variance" />
        <Kpi label="Model Bias" value={`${data.bias_minutes > 0 ? "+" : ""}${data.bias_minutes}m`} sub={data.bias_minutes > 0 ? "over-estimating" : data.bias_minutes < 0 ? "under-estimating" : "neutral"} />
        <Kpi label="Samples" value={String(data.samples)} sub="intake records" />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[1.8fr_1.2fr] pb-4 border-b border-border/40">
        <div className="h-48 rounded-xl border border-border/30 bg-background/30 p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Weekly Accuracy Trend</p>
          <ResponsiveContainer width="100%" height="80%">
            <LineChart data={data.weekly}>
              <XAxis dataKey="week_start" tickFormatter={(d) => new Date(d).toLocaleDateString([], { month: "short", day: "numeric" })} fontSize={9} stroke="hsl(var(--muted-foreground))" />
              <YAxis domain={[0, 100]} fontSize={9} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid var(--intelligence-border)", borderRadius: 12, fontSize: 11 }} />
              <Line type="monotone" dataKey="accuracy_pct" stroke="var(--intelligence)" strokeWidth={2.5} dot={{ r: 4, fill: "var(--intelligence)", strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="h-48 rounded-xl border border-border/30 bg-background/30 p-3 flex flex-col justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Confidence Distribution</p>
          <div className="h-28 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" innerRadius={22} outerRadius={36} paddingAngle={3}>
                  {pieData.map((p) => <Cell key={p.name} fill={p.color} className="focus:outline-none" />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid var(--intelligence-border)", borderRadius: 12, fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-[10px] font-bold text-intelligence">AI Tiers</span>
            </div>
          </div>
          <div className="flex justify-between text-[9px] text-muted-foreground px-1">
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-intelligence" />High</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-intelligence/60" />Med</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-intelligence/25" />Low</span>
          </div>
        </div>
      </div>

      {data.per_visit_type.length > 0 ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-border/40 pb-2.5">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-[9px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Visit type</th>
                <th className="px-3 py-2 text-right font-semibold">Accuracy</th>
                <th className="px-3 py-2 text-right font-semibold">MAE</th>
                <th className="px-3 py-2 text-right font-semibold">Volume</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {data.per_visit_type.map((p) => (
                <tr key={p.visit_type} className="hover:bg-muted/20 transition-colors">
                  <td className="px-3 py-2 font-medium">{VT_LABEL[p.visit_type] ?? p.visit_type}</td>
                  <td className="px-3 py-2 text-right font-bold text-intelligence">{p.accuracy_pct}%</td>
                  <td className="px-3 py-2 text-right">{p.mae_minutes}m</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{p.samples} cases</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

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

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border/40 bg-background/40 p-3">
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className="font-display text-base font-bold text-foreground mt-0.5">{value}</p>
      {sub ? <p className="text-[9px] text-muted-foreground leading-none mt-0.5">{sub}</p> : null}
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

