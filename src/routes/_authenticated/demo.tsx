import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppHeader } from "@/components/queue/AppHeader";
import { SystemImpactWidget } from "@/components/demo/SystemImpactWidget";
import { JudgeDemoRunner } from "@/components/demo/JudgeDemoRunner";
import { ScenarioGrid } from "@/components/demo/ScenarioGrid";
import { Sparkles, Activity } from "lucide-react";

export const Route = createFileRoute("/_authenticated/demo")({
  head: () => ({ meta: [{ title: "Judge Demo · QueueCure AI+" }] }),
  component: DemoPage,
  errorComponent: ({ error }) => <div className="p-6 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-6 text-sm">Not found.</div>,
});

function DemoPage() {
  const [token, setToken] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background text-foreground select-none">
      <AppHeader role="demo" />
      
      <main className="mx-auto max-w-[1600px] px-6 py-6 space-y-6">
        
        {/* Cinematic Header Block */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-intelligence animate-pulse" />
              Evaluation Sandbox
            </span>
            <h1 className="font-display text-page-title text-foreground tracking-tight mt-1">Demo Operations Center</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Walk through the live Predict → Explain → Impact → Recommend → Optimize loop in real time.
            </p>
          </div>
        </div>

        {/* Cinematic Keynote Hero Card */}
        <section className="glass-card border-gradient-intel rounded-3xl p-8 shadow-intel relative overflow-hidden bg-intelligence/5 text-center">
          <div className="absolute inset-0 bg-grid opacity-[0.02]" aria-hidden />
          <div className="max-w-3xl mx-auto space-y-4">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-intelligence/30 bg-intelligence/15 px-3.5 py-1 text-xs font-bold text-intelligence animate-pulse-subtle">
              <Sparkles className="h-3.5 w-3.5 text-glow-intel" />
              Interactive Product Keynote
            </span>
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              QueueCure AI+ in 75 Seconds
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xl mx-auto">
              Follow how the operations engine charts patient check-ins, overlays emergency cases, recalibrates ETA forecasts, dispatches automatic patient SMS notifications, and updates compose efficiency indices.
            </p>
            
            {/* Stepped horizontal progress line */}
            <div className="grid grid-cols-5 gap-3 pt-6 border-t border-border/40 text-xs">
              {[
                { title: "Predict", desc: "Drift analysis" },
                { title: "Explain", desc: "Transparency log" },
                { title: "Impact", desc: "Downstream shift" },
                { title: "Recommend", desc: "Resource level" },
                { title: "Optimize", desc: "Flow restored" },
              ].map((n, i) => (
                <div key={n.title} className="flex flex-col items-center space-y-1.5">
                  <div className="h-8 w-8 rounded-full bg-intelligence text-intelligence-foreground flex items-center justify-center font-bold text-xs font-mono shadow-intel">
                    0{i+1}
                  </div>
                  <span className="font-display font-extrabold text-foreground">{n.title}</span>
                  <span className="text-[10px] text-muted-foreground hidden sm:block">{n.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Success Telemetry Dashboard Strip */}
        <div>
          <SystemImpactWidget />
        </div>

        {/* Split Grid Section */}
        <div className="grid gap-6 lg:grid-cols-[1.8fr_1.2fr]">

          {/* Left panel: Control runner & scenarios */}
          <div className="space-y-6">
            <JudgeDemoRunner onTokenReady={setToken} />
            <ScenarioGrid />
          </div>

          {/* Right panel: Embedded live patient tracking view */}
          <aside className="glass-card border border-border/40 rounded-3xl p-5 shadow-premium flex flex-col h-[780px]">
            <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Live Patient Telemetry View</span>
              </div>
              <span className="text-xs text-muted-foreground font-mono font-bold">
                {token ? `Token #${token}` : "Awaiting selection..."}
              </span>
            </div>

            <div className="flex-1 rounded-2xl overflow-hidden border border-border/40 bg-background/20 relative shadow-inner">
              {token ? (
                <iframe
                  title="Patient tracking preview"
                  src={`/track/${token}`}
                  className="h-full w-full bg-transparent"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-xs text-muted-foreground">
                  <Activity className="h-10 w-10 text-muted-foreground/30 animate-pulse mb-3" />
                  <p className="font-semibold text-foreground">Simulation Pending</p>
                  <p className="mt-1 leading-relaxed max-w-[200px]">
                    Run the demo sequence to automatically mount the first waiting patient tracker here.
                  </p>
                </div>
              )}
            </div>
          </aside>

        </div>
      </main>
    </div>
  );
}

