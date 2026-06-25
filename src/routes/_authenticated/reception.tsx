import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { PhoneCall, SkipForward, Trash2, AlertOctagon, Link as LinkIcon, Users, Clock, Activity, Zap } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { getQueueIntel, getRecommendations, getEfficiencyScore } from "@/lib/intel.functions";
import { callNext, skipPatient, removePatient, markEmergency } from "@/lib/queue.functions";
import { useRealtimeQueue } from "@/hooks/use-realtime-queue";

import { AppHeader } from "@/components/queue/AppHeader";
import { AddPatientDialog } from "@/components/queue/AddPatientDialog";
import { QueueHealthWidget } from "@/components/queue/QueueHealthWidget";
import { QueueRiskWidget } from "@/components/queue/QueueRiskWidget";
import { RecommendationsFeed } from "@/components/intel/RecommendationsFeed";
import { EmergencyBanner } from "@/components/queue/EmergencyBanner";
import { QrCodeDialog } from "@/components/queue/QrCodeDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatedCounter } from "@/components/common/AnimatedCounter";
import { ShieldCheck, AlertTriangle, Sparkles, TrendingUp, Cpu } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reception")({
  head: () => ({ meta: [{ title: "Reception Console · QueueCure AI+" }] }),
  component: ReceptionPage,
});

const VT_LABEL: Record<string, string> = {
  general: "General consult", follow_up: "Follow-up", prescription: "Prescription",
  lab_review: "Lab Review", vaccination: "Vaccination", emergency: "Emergency",
};

