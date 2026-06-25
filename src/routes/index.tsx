import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Activity, Brain, Radio, ShieldAlert, Stethoscope, TimerReset, Sparkles, ChevronRight, Users } from "lucide-react";
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
    <div className="min-h-screen bg-background relative overflow-hidden select-none">
      {/* Decorative Grid and Glow Backgrounds */}
      <div className="absolute inset-0 bg-grid opacity-40 pointer-events-none" aria-hidden />
      <div className="absolute top-[-20%] left-[-10%] h-[600px] w-[600px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[600px] w-[600px] rounded-full bg-intelligence/10 blur-[120px] pointer-events-none" />

      <header className="border-b border-border/40 relative z-20 bg-background/50 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground transition-transform group-hover:scale-105 shadow-premium">
              <Activity className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-lg font-bold tracking-tight text-foreground">
                QueueCure <span className="text-primary font-extrabold">AI+</span>
              </span>
              <span className="text-[9px] uppercase tracking-widest font-mono text-muted-foreground">
                Healthcare Operations Platform
              </span>
            </div>
          </Link>
          <nav className="flex items-center gap-3">
            <Button asChild variant="ghost" className="text-sm font-semibold">
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md">
              <Link to="/auth" search={{ next: "/reception" }}>
                Launch Platform
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-6 py-12 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] items-center">
          {/* Left Column: Copy & CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col space-y-8"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-intelligence/20 bg-intelligence/5 px-3 py-1 text-xs font-bold text-intelligence backdrop-blur-md animate-pulse-subtle">
              <Sparkles className="h-3.5 w-3.5 text-glow-intel" />
              <span>Predictive Queue Intelligence — Now Live</span>
            </div>

            <div className="space-y-4">
              <h1 className="font-display text-hero text-foreground tracking-tight">
                Predict clinic delays <span className="text-primary">before</span> they happen.
              </h1>
              <p className="max-w-xl text-base text-muted-foreground leading-relaxed">
                QueueCure AI+ transforms standard token systems into an active operations intelligence network. We predict waiting time drift, explain queue impact, notify patients automatically, and recommend clear staffing adjustments in real-time.
              </p>
            </div>

            {/* Redesigned Storytelling CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 text-base font-bold shadow-lg h-14 px-8 group">
                <Link to="/auth" search={{ next: "/reception" }}>
                  🚀 Launch Live Clinic Demo
                  <ChevronRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-intelligence/30 hover:bg-intelligence/5 text-intelligence hover:text-intelligence text-base font-bold h-14 px-8">
                <Link to="/auth" search={{ next: "/demo" }}>
                  ▶ Start Judge Demo
                </Link>
              </Button>
            </div>

            {/* Core Narrative Indicators */}
            <div className="border-t border-border/40 pt-8">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4 font-mono">
                Predictive Operations Pipeline
              </p>
              <div className="grid grid-cols-5 gap-2 text-center text-xs">
                {[
                  { step: "Predict", desc: "EWMA Drift Model" },
                  { step: "Explain", desc: "Audit Ledger" },
                  { step: "Impact", desc: "Queue-wide ETAs" },
                  { step: "Recommend", desc: "Action Prompts" },
                  { step: "Optimize", desc: "Flow Efficiency" },
                ].map((s, i) => (
                  <div key={s.step} className="flex flex-col items-center">
                    <div className="h-7 w-7 rounded-full bg-muted border border-border flex items-center justify-center font-bold text-[10px] font-mono text-muted-foreground mb-2">
                      0{i+1}
                    </div>
                    <span className="font-display font-bold text-foreground text-[11px]">{s.step}</span>
                    <span className="text-[9px] text-muted-foreground hidden sm:inline mt-0.5">{s.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right Column: High Fidelity Connected Network Visualizer */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative h-[620px] w-full bg-background/20 rounded-3xl border border-border/40 shadow-premium p-6 overflow-hidden flex flex-col justify-between"
          >
            <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none" />
            
            {/* Live Visual Network Connection Overlay */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity="0.4" />
                  <stop offset="50%" stopColor="#7C3AED" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#22C55E" stopOpacity="0.4" />
                </linearGradient>
              </defs>
              {/* SVG connection lines representing the network */}
              <line x1="20%" y1="20%" x2="50%" y2="50%" stroke="url(#lineGrad)" strokeWidth="2" strokeDasharray="6 4" />
              <line x1="80%" y1="25%" x2="50%" y2="50%" stroke="url(#lineGrad)" strokeWidth="2" strokeDasharray="6 4" />
              <line x1="30%" y1="85%" x2="50%" y2="50%" stroke="url(#lineGrad)" strokeWidth="2" strokeDasharray="6 4" />
              <line x1="75%" y1="80%" x2="50%" y2="50%" stroke="url(#lineGrad)" strokeWidth="2" strokeDasharray="6 4" />
            </svg>

            {/* TOP ROW: Reception Node & Patient Node */}
            <div className="flex justify-between items-start gap-4 relative z-10">
              {/* Reception Node Card */}
              <motion.div
                whileHover={{ y: -4 }}
                className="w-[190px] glass-card border border-border/50 rounded-2xl p-3.5 shadow-premium"
              >
                <div className="flex items-center gap-1.5 text-[9px] font-bold text-primary uppercase tracking-widest">
                  <Activity className="h-3 w-3" /> Reception Node
                </div>
                <h4 className="font-display font-bold text-xs text-foreground mt-1.5">Intake desk online</h4>
                <div className="mt-2 space-y-1 text-[10px] text-muted-foreground">
                  <div className="flex justify-between"><span>Active queue:</span><span className="font-bold text-foreground">12</span></div>
                  <div className="flex justify-between"><span>Arrival rate:</span><span className="font-bold text-foreground">8/hr</span></div>
                </div>
              </motion.div>

              {/* Patient Node Card */}
              <motion.div
                whileHover={{ y: -4 }}
                className="w-[190px] glass-card border border-border/50 rounded-2xl p-3.5 shadow-premium"
              >
                <div className="flex items-center gap-1.5 text-[9px] font-bold text-success uppercase tracking-widest">
                  <Users className="h-3 w-3" /> Patient Tracking
                </div>
                <h4 className="font-display font-bold text-xs text-foreground mt-1.5">Portal access active</h4>
                <div className="mt-2 space-y-1 text-[10px] text-muted-foreground">
                  <div className="flex justify-between"><span>Token check-in:</span><span className="font-bold text-foreground">#102</span></div>
                  <div className="flex justify-between"><span>SMS status:</span><span className="font-bold text-success">Dispatched</span></div>
                </div>
              </motion.div>
            </div>

            {/* CENTER HUB: AI Operations Brain */}
            <div className="flex justify-center relative z-10">
              <motion.div
                whileHover={{ scale: 1.03 }}
                className="w-[240px] glass-card border-gradient-intel rounded-2xl p-4 shadow-intel text-center relative overflow-hidden bg-intelligence/5"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-intelligence/10 to-transparent pointer-events-none" />
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-intelligence/20 text-intelligence mb-2">
                  <Brain className="h-4.5 w-4.5 text-glow-intel animate-pulse" />
                </div>
                <h3 className="font-display font-bold text-sm text-foreground">QueueCure AI+ Core</h3>
                <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                  Calibrating flow dynamics via EWMA regression models.
                </p>
                <div className="mt-3 flex justify-around border-t border-intelligence/20 pt-2.5 text-[10px] text-muted-foreground font-mono">
                  <div>
                    <span className="block text-[8px] font-semibold uppercase">Prediction MAE</span>
                    <span className="text-intelligence font-bold text-glow-intel text-[11px]">±1.8m</span>
                  </div>
                  <div className="w-px bg-intelligence/20" />
                  <div>
                    <span className="block text-[8px] font-semibold uppercase">Sync channels</span>
                    <span className="text-foreground font-bold text-[11px]">4 active</span>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* BOTTOM ROW: Doctor Node & Live Floating Intelligence Card */}
            <div className="flex justify-between items-end gap-4 relative z-10">
              {/* Doctor Node Card */}
              <motion.div
                whileHover={{ y: -4 }}
                className="w-[190px] glass-card border border-border/50 rounded-2xl p-3.5 shadow-premium"
              >
                <div className="flex items-center gap-1.5 text-[9px] font-bold text-primary uppercase tracking-widest">
                  <Stethoscope className="h-3 w-3" /> Doctor Console
                </div>
                <h4 className="font-display font-bold text-xs text-foreground mt-1.5">Consultations active</h4>
                <div className="mt-2 space-y-1 text-[10px] text-muted-foreground">
                  <div className="flex justify-between"><span>Now serving:</span><span className="font-bold text-foreground">#9</span></div>
                  <div className="flex justify-between"><span>Avg duration:</span><span className="font-bold text-foreground">11.4m</span></div>
                </div>
              </motion.div>

              {/* Floating AI Recommendation Card (Highly dominant, Purple theme) */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                whileHover={{ y: -4 }}
                className="w-[220px] border border-intelligence/40 bg-intelligence/10 rounded-2xl p-4 shadow-intel text-left"
              >
                <div className="flex items-center gap-1 text-[9px] font-bold text-intelligence uppercase tracking-widest">
                  <Sparkles className="h-3 w-3" /> AI Recommendation
                </div>
                <h4 className="font-display font-bold text-xs text-foreground mt-1.5">Reserve Consultation Slot</h4>
                <p className="text-[10px] text-muted-foreground mt-1 leading-snug">
                  Emergency case inserted. Reserve next slot to prevent wait times from compounding.
                </p>
                <div className="mt-2.5 flex justify-between items-center text-[10px] border-t border-intelligence/15 pt-2">
                  <span className="text-intelligence font-medium">Wait Impact: -14m</span>
                  <span className="bg-intelligence/20 text-intelligence px-1.5 py-0.5 rounded text-[8px] font-bold uppercase">Apply</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Feature Grid */}
        <div className="mt-24 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Brain, title: "Predictive ETA Calibration", body: "Calculates wait times dynamically using EWMA regression models adjusted for visit-type and doctor pace.", intelligence: true },
            { icon: Radio, title: "Realtime Telemetry Pipeline", body: "Keeps patient boards, reception command hubs, and clinician panels in lockstep via Postgres WAL listeners.", intelligence: false },
            { icon: ShieldAlert, title: "Emergency Priority Sorting", body: "Re-ranks queue lists dynamically to slide acute cases to position zero and recalculates downstream impact.", intelligence: true },
            { icon: TimerReset, title: "Recommended Arrival Windows", body: "Alerts patients when to leave their homes, decreasing waiting room congestion by up to 45%.", intelligence: false },
            { icon: Stethoscope, title: "Clinician Flow Focus", body: "Server-stamped consultation states keep doctor documentation and patient metrics perfectly aligned.", intelligence: false },
            { icon: Activity, title: "Congestion Risk Forecasting", body: "Simulates patient arrival rate vs check-out speed to forecast backlogs before clinics experience delay.", intelligence: true },
          ].map((f) => (
            <div
              key={f.title}
              className={`rounded-2xl border p-6 transition-all hover:scale-[1.01] hover:border-border/80 ${
                f.intelligence 
                  ? "border-intelligence/30 bg-intelligence/5 shadow-intel hover:border-intelligence/50" 
                  : "border-border/40 bg-card/60 shadow-premium"
              }`}
            >
              <div className={`grid h-11 w-11 place-items-center rounded-xl ${
                f.intelligence ? "bg-intelligence/10 text-intelligence" : "bg-primary/10 text-primary"
              }`}>
                <f.icon className="h-5.5 w-5.5" />
              </div>
              <h3 className="mt-4 font-display text-base font-bold text-foreground flex items-center gap-1.5">
                {f.title}
                {f.intelligence && <span className="bg-intelligence/20 text-intelligence text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full">AI</span>}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-border/40 py-10 relative z-10 text-center text-xs text-muted-foreground bg-background/50">
        QueueCure AI+ · World-Class Predictive Healthcare Operations Platform · Built for Healthcare Innovation
      </footer>
    </div>
  );
}
