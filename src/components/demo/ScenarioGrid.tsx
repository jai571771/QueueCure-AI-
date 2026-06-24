import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Zap, Activity, Stethoscope, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { runScenario, type DemoScenario } from "@/lib/demo.functions";

const CARDS: { id: DemoScenario; title: string; sub: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "normal", title: "Normal queue", sub: "Top up to a healthy queue + back-fill history", icon: Activity },
  { id: "emergency", title: "Emergency inserted", sub: "Push an emergency case to the front", icon: Zap },
  { id: "doctor_delay", title: "Doctor running late", sub: "Inject slow consultations to drift ETAs", icon: Stethoscope },
  { id: "rush_hour", title: "Rush hour", sub: "Add 5 walk-ins back-to-back", icon: Users },
];

export function ScenarioGrid() {
  const fn = useServerFn(runScenario);
  const [busy, setBusy] = useState<DemoScenario | null>(null);
  async function run(s: DemoScenario) {
    setBusy(s);
    try {
      await fn({ data: { scenario: s } });
      toast.success(`Ran scenario: ${s.replace("_"," ")}`);
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  }
  return (
    <section>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Manual scenarios</p>
      <p className="font-display text-base font-bold">Trigger any moment on demand</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((c) => (
          <div key={c.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <c.icon className="h-5 w-5 text-primary" />
            <p className="mt-2 font-display font-bold">{c.title}</p>
            <p className="text-xs text-muted-foreground">{c.sub}</p>
            <Button size="sm" className="mt-3 w-full" disabled={busy === c.id} onClick={() => run(c.id)}>
              {busy === c.id ? "Running…" : "Run"}
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
