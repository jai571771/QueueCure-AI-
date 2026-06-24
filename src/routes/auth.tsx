import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { z } from "zod";
import { Activity, ArrowRight, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ensureDemoSetup } from "@/lib/demo.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

const searchSchema = z.object({ next: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Sign in — QueueCure AI+" }] }),
  component: AuthPage,
});

const DEMO = {
  receptionist: { email: "receptionist@demo.clinic", password: "demo-pass-12345", next: "/reception" as const },
  doctor: { email: "doctor@demo.clinic", password: "demo-pass-12345", next: "/doctor" as const },
};

function AuthPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth" });
  const ensure = useServerFn(ensureDemoSetup);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<null | "in" | "demo-r" | "demo-d">(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: (search.next as "/reception" | "/doctor" | "/waiting-room") ?? "/reception" });
    });
  }, [navigate, search.next]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy("in");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Signed in");
    navigate({ to: (search.next as "/reception" | "/doctor" | "/waiting-room") ?? "/reception" });
  }

  async function demo(kind: "receptionist" | "doctor") {
    setBusy(kind === "receptionist" ? "demo-r" : "demo-d");
    try {
      const { email, password, next } = DEMO[kind];
      let res = await supabase.auth.signInWithPassword({ email, password });
      if (res.error) {
        toast.message("Provisioning demo workspace…");
        await ensure({ data: undefined as never });
        res = await supabase.auth.signInWithPassword({ email, password });
      }
      if (res.error) throw res.error;
      // Ensure roles/clinic/seed exist even if user already existed
      await ensure({ data: undefined as never }).catch(() => {});
      toast.success(`Signed in as ${kind === "receptionist" ? "Receptionist" : "Doctor"}`);
      navigate({ to: next });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start demo");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="relative grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-primary lg:flex">
        <div className="absolute inset-0 bg-grid opacity-20" aria-hidden />
        <div className="absolute -left-20 -top-20 h-[480px] w-[480px] rounded-full bg-secondary/40 blur-3xl" aria-hidden />
        <div className="relative z-10 flex flex-col justify-between p-12 text-primary-foreground">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary-foreground/15 backdrop-blur">
              <Activity className="h-5 w-5" />
            </div>
            <span className="font-display text-lg font-bold">QueueCure AI+</span>
          </div>
          <div>
            <h2 className="font-display text-4xl font-bold leading-tight">
              Predictive queue intelligence,<br/>built for clinics that care.
            </h2>
            <p className="mt-4 max-w-md text-primary-foreground/80">
              ETA forecasting, emergency-aware reordering, and operational risk all in one realtime console.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <h1 className="font-display text-2xl font-bold">Sign in to your console</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Use a demo account to explore Reception and Doctor workflows instantly.
          </p>

          <Card className="mt-6">
            <CardContent className="space-y-3 pt-6">
              <Button className="w-full justify-between" size="lg" onClick={() => demo("receptionist")} disabled={busy !== null}>
                {busy === "demo-r" ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Continue as Demo Receptionist</span>}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button className="w-full justify-between" variant="secondary" size="lg" onClick={() => demo("doctor")} disabled={busy !== null}>
                {busy === "demo-d" ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Continue as Demo Doctor</span>}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-wider text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={signIn} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={busy !== null}>
              {busy === "in" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
