import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Activity, BellRing, Gauge, Radio, ShieldCheck, Target } from "lucide-react";
import { getDemoHealth, type DemoHealth } from "@/lib/demo.functions";
import { supabase } from "@/integrations/supabase/client";

let notifCount = 0;
export function bumpNotificationCount() {
  notifCount += 1;
  window.dispatchEvent(new CustomEvent("qc:notif-bump"));
}

export function SystemImpactWidget() {
  const fetcher = useServerFn(getDemoHealth);
  const q = useQuery<DemoHealth>({
    queryKey: ["demo-health"],
    queryFn: () => fetcher({ data: undefined as never }),
    refetchInterval: 6_000,
  });
  const h = q.data;
  const [notifs, setNotifs] = useState(notifCount);
  const [realtime, setRealtime] = useState<"connecting"|"connected"|"down">("connecting");

  useEffect(() => {
    const handler = () => setNotifs(notifCount);
    window.addEventListener("qc:notif-bump", handler);
    return () => window.removeEventListener("qc:notif-bump", handler);
  }, []);

  useEffect(() => {
    const ch = supabase.channel("demo-impact-probe")
      .on("postgres_changes", { event: "*", schema: "public", table: "queue_audit_log" }, () => {})
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setRealtime("connected");
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setRealtime("down");
      });
    return () => { supabase.removeChannel(ch); };
  }, []);

  const rt = realtime === "connected"
    ? { dot: "bg-success", label: "Connected" }
    : realtime === "down" ? { dot: "bg-destructive", label: "Down" } : { dot: "bg-warning", label: "Connecting" };

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Demo Success Metrics</p>
          <p className="font-display text-base font-bold">System Impact</p>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Predict · Explain · Impact · Recommend · Optimize</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Metric icon={Target} label="ETA Accuracy"
          value={`${h?.eta_accuracy_pct ?? 0}%`}
          sub={`±${Math.round(Number(h?.eta_mae_minutes ?? 0))} min · last 24h`} />
        <Metric icon={ShieldCheck} label="Prediction Confidence"
          value={h?.confidence_label ?? "—"}
          sub={`${h?.confidence_samples ?? 0} samples`} />
        <Metric icon={Gauge} label="Queue Health"
          value={h?.queue_health ?? "—"}
          sub={`${h?.queue_active ?? 0} active · ${h?.queue_overdue ?? 0} overdue`} />
        <Metric icon={Radio} label="Realtime"
          value={<span className="inline-flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${rt.dot}`} />{rt.label}</span>}
          sub={`${h?.events_per_min ?? 0} events/min`} />
        <Metric icon={BellRing} label="Notifications Sent"
          value={String(notifs)} sub="This demo session" />
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Activity className="h-3 w-3" /> Live readings from the running system — proof the platform is functioning.
      </p>
    </section>
  );
}

function Metric({ icon: Icon, label, value, sub }: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode; sub: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/60 p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-1 font-display text-lg font-bold">{value}</div>
      <div className="text-[10px] text-muted-foreground">{sub}</div>
    </div>
  );
}
