import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getForecast, type Forecast } from "@/lib/intel.functions";

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

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Smart Timeline Forecast</h2>
          <p className="text-xs text-muted-foreground">Projected queue load · arrival × service intelligence</p>
        </div>
        <div className="inline-flex rounded-lg border border-border bg-muted/30 p-1">
          {HORIZONS.map((h) => (
            <button key={h.id} onClick={() => setHorizon(h.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                horizon === h.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}>
              {h.label}
            </button>
          ))}
        </div>
      </div>

      {q.data?.staffing_window ? (
        <div className="mt-3 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
          ⚡ {q.data.staffing_window}
        </div>
      ) : null}

      <div className="mt-4 h-64 rounded-xl border border-border bg-background/40 p-2">
        {q.data ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={q.data.slots}>
              <defs>
                <linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="slot_start" tickFormatter={(d) => fmt(d, q.data!.slot_minutes)} fontSize={10} stroke="hsl(var(--muted-foreground))" />
              <YAxis fontSize={10} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                labelFormatter={(d) => fmt(String(d), q.data!.slot_minutes)}
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
              />
              {horizon === "next_2h" ? <ReferenceLine x={q.data.slots[0]?.slot_start} stroke="hsl(var(--secondary))" strokeDasharray="4 4" label={{ value: "now", fontSize: 10, fill: "hsl(var(--secondary))" }} /> : null}
              <Area type="monotone" dataKey="expected_waiting" name="Expected queue" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#forecastFill)" />
              <Area type="monotone" dataKey="expected_arrivals" name="Expected arrivals" stroke="hsl(var(--secondary))" strokeWidth={1.5} fillOpacity={0} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="grid h-full place-items-center text-sm text-muted-foreground">Loading forecast…</div>
        )}
      </div>

      {q.data ? (
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
          <Stat label="Waiting now" value={String(q.data.baseline.waiting_now)} />
          <Stat label="Avg service" value={`${q.data.baseline.avg_service_minutes}m`} />
          <Stat label="Active doctors" value={String(q.data.baseline.active_doctors)} />
          <Stat label="Recent arrivals" value={`${q.data.baseline.arrival_per_min_recent}/min`} />
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-display text-sm font-bold">{value}</p>
    </div>
  );
}
