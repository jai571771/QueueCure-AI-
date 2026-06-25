import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Play, CheckCircle2, Stethoscope, Timer, Trophy, ShieldAlert, Users, Sparkles, Activity } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { getQueueIntel } from "@/lib/intel.functions";
import { startConsult, completeConsult } from "@/lib/consult.functions";
import { useRealtimeQueue } from "@/hooks/use-realtime-queue";

import { AppHeader } from "@/components/queue/AppHeader";
import { KpiCard } from "@/components/queue/KpiCard";
import { QueueHealthWidget } from "@/components/queue/QueueHealthWidget";
import { QueueRiskWidget } from "@/components/queue/QueueRiskWidget";
import { EmergencyBanner } from "@/components/queue/EmergencyBanner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const CLINIC = "11111111-1111-1111-1111-111111111111";
const VT_LABEL: Record<string, string> = {
  general: "General", follow_up: "Follow-up", prescription: "Prescription",
  lab_review: "Lab Review", vaccination: "Vaccination", emergency: "Emergency",
};

export const Route = createFileRoute("/_authenticated/doctor")({
  head: () => ({ meta: [{ title: "Doctor · QueueCure AI+" }] }),
  component: DoctorPage,
});

function DoctorPage() {
  useRealtimeQueue();
  const qc = useQueryClient();
  const intelFn = useServerFn(getQueueIntel);
  const startFn = useServerFn(startConsult);
  const completeFn = useServerFn(completeConsult);

  const queueQ = useQuery({
    queryKey: ["queue", "doctor"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("queue_patients").select("*").eq("clinic_id", CLINIC)
        .in("status", ["waiting","called","in_progress"])
        .order("priority", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    refetchInterval: 15_000,
  });

  const intelQ = useQuery({
    queryKey: ["intel"], queryFn: () => intelFn({ data: undefined as never }), refetchInterval: 15_000,
  });

  const statsQ = useQuery({
    queryKey: ["doctor","stats"],
    queryFn: async () => {
      const since = new Date(); since.setHours(0,0,0,0);
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) return { count: 0, avg: 0, longest: 0, shortest: 0 };
      const { data: evts } = await supabase
        .from("consultation_events")
        .select("duration_seconds, started_at")
        .eq("clinic_id", CLINIC).eq("doctor_id", uid)
        .gte("started_at", since.toISOString());
      const durs = (evts ?? []).map((e) => e.duration_seconds ?? 0).filter((n) => n > 0);
      const avg = durs.length ? durs.reduce((a,b) => a+b,0) / durs.length : 0;
      return {
        count: durs.length,
        avg: Math.round(avg / 60),
        longest: durs.length ? Math.round(Math.max(...durs) / 60) : 0,
        shortest: durs.length ? Math.round(Math.min(...durs) / 60) : 0,
      };
    },
    refetchInterval: 30_000,
  });

  const items = queueQ.data ?? [];
  const inProgress = items.find((p) => p.status === "in_progress");
  const called = items.find((p) => p.status === "called");
  const next = called ?? items.find((p) => p.status === "waiting");
  const upcoming = items.filter((p) => p.id !== inProgress?.id && p.id !== next?.id && p.status !== "in_progress");
  const emergencyCount = items.filter((p) => p.priority === "emergency" && p.status !== "completed").length;

  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!inProgress || !inProgress.started_at) {
      setElapsed(0);
      return;
    }
    setElapsed(Math.max(0, Math.round((new Date().getTime() - new Date(inProgress.started_at).getTime()) / 1000)));
    const interval = setInterval(() => {
      setElapsed(Math.max(0, Math.round((new Date().getTime() - new Date(inProgress.started_at!).getTime()) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [inProgress]);

  function refresh() {
    qc.invalidateQueries({ queryKey: ["queue"] });
    qc.invalidateQueries({ queryKey: ["intel"] });
    qc.invalidateQueries({ queryKey: ["doctor"] });
  }

  async function doStart(id: string) {
    try { await startFn({ data: { id } }); toast.success("Consultation started"); refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }
  async function doComplete(id: string) {
    try { await completeFn({ data: { id } }); toast.success("Consultation completed"); refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  const elapsedMins = Math.floor(elapsed / 60);
  const elapsedSecs = elapsed % 60;
  const isOvertime = inProgress && elapsedMins > inProgress.predicted_duration_minutes;
  const overtimeMins = inProgress ? elapsedMins - inProgress.predicted_duration_minutes : 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader role="Doctor" />
      
      <main className="mx-auto max-w-[1600px] px-6 py-6 space-y-6">
        {/* Header Block */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-1">
              <Activity className="h-3.5 w-3.5 text-intelligence animate-pulse" />
              Clinician Workspace Mode
            </span>
            <h1 className="font-display text-page-title text-foreground tracking-tight mt-1">Doctor Console</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Real-time consultation stamps update the predictive EWMA models instantly.</p>
          </div>
        </div>

        <EmergencyBanner count={emergencyCount} />

        {/* Focused view split: Left (60%) for active workspace and Upcoming queue, Right (40%) for Telemetry and Diagnostics */}
        <div className="grid gap-6 lg:grid-cols-[1.8fr_1.2fr]">
          
          {/* LEFT 60% COLUMN: Consultation Workspace & Upcoming Timeline */}
          <div className="space-y-6">
            
            {/* Massive Consultation Card */}
            <div className="glass-card border border-border/40 rounded-3xl p-6 shadow-premium relative overflow-hidden">
              <div className="absolute inset-0 bg-grid opacity-[0.02] pointer-events-none" />
              <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Stethoscope className="h-4 w-4 text-primary" />
                  Active Consultation Desk
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">Provider: Dr. Jenkins</span>
              </div>

              <AnimatePresence mode="wait">
                {inProgress ? (
                  <motion.div
                    key={inProgress.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-6"
                  >
                    {/* Active Patient Details Row */}
                    <div className="flex flex-wrap items-center gap-6">
                      <div className="grid h-24 w-24 place-items-center rounded-2xl bg-success/15 font-display text-4xl font-black text-success border border-success/20 shadow-[0_0_12px_oklch(var(--success)/0.1)]">
                        #{inProgress.token_number}
                      </div>
                      
                      <div className="space-y-1.5 flex-1 min-w-[200px]">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="font-display text-2xl font-black text-foreground">{inProgress.patient_name}</h2>
                          <Badge variant={inProgress.priority === "emergency" ? "destructive" : "secondary"} className="text-[9px] font-bold uppercase tracking-wider">
                            {inProgress.priority}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Visit Type: <span className="font-semibold text-foreground">{VT_LABEL[inProgress.visit_type]}</span> · Expected: <span className="font-semibold text-foreground">{inProgress.predicted_duration_minutes}m</span>
                        </p>
                      </div>

                      {/* Live consultation timer */}
                      <div className="rounded-2xl bg-background/50 border border-border/60 px-5 py-3 text-center shrink-0">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground block">Elapsed Time</span>
                        <span className="font-mono text-2xl font-black text-foreground">
                          {elapsedMins.toString().padStart(2, "0")}:{elapsedSecs.toString().padStart(2, "0")}
                        </span>
                      </div>
                    </div>

                    {/* Dedicated Queue Impact Alert Block */}
                    <div className={`rounded-xl border p-4 text-xs ${
                      isOvertime 
                        ? "border-warning/30 bg-warning/5 text-warning" 
                        : "border-intelligence/30 bg-intelligence/5 text-intelligence"
                    }`}>
                      <div className="flex items-start gap-2.5">
                        <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">Downstream Queue Impact Assessment</p>
                          <p className="mt-1 text-muted-foreground leading-relaxed">
                            {isOvertime 
                              ? `Consultation is running ${overtimeMins}m over baseline schedule. This has added +${overtimeMins}m drift to upcoming patient ETAs.`
                              : `Consultation is running within safe safety parameters. Downstream queue impact: Neutral (holding on baseline schedules).`}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2 border-t border-border/40">
                      <Button size="lg" onClick={() => doComplete(inProgress.id)} className="bg-success text-success-foreground hover:bg-success/90 shadow-md h-12 font-bold px-6">
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Complete consultation
                      </Button>
                    </div>
                  </motion.div>
                ) : next ? (
                  <motion.div
                    key={next.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-6"
                  >
                    <div className="flex flex-wrap items-center gap-6">
                      <div className="grid h-24 w-24 place-items-center rounded-2xl bg-primary/15 font-display text-4xl font-black text-primary border border-primary/20">
                        #{next.token_number}
                      </div>
                      <div className="space-y-1.5 flex-1 min-w-[200px]">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="font-display text-2xl font-black text-foreground">{next.patient_name}</h2>
                          <Badge variant={next.priority === "emergency" ? "destructive" : "outline"} className="text-[9px] font-bold uppercase tracking-wider">
                            {next.priority}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Up Next · Visit Type: <span className="font-semibold text-foreground">{VT_LABEL[next.visit_type]}</span> · Estimated Duration: <span className="font-semibold text-foreground">{next.predicted_duration_minutes}m</span>
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/30 bg-muted/20 p-4 text-xs text-muted-foreground flex items-center gap-2">
                      <Timer className="h-4 w-4 text-primary" />
                      <span>Ready to commence. Average checkout calibration: {next.predicted_duration_minutes} minutes.</span>
                    </div>

                    <div className="flex justify-end pt-2 border-t border-border/40">
                      <Button size="lg" onClick={() => doStart(next.id)} className="bg-primary text-primary-foreground hover:bg-primary/95 shadow-md h-12 font-bold px-6">
                        <Play className="mr-2 h-4 w-4 fill-current" /> Start consultation
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <div className="py-12 text-center text-sm text-muted-foreground flex flex-col items-center justify-center space-y-2">
                    <Stethoscope className="h-10 w-10 text-muted-foreground/30 animate-pulse" />
                    <p className="font-bold text-foreground">Clinic queue is currently empty</p>
                    <p className="text-xs max-w-xs leading-relaxed">No patients are waiting in the queue. You are officially in a standby state.</p>
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Upcoming Timeline Queue */}
            <div className="glass-card border border-border/40 rounded-3xl shadow-premium">
              <div className="flex items-center justify-between border-b border-border/40 px-6 py-4">
                <div>
                  <h2 className="font-display text-lg font-bold text-foreground">Upcoming Clinic Schedule</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Estimated timeline sequence based on live diagnostic flow</p>
                </div>
                <Badge variant="outline" className="text-[10px] font-semibold border-border/60">
                  {upcoming.length} upcoming
                </Badge>
              </div>
              
              <ul className="divide-y divide-border/20">
                {upcoming.length === 0 ? (
                  <li className="px-6 py-12 text-center text-sm text-muted-foreground">
                    No upcoming patient sessions queued.
                  </li>
                ) : upcoming.slice(0, 5).map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-muted/15 transition-colors group">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className={`grid h-10 w-10 place-items-center rounded-xl font-display text-sm font-bold ${
                        p.priority === "emergency" 
                          ? "bg-destructive/15 text-destructive border border-destructive/20 text-glow-intel" 
                          : "bg-muted text-foreground"
                      }`}>
                        #{p.token_number}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm leading-tight text-foreground">{p.patient_name}</p>
                          {p.priority === "emergency" ? <Badge variant="destructive" className="text-[8px] font-bold py-0 px-1.5">EMERGENCY</Badge> : null}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {VT_LABEL[p.visit_type]} · est. {p.predicted_duration_minutes}m consult duration
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-intelligence font-mono">
                        ETA {p.current_eta_minutes ?? "—"}m
                      </span>
                      <span className="block text-[9px] text-muted-foreground font-mono mt-0.5">predicted waiting</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

          </div>

          {/* RIGHT 40% COLUMN: Diagnostics & Telemetry widgets */}
          <div className="space-y-6">
            
            {/* Dr. Jenkins' Telemetry metrics dashboard */}
            <div className="glass-card border border-border/40 rounded-3xl p-5 shadow-premium">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-4 pb-2 border-b border-border/40">
                <Sparkles className="h-4 w-4 text-intelligence" />
                Clinician Performance Diagnostics
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-background/40 border border-border/30 rounded-2xl p-4 flex flex-col justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Served Today</span>
                  <div>
                    <span className="text-3xl font-black text-foreground font-display block mt-1.5 leading-none">
                      {statsQ.data?.count ?? 0}
                    </span>
                    <span className="text-[9px] text-muted-foreground mt-1 block">completed consults</span>
                  </div>
                </div>
                
                <div className="bg-background/40 border border-border/30 rounded-2xl p-4 flex flex-col justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Avg Session</span>
                  <div>
                    <span className="text-3xl font-black text-foreground font-display block mt-1.5 leading-none">
                      {statsQ.data?.avg ?? 0}m
                    </span>
                    <span className="text-[9px] text-muted-foreground mt-1 block">per consult checkout</span>
                  </div>
                </div>
                
                <div className="bg-background/40 border border-border/30 rounded-2xl p-4 flex flex-col justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-semibold">Longest Consult</span>
                  <div>
                    <span className="text-xl font-bold text-foreground font-display block mt-1.5 leading-none">
                      {statsQ.data?.longest ?? 0}m
                    </span>
                  </div>
                </div>
                
                <div className="bg-background/40 border border-border/30 rounded-2xl p-4 flex flex-col justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-semibold">Shortest Consult</span>
                  <div>
                    <span className="text-xl font-bold text-foreground font-display block mt-1.5 leading-none">
                      {statsQ.data?.shortest ?? 0}m
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <QueueRiskWidget risk={intelQ.data?.risk} />
            <QueueHealthWidget health={intelQ.data?.health} />

          </div>
          
        </div>
      </main>
    </div>
  );
}