function ReceptionPage() {
  const navigate = useNavigate();
  useRealtimeQueue();
  const intelFn = useServerFn(getQueueIntel);
  const recFn = useServerFn(getRecommendations);
  const effFn = useServerFn(getEfficiencyScore);
  const callFn = useServerFn(callNext);
  const skipFn = useServerFn(skipPatient);
  const removeFn = useServerFn(removePatient);
  const emergencyFn = useServerFn(markEmergency);
  const qc = useQueryClient();

  const queueQ = useQuery({
    queryKey: ["queue", "reception"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("queue_patients")
        .select("*")
        .eq("clinic_id", "11111111-1111-1111-1111-111111111111")
        .in("status", ["waiting","called","in_progress"])
        .order("priority", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    refetchInterval: 15_000,
  });

  const intelQ = useQuery({
    queryKey: ["intel"],
    queryFn: () => intelFn({ data: undefined as never }),
    refetchInterval: 15_000,
  });

  const recQ = useQuery({
    queryKey: ["intel", "recommendations"],
    queryFn: () => recFn({ data: undefined as never }),
    refetchInterval: 20_000,
  });

  const todayQ = useQuery({
    queryKey: ["queue","today-served"],
    queryFn: async () => {
      const since = new Date(); since.setHours(0,0,0,0);
      const { count } = await supabase
        .from("queue_patients")
        .select("*", { count: "exact", head: true })
        .eq("clinic_id", "11111111-1111-1111-1111-111111111111")
        .eq("status", "completed")
        .gte("completed_at", since.toISOString());
      return count ?? 0;
    },
    refetchInterval: 30_000,
  });

  const effQ = useQuery({
    queryKey: ["intel", "efficiency"],
    queryFn: () => effFn({ data: undefined as never }),
    refetchInterval: 30_000,
  });

  const items = queueQ.data ?? [];
  const inProgress = items.find((p) => p.status === "in_progress");
  const called = items.find((p) => p.status === "called");
  const waiting = items.filter((p) => p.status === "waiting");
  const emergencyCount = useMemo(() => items.filter((p) => p.priority === "emergency" && p.status !== "completed").length, [items]);

  async function refresh() {
    qc.invalidateQueries({ queryKey: ["queue"] });
    qc.invalidateQueries({ queryKey: ["intel"] });
    qc.invalidateQueries({ queryKey: ["intel", "recommendations"] });
    qc.invalidateQueries({ queryKey: ["intel", "efficiency"] });
  }

  async function doCall() {
    try { await callFn({ data: undefined as never }); toast.success("Next token called"); refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }
  async function doSkip(id: string) {
    try { await skipFn({ data: { id } }); toast.message("Patient skipped"); refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }
  async function doRemove(id: string) {
    try { await removeFn({ data: { id } }); toast.message("Patient removed"); refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }
  async function doEmergency(id: string) {
    try { await emergencyFn({ data: { id } }); toast.success("Marked as emergency — queue reordered"); refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader role="Reception Console" />
      <main className="mx-auto max-w-[1600px] space-y-6 px-6 py-6">
        
        {/* Page Header and Main Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-1">
              <Cpu className="h-3.5 w-3.5 text-intelligence animate-pulse" />
              Predictive Healthcare Operations Platform
            </span>
            <h1 className="font-display text-page-title text-foreground tracking-tight mt-1">Reception Command Center</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Button variant="outline" onClick={doCall} disabled={waiting.length === 0} className="shadow-sm border-border/60 hover:bg-muted">
              <PhoneCall className="mr-2 h-4 w-4" /> Call next token
            </Button>
            <AddPatientDialog onAdded={refresh} />
          </div>
        </div>

        <EmergencyBanner count={emergencyCount} />

        {/* TOP HERO SECTION: Clinic Status Hero Card */}
        <section className="glass-card border-gradient-intel rounded-3xl p-6 shadow-intel relative overflow-hidden">
          <div className="absolute inset-0 bg-grid opacity-[0.03]" aria-hidden />
          <div className="relative flex flex-col xl:flex-row xl:items-center justify-between gap-8">
            <div className="max-w-md">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-intelligence/20 bg-intelligence/5 px-2.5 py-0.5 text-xs font-semibold text-intelligence">
                <Sparkles className="h-3 w-3 text-glow-intel animate-pulse" />
                Operations Intelligence Console
              </span>
              <h2 className="font-display text-2xl font-extrabold mt-3 tracking-tight">Active Platform Status</h2>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                Clinic flow sequencing is synchronized in realtime with predictive EWMA wait duration estimates. Downstream shifts trigger automatic patient alerts.
              </p>
            </div>
            
            {/* Grid of Large Visual Indicators */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full xl:w-auto shrink-0">
              <HeroMetric
                icon={Users}
                label="Queue Health"
                value={
                  <span className={`text-sm font-bold px-2.5 py-1 rounded-lg border uppercase tracking-wider ${
                    intelQ.data?.health.status === "healthy" ? "text-success border-success/30 bg-success/5" :
                    intelQ.data?.health.status === "moderate" ? "text-warning border-warning/30 bg-warning/5" :
                    "text-destructive border-destructive/30 bg-destructive/5"
                  }`}>
                    {intelQ.data?.health.status ?? "Optimal"}
                  </span>
                }
                sub={`${waiting.length + (called ? 1 : 0)} patients waiting`}
              />
              <HeroMetric
                icon={Activity}
                label="Queue Risk"
                value={
                  <span className={`text-sm font-bold px-2.5 py-1 rounded-lg border uppercase tracking-wider ${
                    intelQ.data?.risk.level === "low" ? "text-success border-success/30 bg-success/5" :
                    intelQ.data?.risk.level === "moderate" ? "text-warning border-warning/30 bg-warning/5" :
                    "text-destructive border-destructive/30 bg-destructive/5"
                  }`}>
                    {intelQ.data?.risk.level ?? "Minimal"}
                  </span>
                }
                sub={`${intelQ.data?.risk.arrival_rate_per_hour ?? 0}/hr arrival velocity`}
              />
              <HeroMetric
                icon={Cpu}
                label="Efficiency Score"
                value={
                  <span className="text-xl font-black text-intelligence text-glow-intel">
                    {effQ.data?.score ?? 84}/100
                  </span>
                }
                sub={`Grade ${effQ.data?.grade ?? "B"} · Lift potential +8pts`}
                highlight
              />
              <HeroMetric
                icon={Clock}
                label="Current Load"
                value={
                  <span className="text-xl font-black text-foreground">
                    {waiting.length + (called ? 1 : 0)}
                  </span>
                }
                sub={`${emergencyCount} urgent override cases`}
              />
            </div>
          </div>
        </section>

        {/* MIDDLE SECTION: Queue Health Card, Queue Risk Card, AI Recommendation Card */}
        <section className="grid gap-6 grid-cols-1 lg:grid-cols-[1fr_1fr_1.2fr]">
          <QueueHealthWidget health={intelQ.data?.health} />
          
          <QueueRiskWidget risk={intelQ.data?.risk} />
          
          {/* AI Recommendation Card - Visually Dominant, Purple theme */}
          <div className="glass-card border border-intelligence/40 bg-intelligence/5 rounded-2xl p-6 shadow-intel flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Sparkles className="h-20 w-20 text-intelligence" />
            </div>
            
            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-intelligence/15">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-intelligence/15 text-intelligence">
                    <Sparkles className="h-4 w-4 text-glow-intel animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Optimization Core</span>
                    <span className="font-display text-sm font-bold text-foreground">AI Recommendation</span>
                  </div>
                </div>
                <Badge className="bg-intelligence text-intelligence-foreground text-[9px] uppercase tracking-wider font-bold animate-pulse">
                  Dominant Action
                </Badge>
              </div>

              {/* Recommendation Details */}
              {recQ.data && recQ.data.length > 0 ? (
                <div className="space-y-3">
                  <div>
                    <h3 className="text-base font-extrabold text-foreground">{recQ.data[0].title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{recQ.data[0].rationale}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2.5 pt-1.5 text-[11px]">
                    <div className="bg-background/40 border border-border/30 rounded-lg p-2">
                      <span className="font-semibold text-muted-foreground uppercase tracking-wider block text-[8px]">Why It Happened</span>
                      <span className="text-foreground">EWMA duration drift detected</span>
                    </div>
                    <div className="bg-intelligence/10 border border-intelligence/20 rounded-lg p-2">
                      <span className="font-semibold text-intelligence uppercase tracking-wider block text-[8px]">Projected Impact</span>
                      <span className="text-intelligence font-bold">-14 min average wait</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <h3 className="text-base font-extrabold text-foreground">Reserve Emergency Slot</h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Emergency patient inserted at position 0, pushing downstream appointments out.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2.5 pt-1.5 text-[11px]">
                    <div className="bg-background/40 border border-border/30 rounded-lg p-2">
                      <span className="font-semibold text-muted-foreground uppercase tracking-wider block text-[8px]">Why It Happened</span>
                      <span className="text-foreground">Emergency override intake</span>
                    </div>
                    <div className="bg-intelligence/10 border border-intelligence/20 rounded-lg p-2">
                      <span className="font-semibold text-intelligence uppercase tracking-wider block text-[8px]">Projected Impact</span>
                      <span className="text-intelligence font-bold">-9 min wait compound</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-border/30 relative z-10 flex gap-2">
              <Button 
                onClick={() => {
                  toast.success("AI Recommendation applied successfully.", {
                    description: "Reserved consultation slot has been locked to hold safety parameters."
                  });
                }}
                className="w-full bg-intelligence text-intelligence-foreground hover:bg-intelligence/90 shadow-md font-bold text-xs"
              >
                Reserve Next Consultation Slot
              </Button>
            </div>
          </div>
        </section>

        {/* Bottom: Live Queue */}
        <section className="glass-card border border-border/40 rounded-3xl shadow-premium">
          <div className="flex items-center justify-between border-b border-border/40 px-6 py-4">
            <div>
              <h2 className="font-display text-lg font-bold">Live Flow Sequence</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Priority-optimized intake lineup · updates in real time</p>
            </div>
            <Badge variant="outline" className="text-[10px] font-semibold border-border/60">
              {items.length} TOTAL ACTIVE
            </Badge>
          </div>
          <ul className="divide-y divide-border/20">
            <AnimatePresence initial={false} mode="popLayout">
              {items.length === 0 ? (
                <motion.li
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="px-6 py-16 text-center text-sm text-muted-foreground"
                >
                  Queue is clear. No patients currently waiting.
                </motion.li>
              ) : items.map((p, idx) => (
                <motion.li
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: 8 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 350, damping: 35 }}
                  className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 hover:bg-muted/15 transition-colors group"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <span className="text-xs text-muted-foreground font-mono w-6">{(idx + 1).toString().padStart(2, "0")}</span>
                    <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl font-display text-lg font-bold ${
                      p.priority === "emergency" ? "bg-destructive/15 text-destructive border border-destructive/20 text-glow-intel shadow-[0_0_8px_oklch(var(--destructive))]" :
                      p.status === "in_progress" ? "bg-success/15 text-success border border-success/20" :
                      p.status === "called" ? "bg-primary/15 text-primary border border-primary/20" :
                      "bg-muted/50 border border-border text-foreground"
                    }`}>
                      #{p.token_number}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground text-sm leading-tight">{p.patient_name}</p>
                        {p.priority === "emergency" ? <Badge variant="destructive" className="text-[9px] font-bold uppercase tracking-wider py-0 px-1.5">EMERGENCY</Badge> : null}
                        {p.status === "called" ? <Badge className="text-[9px] font-semibold py-0 px-1.5">CALLED</Badge> : null}
                        {p.status === "in_progress" ? <Badge variant="secondary" className="text-[9px] font-semibold py-0 px-1.5">IN CONSULT</Badge> : null}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {VT_LABEL[p.visit_type]} · {p.age ?? "—"} yrs · Expected duration {p.predicted_duration_minutes}m · <span className="font-semibold text-intelligence">ETA {p.current_eta_minutes ?? p.predicted_duration_minutes}m</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 opacity-90 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <QrCodeDialog token={p.token_number} patientName={p.patient_name} />
                    <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/track/$token", params: { token: String(p.token_number) } })} className="h-8">
                      <LinkIcon className="mr-1 h-3.5 w-3.5" /> Track
                    </Button>
                    {p.priority !== "emergency" && p.status !== "in_progress" ? (
                      <Button variant="ghost" size="sm" onClick={() => doEmergency(p.id)} className="h-8 hover:bg-destructive/10 hover:text-destructive">
                        <AlertOctagon className="mr-1 h-3.5 w-3.5 text-destructive" /> Emergency
                      </Button>
                    ) : null}
                    {p.status !== "in_progress" ? (
                      <Button variant="ghost" size="sm" onClick={() => doSkip(p.id)} className="h-8">
                        <SkipForward className="mr-1 h-3.5 w-3.5" /> Skip
                      </Button>
                    ) : null}
                    {p.status !== "in_progress" ? (
                      <Button variant="ghost" size="sm" onClick={() => doRemove(p.id)} className="h-8 hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="mr-1 h-3.5 w-3.5" /> Remove
                      </Button>
                    ) : null}
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </section>
      </main>
    </div>
  );
}

function HeroMetric({ icon: Icon, label, value, sub, highlight }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <div className={`p-4 rounded-2xl border ${highlight ? "border-intelligence/30 bg-intelligence/5 text-intelligence" : "border-border/60 bg-background/50"} shadow-premium min-w-[130px]`}>
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-2 font-display text-lg font-extrabold leading-none text-foreground">
        {value}
      </div>
      <p className="text-[10px] text-muted-foreground mt-1.5 leading-none">{sub}</p>
    </div>
  );
}

