import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Clock, Users, ArrowRight, Volume2, ShieldCheck, AlertCircle } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { getQueueIntel } from "@/lib/intel.functions";
import { useRealtimeQueue } from "@/hooks/use-realtime-queue";

import { AppHeader } from "@/components/queue/AppHeader";
import { EmergencyBanner } from "@/components/queue/EmergencyBanner";

const CLINIC = "11111111-1111-1111-1111-111111111111";
const VT_LABEL: Record<string, string> = {
  general: "General Consult", follow_up: "Follow-up", prescription: "Prescription",
  lab_review: "Lab Review", vaccination: "Vaccination", emergency: "Emergency",
};

export const Route = createFileRoute("/_authenticated/waiting-room")({
  head: () => ({ meta: [{ title: "Live Board · QueueCure AI+" }] }),
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
  const next = items.filter((p) => p.status === "waiting").slice(0, 7);
  const emergencyCount = items.filter((p) => p.priority === "emergency" && p.status !== "completed").length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader role="Live Board" />
      <main className="mx-auto max-w-[1600px] px-6 py-6 space-y-6">

        <EmergencyBanner count={emergencyCount} />

        {/* Airport Board + Google Maps ETA Layout */}
        <section className="airport-board rounded-3xl overflow-hidden shadow-2xl border border-white/5 grid lg:grid-cols-[1.1fr_0.9fr]">

          {/* Left Signboard: Now Serving (Massive, Readable from 15ft away) */}
          <div className="p-8 md:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/10 relative overflow-hidden bg-gradient-to-b from-white/[0.03] to-transparent">
            <div className="absolute inset-0 bg-grid opacity-5 pointer-events-none" />

            {/* Header with pulsating active call indicator */}
            <div className="relative flex items-center justify-between border-b border-white/10 pb-6">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-destructive animate-ping" />
                <span className="text-xs font-bold uppercase tracking-[0.25em] text-white">NOW SERVING / ACTIVE CALLS</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-intelligence font-mono">
                <span className="h-2 w-2 rounded-full bg-intelligence animate-pulse" />
                Audio Announcements Sync
              </div>
            </div>

            {/* Massive Token Display & Maps-style ETA */}
            <div className="relative py-14 flex flex-col items-center justify-center text-center">
              <AnimatePresence mode="wait">
                {nowServing ? (
                  <motion.div
                    key={nowServing.id}
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -15 }}
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    className="space-y-6"
                  >
                    {/* Maps ETA Pulse Pill */}
                    <div className="inline-flex items-center gap-2 rounded-full border border-destructive/30 bg-destructive/10 px-4 py-1 text-xs font-bold text-destructive animate-pulse-subtle">
                      <span className="h-2 w-2 rounded-full bg-destructive" />
                      <span>ETA: NOW</span>
                    </div>

                    <p className="font-mono text-[9rem] md:text-[11rem] font-black leading-none tracking-tighter text-glow-intel text-intelligence">
                      #{nowServing.token_number}
                    </p>

                    <div className="space-y-2">
                      <p className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                        {nowServing.patient_name}
                      </p>
                      <p className="text-xs md:text-sm text-muted-foreground uppercase tracking-[0.15em] font-semibold">
                        {VT_LABEL[nowServing.visit_type]} · {inProgress ? "Room 3 · Consulting" : "Please proceed to Counter 1"}
                      </p>
                    </div>

                    {/* Google Maps style progress bar */}
                    <div className="mt-8 max-w-xs mx-auto space-y-2">
                      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden relative">
                        <div className="absolute top-0 left-0 h-full bg-intelligence rounded-full" style={{ width: inProgress ? "75%" : "40%" }} />
                      </div>
                      <div className="flex justify-between text-[9px] uppercase tracking-wider font-mono text-muted-foreground">
                        <span>Check-In</span>
                        <span className={!inProgress ? "text-intelligence font-bold" : ""}>Called</span>
                        <span className={inProgress ? "text-intelligence font-bold" : ""}>In Consult</span>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="py-20"
                  >
                    <p className="font-display text-xl md:text-2xl font-bold text-muted-foreground uppercase tracking-widest">
                      Awaiting next patient token
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Status footer telemetry */}
            <div className="relative border-t border-white/10 pt-6 flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground font-mono">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-success animate-pulse" /> Live Telemetry Online
              </div>
              <div>Estimated queue load: {items.length} total active</div>
            </div>
          </div>

          {/* Right Signboard: Upcoming lineup (High-contrast list) */}
          <div className="p-8 md:p-12 flex flex-col justify-between bg-gradient-to-b from-white/[0.01] to-transparent">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-6 mb-6">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-bold uppercase tracking-[0.25em] text-white">UP NEXT / QUEUE TIMELINE</span>
                </div>
                <span className="text-xs text-muted-foreground font-mono">Realtime schedule</span>
              </div>

              {/* Stepped departures items */}
              <div className="space-y-3">
                <AnimatePresence mode="popLayout" initial={false}>
                  {next.length === 0 ? (
                    <motion.div
                      key="empty-lineup"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="rounded-xl border border-white/10 bg-white/[0.02] py-20 text-center text-sm text-muted-foreground"
                    >
                      No upcoming patients in queue.
                    </motion.div>
                  ) : next.map((p, idx) => (
                    <motion.div
                      key={p.id}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 350, damping: 35 }}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all px-5 py-4 airport-cell group"
                    >
                      <div className="flex items-center gap-4">
                        <span className={`grid h-10 w-12 place-items-center rounded-lg font-mono text-base font-bold ${
                          p.priority === "emergency" ? "bg-destructive/20 text-destructive border border-destructive/30" : idx === 0 ? "bg-intelligence/20 text-intelligence border border-intelligence/30" : "bg-white/5 text-muted-foreground"
                        }`}>
                          #{p.token_number}
                        </span>
                        <div>
                          <p className="font-bold text-sm tracking-tight text-white">{p.patient_name}</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">{VT_LABEL[p.visit_type]}</p>
                        </div>
                      </div>
                      
                      {/* Google Maps style ETA tag */}
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-xs font-bold font-mono text-intelligence block">
                            {p.current_eta_minutes ?? p.predicted_duration_minutes}m wait
                          </span>
                          <span className="text-[9px] text-muted-foreground block font-mono">
                            {idx === 0 ? "Call imminent" : `In ~${p.current_eta_minutes ?? p.predicted_duration_minutes} mins`}
                          </span>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* Bottom diagnostic feed widgets */}
            {intelQ.data?.health && (
              <div className="mt-8 border-t border-white/10 pt-6 grid grid-cols-2 gap-4 text-xs font-mono">
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-muted-foreground block mb-0.5 uppercase text-[9px]">EST CLEARANCE</span>
                    <span className="text-sm font-bold text-intelligence">{intelQ.data.health.clearance_minutes} min</span>
                  </div>
                  <ShieldCheck className="h-4 w-4 text-success" />
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-muted-foreground block mb-0.5 uppercase text-[9px]">CONGESTION RISK</span>
                    <span className="text-sm font-bold text-intelligence uppercase">{intelQ.data.risk.level}</span>
                  </div>
                  <AlertCircle className="h-4 w-4 text-intelligence" />
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
