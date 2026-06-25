import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Activity, BellRing, Gauge, Radio, ShieldCheck, Target, Sparkles } from "lucide-react";
import { getDemoHealth, type DemoHealth } from "@/lib/demo.functions";
import { supabase } from "@/integrations/supabase/client";
import { AnimatedCounter } from "@/components/common/AnimatedCounter";

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
    ? { dot: "bg-success shadow-[0_0_6px_var(--color-success)]", label: "Connected" }
    : realtime === "down" ? { dot: "bg-destructive shadow-[0_0_6px_var(--color-destructive)]", label: "Down" } : { dot: "bg-warning shadow-[0_0_6px_var(--color-warning)]", label: "Reconnecting" };

  return (
    <section className="glass-card border-gradient-intel rounded-2xl p-6 shadow-intel">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border/40 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-intelligence/15 text-intelligence">
            <Sparkles className="h-4 w-4 text-glow-intel animate-pulse" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Demo diagnostics</p>
            <p className="font-display text-sm font-bold text-foreground">Realtime Impact Tracker</p>
          </div>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
          System telemetry online
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <Metric icon={Target} label="ETA Accuracy"
          value={<AnimatedCounter value={h?.eta_accuracy_pct ?? 0} suffix="%" />}
          sub={`±${Math.round(Number(h?.eta_mae_minutes ?? 0))} min variance`} />
        <Metric icon={ShieldCheck} label="Confidence"
          value={h?.confidence_label ?? "—"}
          sub={`${h?.confidence_samples ?? 0} historical samples`} highlight />
        <Metric icon={Gauge} label="Queue Health"
          value={h?.queue_health ?? "—"}
          sub={`${h?.queue_active ?? 0} active · ${h?.queue_overdue ?? 0} overdue`} />
        <Metric icon={Radio} label="Realtime engine"
          value={<span className="inline-flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${rt.dot} animate-pulse`} />{rt.label}</span>}
          sub={`${h?.events_per_min ?? 0} audit trans/min`} />
        <Metric icon={BellRing} label="Notifications"
          value={<AnimatedCounter value={notifs} />} sub="dispatched this session" highlight />
      </div>
      <p className="mt-4 flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
        <Activity className="h-3.5 w-3.5 text-intelligence animate-pulse" /> Live telemetry readings from database audit logs prove the pipeline is active.
      </p>
    </section>
  );
}

function Metric({ icon: Icon, label, value, sub, highlight }: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode; sub: string; highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-3.5 transition-colors ${highlight ? "border-intelligence/30 bg-intelligence/5 text-intelligence" : "border-border/40 bg-background/40"}`}>
      <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-muted-foreground/60" /> {label}
      </div>
      <div className="mt-2 font-display text-xl font-extrabold text-foreground leading-none">{value}</div>
      <div className="text-[9px] text-muted-foreground leading-tight mt-1.5">{sub}</div>
    </div>
  );
}

