import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Activity, ArrowRight, Bell, Clock, MapPin } from "lucide-react";

import { getPublicTracking } from "@/lib/tracking.functions";
import { supabase } from "@/integrations/supabase/client";
import { ConfidenceChip } from "@/components/queue/ConfidenceChip";
import { ArrivalIntelCard } from "@/components/intel/ArrivalIntelCard";
import { EtaTimelineCard } from "@/components/track/EtaTimelineCard";
import { bumpNotificationCount } from "@/components/demo/SystemImpactWidget";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/track/$token")({
  head: ({ params }) => ({
    meta: [
      { title: `Token #${params.token} · QueueCure AI+` },
      { name: "description", content: "Track your live position, ETA, and recommended arrival." },
      { property: "og:title", content: `Live tracking · Token #${params.token}` },
      { property: "og:description", content: "Realtime ETA, predicted call time and recommended arrival." },
    ],
  }),
  component: TrackPage,
});

const VT_LABEL: Record<string, string> = {
  general: "General consult", follow_up: "Follow-up", prescription: "Prescription refill",
  lab_review: "Lab review", vaccination: "Vaccination", emergency: "Emergency",
};
const REASON_LABEL: Record<string, string> = {
  emergency: "Emergency case inserted",
  faster_consultations: "Consultations running faster",
  slower_consultations: "Consultations running slower",
  normal_progress: "Queue progressed",
};

type Tracking = {
  clinic_name: string;
  clinic_slug: string;
  token_number: number;
  status: string;
  visit_type: string;
  priority: string;
  patients_ahead: number;
  eta_minutes: number;
  predicted_call_at: string;
  recommended_arrival_at: string;
  confidence_tier: "high"|"medium"|"low";
  sample_count: number;
  last_change: { eta_before: number|null; eta_after: number; reason: string; at: string } | null;
  health: { status: "healthy"|"moderate"|"critical"; clearance_minutes: number; recommended_action: string };
  risk: { level: "low"|"moderate"|"high"; reason: string; expected_clearance_at: string };
  arrival_intel: {
    crowd_level: "low"|"moderate"|"high";
    crowd_label: string;
    waiting_now: number;
    minutes_until_recommended_arrival: number;
    expected_queue_length_at_arrival: number;
    confidence_basis_samples: number;
  };
  patient_id: string;
};

function fmtClock(iso: string) {
  try { return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); }
  catch { return "—"; }
}

