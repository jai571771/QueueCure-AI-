import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppHeader } from "@/components/queue/AppHeader";
import { SystemImpactWidget } from "@/components/demo/SystemImpactWidget";
import { JudgeDemoRunner } from "@/components/demo/JudgeDemoRunner";
import { ScenarioGrid } from "@/components/demo/ScenarioGrid";

export const Route = createFileRoute("/_authenticated/demo")({
  head: () => ({ meta: [{ title: "Judge Demo · QueueCure AI+" }] }),
  component: DemoPage,
  errorComponent: ({ error }) => <div className="p-6 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-6 text-sm">Not found.</div>,
});

function DemoPage() {
  const [token, setToken] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader role="demo" />
      <main className="mx-auto max-w-[1600px] px-6 py-6">
        <div className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">Predictive Healthcare Operations Platform</p>
          <h1 className="font-display text-3xl font-extrabold">Demo Control Center</h1>
          <p className="text-sm text-muted-foreground">Press <strong>Start Judge Demo</strong> to walk through the full Predict → Explain → Impact → Recommend → Optimize story in ~75 seconds.</p>
        </div>

        <div className="mb-5">
          <SystemImpactWidget />
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-5">
            <JudgeDemoRunner onTokenReady={setToken} />
            <ScenarioGrid />
          </div>
          <aside className="rounded-2xl border border-border bg-card p-3 shadow-sm">
            <div className="flex items-center justify-between px-1 pb-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Live patient view</p>
              <span className="text-xs text-muted-foreground">{token ? `Token #${token}` : "Waiting…"}</span>
            </div>
            {token ? (
              <iframe
                title="Patient tracking preview"
                src={`/track/${token}`}
                className="h-[720px] w-full rounded-xl border border-border bg-background"
              />
            ) : (
              <div className="grid h-[720px] place-items-center text-xs text-muted-foreground">
                Run the demo to pick the first waiting token automatically.
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
