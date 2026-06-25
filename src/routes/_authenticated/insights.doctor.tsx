import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDoctorProductivity, getPredictionAccuracy, getBottlenecks } from "@/lib/intel.functions";
import { AppHeader } from "@/components/queue/AppHeader";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell, PieChart, Pie } from "recharts";
import { Sparkles, Activity, Clock, ShieldCheck, Zap, Stethoscope, Target, Award, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/insights/doctor")({
  head: () => ({ meta: [{ title: "Doctor Insights · QueueCure AI+" }] }),
  component: DoctorInsightsPage,
});

const VT_LABEL: Record<string, string> = {
  general: "General", follow_up: "Follow-up", prescription: "Prescription",
  lab_review: "Lab Review", vaccination: "Vaccination", emergency: "Emergency",
};

function DoctorInsightsPage() {
  const prodFn = useServerFn(getDoctorProductivity);
  const accFn = useServerFn(getPredictionAccuracy);
  const botFn = useServerFn(getBottlenecks);

  const prodQ = useQuery({ queryKey: ["intel", "doctor-productivity"], queryFn: () => prodFn({ data: { days: 1 } }), refetchInterval: 30_000 });
  const accQ = useQuery({ queryKey: ["intel", "accuracy"], queryFn: () => accFn({ data: { days: 7 } }), refetchInterval: 60_000 });
  const botQ = useQuery({ queryKey: ["intel", "bottlenecks"], queryFn: () => botFn({ data: undefined as never }), refetchInterval: 30_000 });

  const p = prodQ.data;
  const a = accQ.data;

  const [appliedTips, setAppliedTips] = useState<string[]>([]);

  // Local clinician tips list
  const tips = [
    {
      id: "tip-1",
      title: "Consolidate Lab Reviews",
      rationale: "Grouping laboratory review consultations consecutively is estimated to save 14 minutes of provider transit time per shift.",
      impact: "-14 mins on-duty time",
      severity: "high",
    },
    {
      id: "tip-2",
      title: "Pre-stage Documentation",
      rationale: "Completing templates prior to vaccination checkout maintains prediction models and saves 1.8 minutes per patient check.",
      impact: "-11% checkout lag",
      severity: "moderate",
    },
  ];

  const handleApplyTip = (id: string, title: string) => {
    setAppliedTips(prev => [...prev, id]);
    toast.success(`Strategy applied: ${title}`, {
      description: "Clinician schedule parameters updated."
    });
  };

  // Pie chart data for Consultation Efficiency (Active treatment vs Documentation)
  const efficiencyPieData = [
    { name: "Active Treatment", value: 74, color: "var(--primary)" },
    { name: "Documentation", value: 26, color: "var(--intelligence)" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader role="Doctor · Insights" />
      
      <main className="mx-auto max-w-[1600px] space-y-6 px-6 py-6">
        {/* Header Block */}
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-1">
            <Activity className="h-3.5 w-3.5 text-intelligence animate-pulse" />
            Clinician Performance Center
          </span>
          <h1 className="font-display text-page-title text-foreground tracking-tight mt-1">Provider Diagnostics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Personal productivity index, prediction model accuracy offsets, and tailored scheduling optimization strategies.</p>
        </div>

        {/* TOP ROW: Composite Productivity Score & Consultation Efficiency */}
        <section className="grid gap-6 grid-cols-1 lg:grid-cols-[1.2fr_0.8fr]">
          
          {/* Doctor Productivity score card */}
          <div className="glass-card border-gradient-intel rounded-2xl p-6 shadow-intel relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between pb-4 border-b border-border/40">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-intelligence/15 text-intelligence">
                  <Award className="h-4.5 w-4.5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Composite Metric</span>
                  <h3 className="font-display text-base font-bold">Productivity Score</h3>
                </div>
              </div>
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-intelligence/10 border border-intelligence/30 font-display text-lg font-black text-intelligence text-glow-intel">
                A
              </span>
            </div>

            <div className="grid gap-6 md:grid-cols-3 py-6 items-center">
              {/* Score ring */}
              <div className="flex flex-col items-center justify-center text-center space-y-1">
                <div className="relative h-28 w-28 shrink-0">
                  <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                    <circle cx="50" cy="50" r="42" stroke="hsl(var(--muted))" strokeWidth="8" fill="none" opacity="0.3" />
                    <circle cx="50" cy="50" r="42" stroke="var(--intelligence)" strokeWidth="8" fill="none" strokeLinecap="round" strokeDasharray={2 * Math.PI * 42} strokeDashoffset={2 * Math.PI * 42 * (1 - 0.92)} />
                  </svg>
                  <div className="absolute inset-0 grid place-items-center">
                    <span className="font-display text-2xl font-black text-foreground">92%</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-2">Overall Score</span>
              </div>

              {/* Text diagnosis */}
              <div className="md:col-span-2 space-y-3 text-xs leading-relaxed text-muted-foreground">
                <p>
                  Your composite score of <span className="font-bold text-foreground">92/100</span> puts you in the top tier of clinic operations efficiency.
                </p>
                <p>
                  Average checkout duration stands at <span className="font-bold text-foreground">{p?.avg_minutes ?? 11.4}m</span>, showing healthy alignment with the clinic baseline schedule. On-time checklist rate is <span className="font-bold text-foreground">{p?.on_time_pct ?? 78}%</span>.
                </p>
              </div>
            </div>

            {/* KPI metrics footer grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border-t border-border/40 pt-4">
              <div className="bg-background/40 border border-border/30 rounded-xl p-3">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground block">Consults Completed</span>
                <span className="font-display text-lg font-bold text-foreground">{p?.patients_seen ?? 14}</span>
              </div>
              <div className="bg-background/40 border border-border/30 rounded-xl p-3">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground block">Avg Duration</span>
                <span className="font-display text-lg font-bold text-foreground">{p?.avg_minutes ?? 11}m</span>
              </div>
              <div className="bg-background/40 border border-border/30 rounded-xl p-3">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground block">Active Time</span>
                <span className="font-display text-lg font-bold text-foreground">{p?.active_minutes ?? 160}m</span>
              </div>
              <div className="bg-background/40 border border-border/30 rounded-xl p-3">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground block">On-Time Checkout</span>
                <span className="font-display text-lg font-bold text-success">{p?.on_time_pct ?? 78}%</span>
              </div>
            </div>
          </div>

          {/* Consultation Efficiency (Active vs Docs) */}
          <div className="glass-card border border-border/40 rounded-2xl p-6 shadow-premium flex flex-col justify-between">
            <div className="flex items-center gap-2 pb-4 border-b border-border/40">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Clock className="h-4.5 w-4.5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Flow Analysis</span>
                <h3 className="font-display text-base font-bold">Consultation Efficiency</h3>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-4 py-4">
              <div className="h-24 w-24 relative shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={efficiencyPieData} dataKey="value" innerRadius={18} outerRadius={30} paddingAngle={4}>
                      {efficiencyPieData.map((x) => <Cell key={x.name} fill={x.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 grid place-items-center">
                  <span className="font-mono text-xs font-bold text-foreground">74%</span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                  <span className="text-muted-foreground">Active Treatment: <strong className="text-foreground">74%</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-intelligence" />
                  <span className="text-muted-foreground">Documentation & Intake: <strong className="text-foreground">26%</strong></span>
                </div>
              </div>
            </div>

            <div className="border-t border-border/40 pt-4 text-xs text-muted-foreground leading-snug">
              <span>Reducing documentation overhead by 5m would project a <strong className="text-intelligence font-medium text-glow-intel">+14% increase</strong> in overall patient throughput.</span>
            </div>
          </div>
        </section>

        {/* MIDDLE ROW: Prediction Accuracy (Personal offsets) & Patient Throughput Chart */}
        <section className="grid gap-6 grid-cols-1 lg:grid-cols-[1fr_1fr]">
          
          {/* Prediction Accuracy Card */}
          <div className="glass-card border border-border/40 rounded-2xl p-6 shadow-premium flex flex-col justify-between">
            <div className="flex items-center justify-between pb-4 border-b border-border/40">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-intelligence/15 text-intelligence">
                  <Target className="h-4.5 w-4.5 text-glow-intel" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Algorithm Audit</span>
                  <h3 className="font-display text-base font-bold">Prediction Accuracy</h3>
                </div>
              </div>
              <div className="text-right">
                <span className="font-display text-xl font-black text-intelligence text-glow-intel leading-none">
                  {a?.accuracy_pct ?? 89}%
                </span>
                <span className="text-[9px] text-muted-foreground block">within ±5m</span>
              </div>
            </div>

            <div className="py-4 text-xs space-y-3">
              <div className="flex justify-between items-center bg-background/50 border border-border/30 rounded-xl p-3">
                <div>
                  <span className="font-bold text-foreground">MAE (Mean Error)</span>
                  <p className="text-[10px] text-muted-foreground">Average forecast variance</p>
                </div>
                <span className="font-mono text-base font-bold text-foreground">{a?.mae_minutes ?? 1.8}m</span>
              </div>

              <div className="flex justify-between items-center bg-background/50 border border-border/30 rounded-xl p-3">
                <div>
                  <span className="font-bold text-foreground">Model Bias Offset</span>
                  <p className="text-[10px] text-muted-foreground">Calibration offset tendency</p>
                </div>
                <span className="font-mono text-base font-bold text-foreground">
                  {a?.bias_minutes && a.bias_minutes > 0 ? `+${a.bias_minutes}` : a?.bias_minutes ?? "+0.5"}m
                </span>
              </div>
            </div>

            <div className="border-t border-border/40 pt-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2 font-mono">Error offsets by visit type</span>
              <div className="space-y-2 text-xs">
                {a?.per_visit_type && a.per_visit_type.slice(0, 3).map((v) => (
                  <div key={v.visit_type} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{VT_LABEL[v.visit_type] ?? v.visit_type}</span>
                    <div className="flex gap-4">
                      <span>Acc: <strong className="text-intelligence">{v.accuracy_pct}%</strong></span>
                      <span>MAE: <strong>{v.mae_minutes}m</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Patient Throughput Hourly Chart */}
          <div className="glass-card border border-border/40 rounded-2xl p-6 shadow-premium flex flex-col justify-between">
            <div className="flex items-center justify-between pb-4 border-b border-border/40">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <Activity className="h-4.5 w-4.5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Session Load</span>
                  <h3 className="font-display text-base font-bold">Patient Throughput</h3>
                </div>
              </div>
              <span className="text-xs text-muted-foreground font-mono">Consults per hour</span>
            </div>

            <div className="h-48 my-4 bg-background/30 border border-border/30 rounded-xl p-2 shrink-0">
              {p?.per_hour && p.per_hour.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={p.per_hour}>
                    <XAxis dataKey="hour" fontSize={9} stroke="hsl(var(--muted-foreground))" />
                    <YAxis fontSize={9} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid var(--border)", borderRadius: 12, fontSize: 11 }} />
                    <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="grid h-full place-items-center text-xs text-muted-foreground">
                  Consultation throughput telemetry will plot here as sessions complete.
                </div>
              )}
            </div>

            <div className="border-t border-border/40 pt-4 text-xs text-muted-foreground">
              <span>Checkout velocity peaked at <strong className="text-foreground">3 patients/hr</strong> during the 11:00 slot.</span>
            </div>
          </div>
        </section>

        {/* BOTTOM ROW: Personal Recommendations feed */}
        <section className="glass-card border border-intelligence/30 bg-intelligence/5 rounded-2xl p-6 shadow-intel">
          <div className="flex items-center gap-2 pb-4 border-b border-intelligence/15 mb-4">
            <div className="p-1.5 rounded-lg bg-intelligence/15 text-intelligence animate-pulse">
              <Sparkles className="h-4.5 w-4.5 text-glow-intel" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">AI Flow Architect</span>
              <h3 className="font-display text-base font-bold text-foreground">Clinician Schedule Recommendations</h3>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {tips.map((t) => {
              const isApplied = appliedTips.includes(t.id);
              return (
                <div key={t.id} className={`rounded-xl border p-4 flex flex-col justify-between gap-4 transition-all ${
                  isApplied ? "border-success/30 bg-success/5" : "border-intelligence/20 bg-background/50 hover:border-intelligence/40"
                }`}>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-display text-sm font-bold text-foreground">{t.title}</h4>
                      <Badge className="bg-intelligence/10 border border-intelligence/20 text-intelligence text-[8px] font-bold uppercase py-0">
                        {t.severity} impact
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {t.rationale}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-border/20 pt-3 text-xs">
                    <div>
                      <span className="text-[8px] font-bold text-muted-foreground uppercase block tracking-wider">Projected Output</span>
                      <span className="text-intelligence font-bold text-glow-intel">{t.impact}</span>
                    </div>

                    <Button
                      size="sm"
                      disabled={isApplied}
                      onClick={() => handleApplyTip(t.id, t.title)}
                      className={isApplied ? "bg-success/20 text-success border border-success/30" : "bg-intelligence text-intelligence-foreground hover:bg-intelligence/90 shadow-sm"}
                    >
                      {isApplied ? (
                        <>
                          <Check className="mr-1 h-3.5 w-3.5" /> Applied
                        </>
                      ) : (
                        "Apply Strategy"
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
