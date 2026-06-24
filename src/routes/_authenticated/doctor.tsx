import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Play, CheckCircle2, Stethoscope, Timer, Trophy } from "lucide-react";

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

  return (
    <div className="min-h-screen bg-background">
      <AppHeader role="Doctor" />
      <main className="mx-auto max-w-[1600px] space-y-5 px-6 py-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Doctor Console</h1>
          <p className="text-sm text-muted-foreground">Start and complete consultations. Durations feed live predictions.</p>
        </div>

        <EmergencyBanner count={emergencyCount} />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Served today" value={statsQ.data?.count ?? 0} sub="By you" tone="primary" icon={Trophy} />
          <KpiCard label="Avg duration" value={`${statsQ.data?.avg ?? 0}m`} sub="Per consultation" tone="success" icon={Timer} />
          <KpiCard label="Longest" value={`${statsQ.data?.longest ?? 0}m`} tone="warning" />
          <KpiCard label="Shortest" value={`${statsQ.data?.shortest ?? 0}m`} tone="muted" />
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Current consultation</p>
            <AnimatePresence mode="wait">
              {inProgress ? (
                <motion.div key={inProgress.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 flex flex-wrap items-center gap-5">
                  <div className="grid h-20 w-20 place-items-center rounded-2xl bg-success/10 font-display text-3xl font-bold text-success ring-1 ring-success/30">
                    #{inProgress.token_number}
                  </div>
                  <div className="min-w-[160px] flex-1">
                    <p className="font-display text-xl font-bold">{inProgress.patient_name}</p>
                    <p className="text-sm text-muted-foreground">{VT_LABEL[inProgress.visit_type]} · started {inProgress.started_at ? new Date(inProgress.started_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "—"}</p>
                  </div>
                  <Button size="lg" onClick={() => doComplete(inProgress.id)}>
                    <CheckCircle2 className="mr-1.5 h-4 w-4" /> Complete consultation
                  </Button>
                </motion.div>
              ) : next ? (
                <motion.div key={next.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 flex flex-wrap items-center gap-5">
                  <div className="grid h-20 w-20 place-items-center rounded-2xl bg-primary/10 font-display text-3xl font-bold text-primary ring-1 ring-primary/30">
                    #{next.token_number}
                  </div>
                  <div className="min-w-[160px] flex-1">
                    <p className="font-display text-xl font-bold">{next.patient_name}</p>
                    <p className="text-sm text-muted-foreground">{VT_LABEL[next.visit_type]} · est {next.predicted_duration_minutes}m</p>
                  </div>
                  <Button size="lg" onClick={() => doStart(next.id)}>
                    <Play className="mr-1.5 h-4 w-4" /> Start consultation
                  </Button>
                </motion.div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">No patients waiting. <Stethoscope className="inline h-4 w-4 align-middle" /></p>
              )}
            </AnimatePresence>
          </div>
          <QueueRiskWidget risk={intelQ.data?.risk} />
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h2 className="font-display text-lg font-semibold">Upcoming</h2>
              <span className="text-xs text-muted-foreground">{upcoming.length} waiting</span>
            </div>
            <ul className="divide-y divide-border">
              {upcoming.length === 0 ? (
                <li className="px-5 py-10 text-center text-sm text-muted-foreground">No upcoming patients.</li>
              ) : upcoming.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                  <div className={`grid h-10 w-10 place-items-center rounded-lg font-display text-sm font-bold ${
                    p.priority === "emergency" ? "bg-destructive/10 text-destructive" : "bg-muted text-foreground"
                  }`}>#{p.token_number}</div>
                  <div className="min-w-[120px] flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{p.patient_name}</p>
                      {p.priority === "emergency" ? <Badge variant="destructive" className="text-[10px]">EMERGENCY</Badge> : null}
                    </div>
                    <p className="text-xs text-muted-foreground">{VT_LABEL[p.visit_type]} · est {p.predicted_duration_minutes}m · ETA {p.current_eta_minutes ?? "—"}m</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <QueueHealthWidget health={intelQ.data?.health} />
        </section>
      </main>
    </div>
  );
}
