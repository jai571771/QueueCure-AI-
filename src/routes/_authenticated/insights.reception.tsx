import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { Cpu } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  getEfficiencyScore, getRecommendations, getBottlenecks, getPredictionAccuracy,
} from "@/lib/intel.functions";

import { AppHeader } from "@/components/queue/AppHeader";
import { EfficiencyScoreGauge } from "@/components/intel/EfficiencyScoreGauge";
import { RecommendationsFeed } from "@/components/intel/RecommendationsFeed";
import { BottleneckPanel } from "@/components/intel/BottleneckPanel";
import { PredictionAccuracyCard } from "@/components/intel/PredictionAccuracyCard";
import { ForecastChart } from "@/components/intel/ForecastChart";

export const Route = createFileRoute("/_authenticated/insights/reception")({
  head: () => ({ meta: [{ title: "Reception Insights · QueueCure AI+" }] }),
  component: ReceptionInsightsPage,
});

function ReceptionInsightsPage() {
  const effFn = useServerFn(getEfficiencyScore);
  const recFn = useServerFn(getRecommendations);
  const botFn = useServerFn(getBottlenecks);
  const accFn = useServerFn(getPredictionAccuracy);

  const effQ = useQuery({ queryKey: ["intel", "efficiency"], queryFn: () => effFn({ data: undefined as never }), refetchInterval: 30_000 });
  const recQ = useQuery({ queryKey: ["intel", "recommendations"], queryFn: () => recFn({ data: undefined as never }), refetchInterval: 20_000 });
  const botQ = useQuery({ queryKey: ["intel", "bottlenecks"], queryFn: () => botFn({ data: undefined as never }), refetchInterval: 30_000 });
  const accQ = useQuery({ queryKey: ["intel", "accuracy"], queryFn: () => accFn({ data: { days: 7 } }), refetchInterval: 60_000 });

  // realtime: refresh on audit changes
  useEffect(() => {
    const ch = supabase.channel("insights-reception")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "queue_audit_log" }, () => {
        effQ.refetch(); recQ.refetch(); botQ.refetch();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [effQ, recQ, botQ]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader role="Reception · Insights" />
      
      <main className="mx-auto max-w-[1600px] space-y-6 px-6 py-6">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-1">
            <Cpu className="h-3.5 w-3.5 text-intelligence animate-pulse" />
            Predictive Operations Center
          </span>
          <h1 className="font-display text-page-title text-foreground tracking-tight mt-1">Operations Intelligence</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Live efficiency indices, timeline simulations, bottlenecks, and optimization recommendations.</p>
        </div>

        {/* Top: Efficiency Score Hero */}
        <section>
          <EfficiencyScoreGauge data={effQ.data} />
        </section>

        {/* Middle: Forecast Intelligence, Bottleneck Detection & Prediction Accuracy */}
        <section className="grid gap-6 grid-cols-1 xl:grid-cols-3">
          <ForecastChart />
          <BottleneckPanel items={botQ.data} />
          <PredictionAccuracyCard data={accQ.data} />
        </section>

        {/* Bottom: Recommendations Feed */}
        <section>
          <RecommendationsFeed items={recQ.data} />
        </section>
      </main>
    </div>
  );
}
