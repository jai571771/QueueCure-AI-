import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { PhoneCall, SkipForward, Trash2, AlertOctagon, Link as LinkIcon, Users, Clock, Activity } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { getQueueIntel } from "@/lib/intel.functions";
import { callNext, skipPatient, removePatient, markEmergency } from "@/lib/queue.functions";
import { useRealtimeQueue } from "@/hooks/use-realtime-queue";

import { AppHeader } from "@/components/queue/AppHeader";
import { AddPatientDialog } from "@/components/queue/AddPatientDialog";
import { KpiCard } from "@/components/queue/KpiCard";
import { QueueHealthWidget } from "@/components/queue/QueueHealthWidget";
import { QueueRiskWidget } from "@/components/queue/QueueRiskWidget";
import { EmergencyBanner } from "@/components/queue/EmergencyBanner";
import { QrCodeDialog } from "@/components/queue/QrCodeDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/reception")({
  head: () => ({ meta: [{ title: "Reception · QueueCure AI+" }] }),
  component: ReceptionPage,
});

const VT_LABEL: Record<string, string> = {
  general: "General", follow_up: "Follow-up", prescription: "Prescription",
  lab_review: "Lab Review", vaccination: "Vaccination", emergency: "Emergency",
};

function ReceptionPage() {
  const navigate = useNavigate();
  useRealtimeQueue();
  const intelFn = useServerFn(getQueueIntel);
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

  const items = queueQ.data ?? [];
  const inProgress = items.find((p) => p.status === "in_progress");
  const called = items.find((p) => p.status === "called");
  const waiting = items.filter((p) => p.status === "waiting");
  const emergencyCount = useMemo(() => items.filter((p) => p.priority === "emergency" && p.status !== "completed").length, [items]);

  async function refresh() {
    qc.invalidateQueries({ queryKey: ["queue"] });
    qc.invalidateQueries({ queryKey: ["intel"] });
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
    <div className="min-h-screen bg-background">
      <AppHeader role="Reception" />
      <main className="mx-auto max-w-[1600px] space-y-5 px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold">Reception Command Center</h1>
            <p className="text-sm text-muted-foreground">Manage intake, ordering, and emergencies in real time.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={doCall} disabled={waiting.length === 0}>
              <PhoneCall className="mr-1.5 h-4 w-4" /> Call next
            </Button>
            <AddPatientDialog onAdded={refresh} />
          </div>
        </div>

        <EmergencyBanner count={emergencyCount} />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="In queue" value={waiting.length + (called ? 1 : 0)} sub={`${emergencyCount} emergency`} tone="primary" icon={Users} />
          <KpiCard label="Now serving" value={inProgress ? `#${inProgress.token_number}` : called ? `#${called.token_number}` : "—"} sub={inProgress ? inProgress.patient_name : called ? `${called.patient_name} (called)` : "Idle"} tone="success" icon={Activity} />
          <KpiCard label="Served today" value={todayQ.data ?? 0} sub="Across all visit types" tone="muted" icon={Clock} />
          <KpiCard label="Clearance ETA" value={`${intelQ.data?.health.clearance_minutes ?? 0}m`} sub="At current pace" tone="warning" icon={Clock} />
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <QueueHealthWidget health={intelQ.data?.health} />
          <QueueRiskWidget risk={intelQ.data?.risk} />
        </section>

        <section className="rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <h2 className="font-display text-lg font-semibold">Live queue</h2>
            <span className="text-xs text-muted-foreground">Priority-ordered · realtime</span>
          </div>
          <ul className="divide-y divide-border">
            <AnimatePresence initial={false}>
              {items.length === 0 ? (
                <li className="px-5 py-10 text-center text-sm text-muted-foreground">No patients in the queue.</li>
              ) : items.map((p) => (
                <motion.li
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                  transition={{ type: "spring", stiffness: 320, damping: 32 }}
                  className="flex flex-wrap items-center gap-3 px-5 py-3"
                >
                  <div className={`grid h-12 w-12 place-items-center rounded-xl font-display text-lg font-bold ${
                    p.priority === "emergency" ? "bg-destructive/10 text-destructive ring-1 ring-destructive/30" :
                    p.status === "in_progress" ? "bg-success/10 text-success ring-1 ring-success/30" :
                    p.status === "called" ? "bg-primary/10 text-primary ring-1 ring-primary/30" :
                    "bg-muted text-foreground"
                  }`}>#{p.token_number}</div>
                  <div className="min-w-[160px] flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{p.patient_name}</p>
                      {p.priority === "emergency" ? <Badge variant="destructive" className="text-[10px]">EMERGENCY</Badge> : null}
                      {p.status === "called" ? <Badge className="text-[10px]">CALLED</Badge> : null}
                      {p.status === "in_progress" ? <Badge variant="secondary" className="text-[10px]">IN CONSULT</Badge> : null}
                    </div>
                    <p className="text-xs text-muted-foreground">{VT_LABEL[p.visit_type]} · {p.age ?? "—"} yrs · ETA {p.current_eta_minutes ?? p.predicted_duration_minutes}m</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <QrCodeDialog token={p.token_number} patientName={p.patient_name} />
                    <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/track/$token", params: { token: String(p.token_number) } })}>
                      <LinkIcon className="mr-1 h-3.5 w-3.5" /> Tracker
                    </Button>
                    {p.priority !== "emergency" && p.status !== "in_progress" ? (
                      <Button variant="ghost" size="sm" onClick={() => doEmergency(p.id)}>
                        <AlertOctagon className="mr-1 h-3.5 w-3.5 text-destructive" /> Emergency
                      </Button>
                    ) : null}
                    {p.status !== "in_progress" ? (
                      <Button variant="ghost" size="sm" onClick={() => doSkip(p.id)}>
                        <SkipForward className="mr-1 h-3.5 w-3.5" /> Skip
                      </Button>
                    ) : null}
                    {p.status !== "in_progress" ? (
                      <Button variant="ghost" size="sm" onClick={() => doRemove(p.id)}>
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
