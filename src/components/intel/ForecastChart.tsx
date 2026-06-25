import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getForecast, type Forecast } from "@/lib/intel.functions";
import { Sparkles, Calendar, TrendingUp } from "lucide-react";

const HORIZONS: { id: Forecast["horizon"]; label: string }[] = [
  { id: "next_2h", label: "Next 2 Hours" },
  { id: "rest_of_day", label: "Rest of Day" },
  { id: "tomorrow", label: "Tomorrow" },
];

function fmt(iso: string, slotMinutes: number) {
  const d = new Date(iso);
  if (slotMinutes <= 15) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return d.toLocaleTimeString([], { hour: "numeric" });
}

export function ForecastChart() {
  const [horizon, setHorizon] = useState<Forecast["horizon"]>("next_2h");
  const fn = useServerFn(getForecast);
  const q = useQuery({
    queryKey: ["forecast", horizon],
    queryFn: () => fn({ data: { horizon } }),
    refetchInterval: 30_000,
  });

  // Explainability text
  const whatText = `Predictive load simulation over the ${horizon === "next_2h" ? "next 2 hours" : horizon === "rest_of_day" ? "rest of the day" : "tomorrow's shift"}.`;
  const whyText = `Generated via EWMA (Exponentially Weighted Moving Average) using recent check-ins and historical doctor consult averages.`;
  const impactText = q.data?.staffing_window 
    ? `Staffing alert: ${q.data.staffing_window}`
    : `Operations are projected to remain within standard safety thresholds.`;
  const actionText = q.data?.staffing_window ? `Consider adding floating clinic staff to prevent backlog.` : `No immediate staffing interventions required.`;

  return (
    <div className="glass-card border-gradient-intel rounded-2xl p-6 shadow-intel">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-intelligence/15 text-intelligence">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Flow Simulation</p>
            <p className="font-display text-sm font-bold text-foreground">Timeline Load Forecast</p>
          </div>
        </div>
        <div className="inline-flex rounded-lg border border-border/60 bg-muted/40 p-1">
          {HORIZONS.map((h) => (
            <button key={h.id} onClick={() => setHorizon(h.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                horizon === h.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}>
              {h.label}
            </button>
          ))}
        </div>
      </div>

      {q.data?.staffing_window ? (
        <div className="mt-4 rounded-xl border border-intelligence-border bg-intelligence/5 px-4 py-2.5 text-xs text-intelligence flex items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0 text-glow-intel" />
          <span><strong>AI Forecast Staffing Recommendation:</strong> {q.data.staffing_window}</span>
        </div>
      ) : null}

      <div className="mt-4 h-64 rounded-xl border border-border/40 bg-background/30 p-2">
        {q.data ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={q.data.slots}>
              <defs>
                <linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--intelligence)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--intelligence)" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis dataKey="slot_start" tickFormatter={(d) => fmt(d, q.data!.slot_minutes)} fontSize={10} stroke="hsl(var(--muted-foreground))" />
              <YAxis fontSize={10} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                labelFormatter={(d) => fmt(String(d), q.data!.slot_minutes)}
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid var(--intelligence-border)", borderRadius: 12, fontSize: 12 }}
              />
              {horizon === "next_2h" ? <ReferenceLine x={q.data.slots[0]?.slot_start} stroke="var(--intelligence)" strokeDasharray="4 4" label={{ value: "now", fontSize: 10, fill: "var(--intelligence)" }} /> : null}
              <Area type="monotone" dataKey="expected_waiting" name="Projected Load" stroke="var(--intelligence)" strokeWidth={2.5} fill="url(#forecastFill)" dot={false} />
              <Area type="monotone" dataKey="expected_arrivals" name="Projected Arrivals" stroke="hsl(var(--secondary))" strokeDasharray="4 4" strokeWidth={1.5} fillOpacity={0} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="grid h-full place-items-center text-sm text-muted-foreground animate-pulse">Running simulation models…</div>
        )}
      </div>

      {q.data ? (
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs md:grid-cols-4 pb-4 border-b border-border/40">
          <Stat label="Waiting Now" value={String(q.data.baseline.waiting_now)} />
          <Stat label="Avg Service" value={`${q.data.baseline.avg_service_minutes}m`} />
          <Stat label="Active Doctors" value={String(q.data.baseline.active_doctors)} />
          <Stat label="Recent Intake" value={`${q.data.baseline.arrival_per_min_recent}/min`} />
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/40 bg-background/40 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className="font-display text-base font-bold text-foreground mt-0.5">{value}</p>
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