function TrackPage() {
  const { token } = Route.useParams();
  const fetcher = useServerFn(getPublicTracking);
  const seenChange = useRef<string | null>(null);

  const q = useQuery<Tracking | null>({
    queryKey: ["track", token],
    queryFn: async () => (await fetcher({ data: { token: Number(token) } })) as Tracking | null,
    refetchInterval: 8_000,
  });

  // Realtime: invalidate when queue changes for our clinic
  const [, setTick] = useState(0);
  useEffect(() => {
    const ch = supabase
      .channel("public-track")
      .on("postgres_changes",
        { event: "*", schema: "public", table: "queue_patients" },
        () => { setTick((n) => n + 1); q.refetch(); })
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "queue_audit_log" },
        () => { q.refetch(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [q]);

  // ETA-change toast
  useEffect(() => {
    const lc = q.data?.last_change;
    if (!lc || !lc.at) return;
    if (seenChange.current === lc.at) return;
    seenChange.current = lc.at;
    if (lc.eta_before === null) return;
    if (Math.abs((lc.eta_after ?? 0) - (lc.eta_before ?? 0)) < 2) return;
    toast(`ETA updated`, {
      description: `Was ${lc.eta_before}m → now ${lc.eta_after}m · ${REASON_LABEL[lc.reason] ?? "Queue updated"}`,
      icon: <Bell className="h-4 w-4" />,
    });
    bumpNotificationCount();
  }, [q.data?.last_change]);

  const t = q.data;

  if (q.isLoading) {
    return <PageShell><p className="text-center text-sm text-muted-foreground">Loading your live status…</p></PageShell>;
  }
  if (!t) {
    return (
      <PageShell>
        <div className="text-center">
          <p className="font-display text-2xl font-bold">Token not found</p>
          <p className="mt-1 text-sm text-muted-foreground">Double-check your token number or ask the front desk.</p>
          <Button asChild variant="outline" className="mt-4"><Link to="/">Home</Link></Button>
        </div>
      </PageShell>
    );
  }

  const healthMap = {
    healthy: { dot: "bg-success", text: "text-success", ring: "ring-success/30", label: "Healthy" },
    moderate: { dot: "bg-warning", text: "text-warning", ring: "ring-warning/30", label: "Moderate" },
    critical: { dot: "bg-destructive", text: "text-destructive", ring: "ring-destructive/30", label: "Critical" },
  } as const;
  const h = healthMap[t.health.status];

  return (
    <PageShell>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{t.clinic_name}</p>
          <p className="font-display text-sm text-muted-foreground">{VT_LABEL[t.visit_type] ?? t.visit_type}</p>
        </div>
        <ConfidenceChip tier={t.confidence_tier} sampleCount={t.sample_count} />
      </div>

      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        className="mt-4 overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary/80 p-6 text-primary-foreground shadow-xl">
        <p className="text-xs uppercase tracking-widest text-primary-foreground/80">Your token</p>
        <p className="font-display text-7xl font-extrabold leading-none">#{t.token_number}</p>
        <div className="mt-4 flex items-center justify-between text-sm">
          <div>
            <p className="text-primary-foreground/80">Patients ahead</p>
            <p className="font-display text-3xl font-bold">{t.patients_ahead}</p>
          </div>
          <div className="text-right">
            <p className="text-primary-foreground/80">Estimated wait</p>
            <p className="font-display text-3xl font-bold">{t.eta_minutes}m</p>
          </div>
        </div>
      </motion.div>

      <div className="mt-4 grid gap-3">
        <Card icon={Clock} title="Predicted call time" value={fmtClock(t.predicted_call_at)} sub="Based on live queue pace" />
        <Card icon={MapPin} title="Recommended arrival" value={fmtClock(t.recommended_arrival_at)}
          sub="10-minute buffer before your turn" highlight />
      </div>

      <div className="mt-4">
        {t.arrival_intel ? <ArrivalIntelCard intel={t.arrival_intel} sampleCount={t.sample_count} /> : null}
      </div>

      <div className="mt-4">
        <EtaTimelineCard token={t.token_number} />
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Clinic Live Status</p>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${h.ring} ${h.text}`}>
            <span className={`h-2 w-2 rounded-full ${h.dot}`} /> {h.label}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Queue clearance</p>
            <p className="font-display text-lg font-bold">{t.health.clearance_minutes}m</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Risk</p>
            <p className="font-display text-lg font-bold capitalize">{t.risk.level}</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{t.risk.reason}</p>
      </div>

      <AnimatePresence>
        {t.last_change && t.last_change.eta_before !== null && Math.abs((t.last_change.eta_after ?? 0) - (t.last_change.eta_before ?? 0)) >= 2 ? (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mt-4 flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm text-foreground">
            <Bell className="mt-0.5 h-4 w-4 text-warning" />
            <div>
              <p className="font-semibold">ETA updated</p>
              <p className="text-muted-foreground">
                Was <span className="font-medium text-foreground">{t.last_change.eta_before}m</span>{" "}
                <ArrowRight className="inline h-3 w-3" />{" "}
                now <span className="font-medium text-foreground">{t.last_change.eta_after}m</span>
                {" · "}{REASON_LABEL[t.last_change.reason] ?? "Queue updated"}.
              </p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <p className="mt-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
        <Activity className="h-3 w-3" /> Updates live · stay close around your recommended arrival time.
      </p>
    </PageShell>
  );
}

function Card({ icon: Icon, title, value, sub, highlight }: { icon: React.ComponentType<{ className?: string }>; title: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${highlight ? "border-secondary/40 bg-secondary/10" : "border-border bg-card"}`}>
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className="h-4 w-4" /> {title}
      </div>
      <p className="mt-2 font-display text-3xl font-bold">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-md flex-col px-5 py-6">
        <Link to="/" className="mb-4 flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Activity className="h-4 w-4" />
          </div>
          <span className="font-display text-base font-bold">QueueCure <span className="text-primary">AI+</span></span>
        </Link>
        {children}
      </div>
    </div>
  );
}
