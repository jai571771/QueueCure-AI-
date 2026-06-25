import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipForward, RotateCcw, CheckCircle2, ChevronRight, Terminal, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ExplainCard, type ExplainSeverity } from "@/components/common/ExplainCard";
import { runScenario, resetDemoData, getDemoFirstWaitingToken } from "@/lib/demo.functions";
import { bumpNotificationCount } from "./SystemImpactWidget";

type Step = {
  id: string;
  title: string;
  what: string; why: string; impact: string; action: string;
  severity: ExplainSeverity;
  run?: () => Promise<void>;
};

const STEP_MS = 9000;

export function JudgeDemoRunner({ onTokenReady }: { onTokenReady?: (token: number) => void }) {
  const scenarioFn = useServerFn(runScenario);
  const resetFn = useServerFn(resetDemoData);
  const tokenFn = useServerFn(getDemoFirstWaitingToken);

  const [idx, setIdx] = useState(-1); // -1 = not started
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Realtime Log console state
  const [logs, setLogs] = useState<string[]>([]);
  const consoleEndRef = useRef<HTMLDivElement | null>(null);

  const steps: Step[] = [
    {
      id: "normal", title: "Normal Queue State",
      what: "Queue operates under optimal parameters.",
      why: "EWMA predictions match the check-in and checkout pace.",
      impact: "Queue health: optimal. Delay notification dispatch rate: 0%.",
      action: "System continues in telemetry tracking mode.",
      severity: "info",
      run: async () => { await scenarioFn({ data: { scenario: "normal" } }); },
    },
    {
      id: "tracking", title: "Patient Tracker Portal",
      what: "Patient scans check-in token and loads live telemetry web app.",
      why: "Decentralized auth-less lookup checks database directly by token ID.",
      impact: "Reduces receptionist query load by up to 40%.",
      action: "Track the loading states in the preview panel to the right.",
      severity: "info",
      run: async () => {
        const tok = await tokenFn({ data: undefined as never });
        if (tok && onTokenReady) onTokenReady(tok as number);
      },
    },
    {
      id: "emergency", title: "Emergency Case Intake",
      what: "Acute emergency patient is registered at intake desk.",
      why: "Triage override automatically adjusts lineup to insert emergency case at position 0.",
      impact: "Downstream patient wait times are pushed out dynamically.",
      action: "Observe the live patient tracking board update in real time.",
      severity: "high",
      run: async () => { await scenarioFn({ data: { scenario: "emergency" } }); },
    },
    {
      id: "eta", title: "Atomic ETA Recalculation",
      what: "ETA calculations are refreshed with the transaction stamp.",
      why: "Audit log captures state transition trigger (emergency priority shift).",
      impact: "Provides 100% explainability. No black-box scheduling decisions.",
      action: "View the ETA timeline below to inspect recalculation delta values.",
      severity: "moderate",
    },
    {
      id: "notify", title: "Patient SMS Notification",
      what: "QueueWise AI dispatches automated delay alert notification.",
      why: "Wait shift exceeds the 5-minute notification trigger threshold.",
      impact: "SMS alerts keep patients informed, reducing waiting room crowd density.",
      action: "Check the notification count increment in the success widget.",
      severity: "moderate",
      run: async () => {
        bumpNotificationCount();
        toast("ETA updated for tracked patient", { description: "Delay notification dispatched" });
      },
    },
    {
      id: "risk", title: "Queue Risk Forecast",
      what: "Congestion forecast escalates from MINIMAL to HIGH.",
      why: "Incoming patient velocity is outpacing clinic checkout speed.",
      impact: "Alerts operational managers prior to severe queue backlog.",
      action: "Verify the Reception console shows the elevated risk status.",
      severity: "high",
    },
    {
      id: "rec", title: "AI Optimization Vector",
      what: "Optimization engines generate a recommended operational decision.",
      why: "Detected pattern: peak load volume + provider capacity shortage.",
      impact: "Decreases receptionist decision delay under load.",
      action: "Inspect recommendations inside the Ops Insights dashboard.",
      severity: "moderate",
    },
    {
      id: "score", title: "Efficiency Index Refresh",
      what: "Clinic overall efficiency score is re-evaluated.",
      why: "Wait durations, prediction accuracy, and doctor metrics are computed.",
      impact: "Provides clear administrative diagnostics and the largest improvement vector.",
      action: "Inspect the Efficiency score gauges inside the Insights dashboard.",
      severity: "info",
    },
  ];

  // Logs trigger effect
  useEffect(() => {
    if (idx < 0) {
      setLogs(["[SYSTEM] Telemetry pipeline ready. Click 'Start Judge Demo' to begin simulation."]);
      return;
    }
    if (idx === -2) {
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString([], { hour12: false })}] [SYSTEM] Simulation complete. Core loop fully tested.`]);
      return;
    }

    const stepLogs: Record<number, string[]> = {
      0: [
        "Initializing QueueWise AI+ engine...",
        "Establishing realtime socket channels...",
        "EWMA predictive database model calibrated. Baseline: 12m consult time."
      ],
      1: [
        "Tracker requested for Patient token #102.",
        "Secure auth-less patient tracking screen rendered successfully.",
        "Recommended Arrival Time buffer dispatched (10m offset)."
      ],
      2: [
        "Intake alert: Acute emergency patient registered in database.",
        "Triage trigger: Atomic re-ranking applied to active queue.",
        "Moving emergency patient to position index 0."
      ],
      3: [
        "Queue state change detected. Running predictions for all downstream tokens...",
        "Patient #102 predicted call shifted: +12m (Reason: emergency case).",
        "Writing state transaction block to audit ledger."
      ],
      4: [
        "Notification threshold evaluated (+12m delay >= 5m alert trigger).",
        "Dispatching automated SMS update to patient token #102...",
        "Transmission status: DELIVERED (routing via Twilio API Gateway)."
      ],
      5: [
        "Analyzing queue load vectors against provider capacity...",
        "Intake velocity (8/hr) exceeds doctor throughput (6/hr).",
        "Elevating Congestion Risk Index to HIGH (clearance window: 75m)."
      ],
      6: [
        "AI scanner identifying operations optimization vectors...",
        "Peak capacity strain matching rules database...",
        "AI RECOMMENDATION GENERATED: Deploy float doctor to Vaccine Room."
      ],
      7: [
        "Computing daily composite efficiency index...",
        "Index computed: 84/100 (Grade: B). Primary lever: room utilization.",
        "Operations diagnostic complete. Slices synced to Admin panel."
      ]
    };

    const currentLogs = stepLogs[idx] || [];
    currentLogs.forEach((log, subIdx) => {
      setTimeout(() => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString([], { hour12: false })}] ${log}`]);
      }, subIdx * 1000);
    });
  }, [idx]);

  // Autoscroll console logs
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  useEffect(() => {
    if (idx < 0 || paused) return;
    const step = steps[idx];
    if (!step) return;
    let cancelled = false;
    (async () => {
      try { await step.run?.(); } catch (e) { toast.error((e as Error).message); }
      if (cancelled) return;
      timer.current = setTimeout(() => {
        setIdx((i) => (i + 1 < steps.length ? i + 1 : -2));
      }, STEP_MS);
    })();
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, paused]);

  function start() { setIdx(0); setPaused(false); }
  function skip() {
    if (timer.current) clearTimeout(timer.current);
    setIdx((i) => (i + 1 < steps.length ? i + 1 : -2));
  }
  async function reset() {
    if (timer.current) clearTimeout(timer.current);
    setIdx(-1); setPaused(false);
    setLogs(["[SYSTEM] Re-initializing database state..."]);
    try {
      await resetFn({ data: undefined as never });
      toast.success("Demo data reset — re-seeding normal queue…");
      await scenarioFn({ data: { scenario: "normal" } });
    } catch (e) { toast.error((e as Error).message); }
  }

  const current = idx >= 0 && idx < steps.length ? steps[idx] : null;
  const done = idx === -2;

  return (
    <section className="glass-card border-gradient-intel rounded-2xl p-6 shadow-intel">
      {/* Header controls deck */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40 mb-6">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-intelligence/25 bg-intelligence/5 px-2.5 py-0.5 text-xs font-semibold text-intelligence">
            <Sparkles className="h-3.5 w-3.5 text-glow-intel animate-pulse" />
            Active Operations Pipeline Simulation
          </span>
          <h2 className="font-display text-xl font-extrabold mt-2 text-foreground">Operations Simulation Engine</h2>
          <p className="text-xs text-muted-foreground mt-0.5">End-to-end telemetry: Predict → Explain → Impact → Optimize</p>
        </div>
        <div className="flex items-center gap-2">
          {idx < 0 && !done && (
            <Button onClick={start} size="lg" className="bg-intelligence text-intelligence-foreground hover:bg-intelligence/90 shadow-lg animate-pulse-subtle border-none font-bold">
              <Play className="mr-2 h-4 w-4 fill-current" /> Start Judge Demo
            </Button>
          )}
          {idx >= 0 && (
            <>
              <Button variant="outline" size="sm" onClick={() => setPaused((p) => !p)} className="h-9 border-border/60">
                {paused ? <Play className="mr-1.5 h-4 w-4" /> : <Pause className="mr-1.5 h-4 w-4" />}
                {paused ? "Resume" : "Pause"}
              </Button>
              <Button variant="outline" size="sm" onClick={skip} className="h-9 border-border/60">
                <SkipForward className="mr-1.5 h-4 w-4" /> Next Step
              </Button>
            </>
          )}
          <Button variant="ghost" size="sm" onClick={reset} className="h-9 hover:bg-muted font-semibold">
            <RotateCcw className="mr-1.5 h-4 w-4" /> Reset
          </Button>
        </div>
      </div>

      {/* Main split dashboard view */}
      <div className="grid gap-6 md:grid-cols-[1fr_1.2fr]">

        {/* Left Column: Timeline progression */}
        <div className="space-y-2 border-r border-border/40 pr-0 md:pr-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3 font-mono">Simulation Steps</p>
          <div className="relative space-y-1">
            {steps.map((s, i) => {
              const active = i === idx;
              const completed = done || i < idx;
              return (
                <div
                  key={s.id}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all duration-300 ${
                    active ? "border-intelligence/30 bg-intelligence/5 text-intelligence shadow-intel" :
                    completed ? "border-success/20 bg-success/5 text-success/80" :
                    "border-transparent bg-transparent text-muted-foreground/60"
                  }`}
                >
                  <span className={`grid h-5.5 w-5.5 place-items-center rounded-full text-[10px] font-bold font-mono ${
                    active ? "bg-intelligence text-intelligence-foreground animate-pulse" :
                    completed ? "bg-success/20 text-success" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {i + 1}
                  </span>
                  <span className="text-xs font-bold font-display tracking-tight">{s.title}</span>
                  {active && <ChevronRight className="ml-auto h-4 w-4 text-intelligence animate-pulse-subtle" />}
                  {completed && <CheckCircle2 className="ml-auto h-4 w-4 text-success" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active step details + Live console logs */}
        <div className="flex flex-col justify-between gap-6">
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Telemetry Output</p>
            <AnimatePresence mode="wait">
              {current ? (
                <motion.div
                  key={current.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                >
                  <ExplainCard
                    eyebrow={`Step ${idx + 1}: ${current.title}`}
                    title={current.what}
                    what={current.what}
                    why={current.why}
                    impact={current.impact}
                    action={current.action}
                    severity={current.severity}
                  />
                </motion.div>
              ) : done ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-2xl border border-success/40 bg-success/5 p-4 flex flex-col items-center text-center justify-center h-full"
                >
                  <CheckCircle2 className="h-10 w-10 text-success mb-2" />
                  <p className="font-display font-bold text-success text-base">Simulation Complete</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
                    You've successfully traced the full healthcare optimization loop. Click 'Reset' to restart the walkthrough.
                  </p>
                </motion.div>
              ) : (
                <div className="rounded-2xl border border-border/40 bg-background/30 p-6 text-center text-xs text-muted-foreground h-full flex flex-col items-center justify-center">
                  <Play className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  Click "Start Judge Demo" to begin the operations simulation.
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Console Log Output Panel */}
          <div className="rounded-xl border border-black/80 bg-black/95 p-4 font-mono text-[10px] text-green-400 flex flex-col h-40 shadow-inner">
            <div className="flex items-center gap-1.5 border-b border-white/10 pb-2 mb-2 shrink-0">
              <Terminal className="h-3.5 w-3.5 text-green-500" />
              <span className="text-[9px] font-bold uppercase tracking-wider text-green-500">Live Engine Diagnostics Console</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-white/10">
              {logs.map((log, lIdx) => (
                <div key={lIdx} className="leading-normal">
                  <span className="text-green-600 font-bold select-none">&gt;&gt; </span>
                  {log}
                </div>
              ))}
              <div ref={consoleEndRef} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
