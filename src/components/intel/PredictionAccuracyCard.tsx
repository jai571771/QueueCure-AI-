import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts";
import type { PredictionAccuracy } from "@/lib/intel.functions";

const VT_LABEL: Record<string, string> = {
  general: "General", follow_up: "Follow-up", prescription: "Prescription",
  lab_review: "Lab Review", vaccination: "Vaccination", emergency: "Emergency",
};

export function PredictionAccuracyCard({ data }: { data?: PredictionAccuracy }) {
  if (!data) return <div className="h-72 animate-pulse rounded-2xl bg-muted/40" />;
  const conf = data.confidence_distribution;
  const pieData = [
    { name: "High", value: conf.high, color: "hsl(var(--success))" },
    { name: "Medium", value: conf.medium, color: "hsl(var(--warning))" },
    { name: "Low", value: conf.low, color: "hsl(var(--destructive))" },
  ];
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold">Prediction Performance</h2>
          <p className="text-xs text-muted-foreground">ETA accuracy & weekly trend</p>
        </div>
        <div className="text-right">
          <p className="font-display text-3xl font-bold text-primary">{data.accuracy_pct ?? "—"}%</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">within ±5 min · {data.samples} samples</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <Kpi label="MAE" value={`${data.mae_minutes}m`} />
        <Kpi label="Bias" value={`${data.bias_minutes > 0 ? "+" : ""}${data.bias_minutes}m`} sub={data.bias_minutes > 0 ? "over" : data.bias_minutes < 0 ? "under" : "neutral"} />
        <Kpi label="Samples" value={String(data.samples)} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="h-44 rounded-xl border border-border bg-background/50 p-3">
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Weekly accuracy</p>
          <ResponsiveContainer width="100%" height="85%">
            <LineChart data={data.weekly}>
              <XAxis dataKey="week_start" tickFormatter={(d) => new Date(d).toLocaleDateString([], { month: "short", day: "numeric" })} fontSize={10} stroke="hsl(var(--muted-foreground))" />
              <YAxis domain={[0, 100]} fontSize={10} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="accuracy_pct" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="h-44 rounded-xl border border-border bg-background/50 p-3">
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Confidence distribution</p>
          <ResponsiveContainer width="100%" height="85%">
            <PieChart>
              <Pie data={pieData} dataKey="value" innerRadius={28} outerRadius={48} paddingAngle={2}>
                {pieData.map((p) => <Cell key={p.name} fill={p.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      {data.per_visit_type.length > 0 ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr><th className="px-3 py-2 text-left font-medium">Visit type</th><th className="px-3 py-2 text-right font-medium">Accuracy</th><th className="px-3 py-2 text-right font-medium">MAE</th><th className="px-3 py-2 text-right font-medium">Samples</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.per_visit_type.map((p) => (
                <tr key={p.visit_type}>
                  <td className="px-3 py-2">{VT_LABEL[p.visit_type] ?? p.visit_type}</td>
                  <td className="px-3 py-2 text-right font-medium">{p.accuracy_pct}%</td>
                  <td className="px-3 py-2 text-right">{p.mae_minutes}m</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{p.samples}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-display text-base font-bold">{value}{sub ? <span className="ml-1 text-[10px] font-normal text-muted-foreground">{sub}</span> : null}</p>
    </div>
  );
}
