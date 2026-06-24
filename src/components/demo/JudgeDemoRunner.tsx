import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipForward, RotateCcw, CheckCircle2 } from "lucide-react";
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

  const steps: Step[] = [
    {
      id: "normal", title: "1 · Normal queue",
      what: "Queue is operating at a healthy pace",
      why: "Predictions calibrated from real history · arrival ≤ service rate",
      impact: "Patients see stable ETAs and short waits",
      action: "Watch the System Impact widget — ETA accuracy and confidence are live",
      severity: "info",
      run: async () => { await scenarioFn({ data: { scenario: "normal" } }); },
    },
    {
      id: "tracking", title: "2 · Patient tracking",
      what: "Patient opens /track via QR — no login required",
      why: "Public tracking exposes only the minimum: token, ETA, recommended arrival",
      impact: "Reduces front-desk calls and waiting-room crowding",
      action: "Scroll the preview on the right — every section explains itself",
      severity: "info",
      run: async () => {
        const tok = await tokenFn({ data: undefined as never });
        if (tok && onTokenReady) onTokenReady(tok as number);
      },
    },
    {
      id: "emergency", title: "3 · Emergency patient inserted",
      what: "An emergency case enters the queue",
      why: "Triage rules push emergency to front; trigger recomputes ETAs",
      impact: "All downstream patients see ETAs shift in real time",
      action: "Watch the patient's tracking page — a toast and timeline entry will appear",
      severity: "high",
      run: async () => { await scenarioFn({ data: { scenario: "emergency" } }); },
    },
    {
      id: "eta", title: "4 · ETA recalculated",
      what: "ETA timeline records the change with reason",
      why: "Audit log captures before → after with the trigger reason",
      impact: "Every change is explainable — no black box",
      action: "Open the ETA Timeline card on /track — see What / Why / Impact / Next",
      severity: "moderate",
    },
    {
      id: "notify", title: "5 · Patient notified",
      what: "Patient receives a delay notification",
      why: "Delta ≥ 5 min crosses the notification threshold",
      impact: "Patient stays informed without calling the clinic",
      action: "Notifications Sent counter increments in the System Impact widget",
      severity: "moderate",
      run: async () => {
        bumpNotificationCount();
        toast("ETA updated for tracked patient", { description: "Delay notification dispatched" });
      },
    },
    {
      id: "risk", title: "6 · Queue risk updated",
      what: "Risk level rises from low to moderate/high",
      why: "Arrival rate now exceeds service capacity",
      impact: "Operations team sees the risk before it becomes a backlog",
      action: "Reception dashboard's Queue Risk widget reflects the new level",
      severity: "high",
    },
    {
      id: "rec", title: "7 · Recommendation generated",
      what: "Rule engine surfaces a concrete operational action",
      why: "Pattern detection: peak hour + capacity gap",
      impact: "Reduces decision latency for the receptionist on shift",
      action: "Open Ops Insights → Recommendations — every item has rationale + metric",
      severity: "moderate",
    },
    {
      id: "score", title: "8 · Efficiency score updated",
      what: "Composite score recalculates with the biggest lever",
      why: "Wait, accuracy, clearance and utilisation are scored and weighted",
      impact: "One number for leadership — plus the exact lever to lift it",
      action: "Open Ops Insights — see grade, biggest lever, and estimated lift",
      severity: "info",
    },
  ];

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
    try {
      await resetFn({ data: undefined as never });
      toast.success("Demo data reset — re-seeding normal queue…");
      await scenarioFn({ data: { scenario: "normal" } });
    } catch (e) { toast.error((e as Error).message); }
  }

  const current = idx >= 0 && idx < steps.length ? steps[idx] : null;
  const done = idx === -2;

  return (
    <section className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 to-background p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">Judge Demo Mode</p>
          <p className="font-display text-xl font-bold">QueueCure AI+ in 75 seconds</p>
          <p className="text-xs text-muted-foreground">Predict · Explain · Impact · Recommend · Optimize</p>
        </div>
        <div className="flex items-center gap-2">
          {idx < 0 && !done && (
            <Button onClick={start} size="lg">
              <Play className="mr-2 h-4 w-4" /> Start Judge Demo
            </Button>
          )}
          {idx >= 0 && (
            <>
              <Button variant="outline" size="sm" onClick={() => setPaused((p) => !p)}>
                {paused ? <Play className="mr-1.5 h-4 w-4" /> : <Pause className="mr-1.5 h-4 w-4" />}
                {paused ? "Resume" : "Pause"}
              </Button>
              <Button variant="outline" size="sm" onClick={skip}><SkipForward className="mr-1.5 h-4 w-4" />Next</Button>
            </>
          )}
          <Button variant="ghost" size="sm" onClick={reset}><RotateCcw className="mr-1.5 h-4 w-4" />Reset</Button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-8 gap-1.5">
        {steps.map((s, i) => (
          <div key={s.id} className={`h-1.5 rounded-full ${i < idx || done ? "bg-primary" : i === idx ? "bg-primary/60 animate-pulse" : "bg-muted"}`} />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {current ? (
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="mt-4"
          >
            <ExplainCard
              eyebrow={current.title}
              title={current.what}
              what={current.what}
              why={current.why}
              impact={current.impact}
              action={current.action}
              severity={current.severity}
            />
          </motion.div>
        ) : null}
        {done ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 rounded-2xl border border-success/40 bg-success/5 p-4">
            <p className="flex items-center gap-2 font-display font-bold text-success">
              <CheckCircle2 className="h-5 w-5" /> Demo complete
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              You saw Predict → Explain → Impact → Recommend → Optimize end to end. Reset to run it again.
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
