import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Activity, Brain, Radio, ShieldAlert, Stethoscope, TimerReset } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "QueueCure AI+ — Predictive Healthcare Queue Intelligence" },
      { name: "description", content: "Turn token systems into predictive, transparent, real-time clinic operations." },
      { property: "og:title", content: "QueueCure AI+" },
      { property: "og:description", content: "Predictive healthcare queue intelligence." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Activity className="h-5 w-5" />
            </div>
            <span className="font-display text-lg font-bold">QueueCure <span className="text-primary">AI+</span></span>
          </Link>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost"><Link to="/auth">Sign in</Link></Button>
            <Button asChild><Link to="/auth">Launch console</Link></Button>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-60" aria-hidden />
        <div className="absolute inset-x-0 top-0 -z-10 h-[480px] bg-gradient-to-b from-primary/10 via-transparent to-transparent" aria-hidden />
        <div className="mx-auto max-w-7xl px-6 py-20 lg:py-28">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              Realtime clinic operations
            </div>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-6xl">
              Predictive queue intelligence<br/>for modern clinics.
            </h1>
            <p className="mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
              QueueCure replaces token boards with live ETA prediction, emergency-aware ordering, and operational risk forecasting — so patients arrive on time and doctors stay in flow.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg"><Link to="/auth">Open command center</Link></Button>
              <Button asChild size="lg" variant="outline"><Link to="/auth">Demo doctor console</Link></Button>
            </div>
          </motion.div>

          <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Brain, title: "Predictive ETA", body: "EWMA-based per-visit-type wait estimates with confidence tiers." },
              { icon: Radio, title: "Realtime sync", body: "Reception, doctor and patient screens stay in lockstep." },
              { icon: ShieldAlert, title: "Emergency priority", body: "Atomic reordering with patient ETA-change notifications." },
              { icon: TimerReset, title: "Recommended arrival", body: "Tell each patient exactly when to walk in." },
              { icon: Stethoscope, title: "Doctor-owned consults", body: "Server-stamped start / complete drives accurate stats." },
              { icon: Activity, title: "Queue risk forecast", body: "Arrival vs service-rate intelligence, not just a counter." },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 font-display text-base font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        QueueCure AI+ · Built for the Predictive Healthcare track
      </footer>
    </div>
  );
}
