import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { getDoctorProductivity, getPredictionAccuracy, getBottlenecks } from "@/lib/intel.functions";
import { AppHeader } from "@/components/queue/AppHeader";
import { DoctorProductivityCard } from "@/components/intel/DoctorProductivityCard";
import { PredictionAccuracyCard } from "@/components/intel/PredictionAccuracyCard";
import { BottleneckPanel } from "@/components/intel/BottleneckPanel";

export const Route = createFileRoute("/_authenticated/insights/doctor")({
  head: () => ({ meta: [{ title: "Doctor Insights · QueueCure AI+" }] }),
  component: DoctorInsightsPage,
});

function DoctorInsightsPage() {
  const prodFn = useServerFn(getDoctorProductivity);
  const accFn = useServerFn(getPredictionAccuracy);
  const botFn = useServerFn(getBottlenecks);

  const prodQ = useQuery({ queryKey: ["intel", "doctor-productivity"], queryFn: () => prodFn({ data: { days: 1 } }), refetchInterval: 30_000 });
  const accQ = useQuery({ queryKey: ["intel", "accuracy"], queryFn: () => accFn({ data: { days: 7 } }), refetchInterval: 60_000 });
  const botQ = useQuery({ queryKey: ["intel", "bottlenecks"], queryFn: () => botFn({ data: undefined as never }), refetchInterval: 30_000 });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader role="Doctor · Insights" />
      <main className="mx-auto max-w-[1600px] space-y-5 px-6 py-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Doctor Insights</h1>
          <p className="text-sm text-muted-foreground">Your productivity, prediction accuracy, and clinic bottlenecks affecting flow.</p>
        </div>

        <DoctorProductivityCard data={prodQ.data} />

        <section className="grid gap-4 xl:grid-cols-2">
          <PredictionAccuracyCard data={accQ.data} />
          <BottleneckPanel items={botQ.data} />
        </section>
      </main>
    </div>
  );
}
