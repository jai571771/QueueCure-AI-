import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Activity } from "lucide-react";
import { ExplainCard } from "@/components/common/ExplainCard";
import { getEtaHistory } from "@/lib/tracking.functions";

type Entry = {
  at: string;
  eta_before: number;
  eta_after: number;
  delta: number;
  reason: string;
  what: string; why: string; impact: string; action: string;
  severity: "mild" | "moderate" | "high";
};

function clock(iso: string) {
  try { return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); }
  catch { return ""; }
}

export function EtaTimelineCard({ token }: { token: number }) {
  const fetcher = useServerFn(getEtaHistory);
  const q = useQuery({
    queryKey: ["eta-history", token],
    queryFn: async () => (await fetcher({ data: { token } })) as Entry[] | null,
    refetchInterval: 10_000,
  });

  const entries = q.data ?? [];

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Explain</p>
          <p className="font-display text-base font-bold">ETA timeline</p>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
          <Activity className="h-3 w-3" /> live
        </span>
      </div>

      {entries.length === 0 ? (
        <p className="mt-3 rounded-xl bg-muted/40 p-3 text-sm text-muted-foreground">
          ETA stable — predictions are holding within ±2 min. We'll show every change here as it happens.
        </p>
      ) : (
        <ol className="mt-3 space-y-3">
          {entries.map((e) => (
            <li key={e.at} className="relative pl-5">
              <span className={`absolute left-0 top-2 h-2 w-2 rounded-full ${
                e.severity === "high" ? "bg-destructive" :
                e.severity === "moderate" ? "bg-warning" : "bg-primary"
              }`} />
              <div className="flex items-baseline gap-2 text-[11px] text-muted-foreground">
                <span>{clock(e.at)}</span>
                <span className="font-medium text-foreground">{e.eta_before}m</span>
                <ArrowRight className="h-3 w-3" />
                <span className="font-medium text-foreground">{e.eta_after}m</span>
              </div>
              <div className="mt-1.5">
                <ExplainCard
                  what={e.what} why={e.why} impact={e.impact} action={e.action}
                  severity={e.severity}
                  compact
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
