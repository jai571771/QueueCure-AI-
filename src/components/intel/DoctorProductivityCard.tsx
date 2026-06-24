import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DoctorProductivity } from "@/lib/intel.functions";

const VT_LABEL: Record<string, string> = {
  general: "General", follow_up: "Follow-up", prescription: "Prescription",
  lab_review: "Lab Review", vaccination: "Vaccination", emergency: "Emergency",
};

export function DoctorProductivityCard({ data }: { data?: DoctorProductivity }) {
  if (!data) return <div className="h-72 animate-pulse rounded-2xl bg-muted/40" />;
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 className="font-display text-lg font-semibold">Doctor Productivity</h2>
      <p className="text-xs text-muted-foreground">Your performance · consultations & timing</p>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Patients seen" value={String(data.patients_seen)} />
        <Kpi label="Avg duration" value={`${data.avg_minutes}m`} />
        <Kpi label="Median" value={`${data.median_minutes}m`} />
        <Kpi label="On-time" value={`${data.on_time_pct}%`} tone={data.on_time_pct >= 70 ? "success" : "warning"} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="h-48 rounded-xl border border-border bg-background/40 p-3">
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Consultations per hour</p>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={data.per_hour}>
              <XAxis dataKey="hour" fontSize={10} stroke="hsl(var(--muted-foreground))" />
              <YAxis fontSize={10} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl border border-border bg-background/40 p-3">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Visit-type mix</p>
          <ul className="space-y-1.5 text-sm">
            {data.per_visit_type.length === 0 ? (
              <li className="text-xs text-muted-foreground">No consultations yet today.</li>
            ) : data.per_visit_type.map((p) => (
              <li key={p.visit_type} className="flex items-center justify-between">
                <span>{VT_LABEL[p.visit_type] ?? p.visit_type}</span>
                <span className="text-xs text-muted-foreground">{p.count} · {Math.round(p.avg_seconds / 60)}m avg</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "success" | "warning" }) {
  const color = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`font-display text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
