import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { Activity } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { getQueueIntel } from "@/lib/intel.functions";
import { useRealtimeQueue } from "@/hooks/use-realtime-queue";

import { AppHeader } from "@/components/queue/AppHeader";
import { QueueHealthWidget } from "@/components/queue/QueueHealthWidget";
import { QueueRiskWidget } from "@/components/queue/QueueRiskWidget";
import { EmergencyBanner } from "@/components/queue/EmergencyBanner";

const CLINIC = "11111111-1111-1111-1111-111111111111";
const VT_LABEL: Record<string, string> = {
  general: "General", follow_up: "Follow-up", prescription: "Prescription",
  lab_review: "Lab Review", vaccination: "Vaccination", emergency: "Emergency",
};

export const Route = createFileRoute("/_authenticated/waiting-room")({
  head: () => ({ meta: [{ title: "Waiting Room · QueueCure AI+" }] }),
  component: WaitingRoom,
});

function WaitingRoom() {
  useRealtimeQueue();
  const intelFn = useServerFn(getQueueIntel);
  const queueQ = useQuery({
    queryKey: ["queue","waiting-room"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("queue_patients").select("*").eq("clinic_id", CLINIC)
        .in("status", ["waiting","called","in_progress"])
        .order("priority", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    refetchInterval: 10_000,
  });
  const intelQ = useQuery({ queryKey: ["intel"], queryFn: () => intelFn({ data: undefined as never }), refetchInterval: 10_000 });

  const items = queueQ.data ?? [];
  const inProgress = items.find((p) => p.status === "in_progress");
  const called = items.find((p) => p.status === "called");
  const nowServing = inProgress ?? called;
  const next = items.filter((p) => p.status === "waiting").slice(0, 5);
  const emergencyCount = items.filter((p) => p.priority === "emergency" && p.status !== "completed").length;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader role="Waiting Room" />
      <main className="mx-auto max-w-[1600px] space-y-6 px-6 py-6">
        <EmergencyBanner count={emergencyCount} />
        <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary to-primary/80 p-8 text-primary-foreground shadow-lg">
            <div className="absolute inset-0 bg-grid opacity-10" aria-hidden />
            <p className="relative text-xs font-medium uppercase tracking-[0.2em] text-primary-foreground/80">Now serving</p>
            <AnimatePresence mode="wait">
              {nowServing ? (
                <motion.div key={nowServing.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="relative mt-2">
                  <p className="font-display text-[8rem] font-extrabold leading-none tracking-tight">#{nowServing.token_number}</p>
                  <p className="mt-1 font-display text-2xl font-semibold">{nowServing.patient_name}</p>
                  <p className="mt-1 text-sm text-primary-foreground/80">{VT_LABEL[nowServing.visit_type]} · {inProgress ? "in consultation" : "please proceed"}</p>
                </motion.div>
              ) : (
                <motion.p key="idle" className="relative mt-3 font-display text-3xl font-semibold">Awaiting next patient</motion.p>
              )}
            </AnimatePresence>
            <div className="relative mt-6 flex items-center gap-2 text-xs text-primary-foreground/70">
              <Activity className="h-3.5 w-3.5" /> Live · updates automatically
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Up next</p>
            <ul className="mt-3 space-y-2">
              <AnimatePresence initial={false}>
                {next.length === 0 ? (
                  <li className="rounded-xl bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">No further patients.</li>
                ) : next.map((p, i) => (
                  <motion.li key={p.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className={`grid h-12 w-12 place-items-center rounded-lg font-display text-lg font-bold ${
                        p.priority === "emergency" ? "bg-destructive/10 text-destructive" : i === 0 ? "bg-secondary/20 text-secondary-foreground" : "bg-muted"
                      }`}>#{p.token_number}</span>
                      <div>
                        <p className="font-medium">{p.patient_name}</p>
                        <p className="text-xs text-muted-foreground">{VT_LABEL[p.visit_type]}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-muted-foreground">ETA {p.current_eta_minutes ?? p.predicted_duration_minutes}m</span>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <QueueHealthWidget health={intelQ.data?.health} />
          <QueueRiskWidget risk={intelQ.data?.risk} />
        </section>
      </main>
    </div>
  );
}
