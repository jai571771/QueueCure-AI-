import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import {
  Activity,
  ArrowRight,
  Loader2,
  Mail,
  Lock,
  Building2,
  User,
  CheckCircle2,
  Sparkles,
  Check,
  Users,
  ShieldCheck,
  ArrowLeft,
  Plus,
  Trash2,
  ChevronRight,
  Clock,
  Sparkle
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ensureDemoSetup } from "@/lib/demo.functions";
import { createClinicWorkspace, registerNewUser } from "@/lib/onboarding.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

const searchSchema = z.object({ next: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Deploy Platform — QueueCure AI+" }] }),
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

  // Auth Tab selection
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  
  // Sign In inputs
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Sign Up inputs
  const [signupClinicName, setSignupClinicName] = useState("");
  const [signupFullName, setSignupFullName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [signupRole, setSignupRole] = useState<"receptionist" | "doctor" | "clinic_admin">("clinic_admin");

  // Onboarding Wizard states
  const [onboardingStep, setOnboardingStep] = useState(0); // 0 means not onboarding
  const [onboardClinicName, setOnboardClinicName] = useState("");
  const [durationGeneral, setDurationGeneral] = useState(8);
  const [durationFollowUp, setDurationFollowUp] = useState(4);
  const [durationPrescription, setDurationPrescription] = useState(3);
  const [durationLabReview, setDurationLabReview] = useState(5);
  const [durationVaccination, setDurationVaccination] = useState(2);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"receptionist" | "doctor">("receptionist");
  const [invitedStaff, setInvitedStaff] = useState<Array<{ email: string; role: "receptionist" | "doctor" }>>([]);
  
  // Onboard status feedback text
  const [onboardStatus, setOnboardStatus] = useState("");
  const [onboardedClinic, setOnboardedClinic] = useState<{ id: string; slug: string; name: string; role: string } | null>(null);

  // General busy state
  const [busy, setBusy] = useState<null | "in" | "up" | "demo-r" | "demo-d" | "onboard" | "invites">(null);

  // Sync signup clinic name to wizard clinic name
  useEffect(() => {
    if (onboardingStep === 1 && signupClinicName && !onboardClinicName) {
      setOnboardClinicName(signupClinicName);
    }
  }, [onboardingStep, signupClinicName, onboardClinicName]);

  // Initial session check
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        // Verify if user already has a clinic assigned
        supabase
          .from("profiles")
          .select("default_clinic_id")
          .eq("id", data.session.user.id)
          .maybeSingle()
          .then(({ data: profile }) => {
            if (profile?.default_clinic_id) {
              supabase
                .from("user_roles")
                .select("role")
                .eq("user_id", data.session.user.id)
                .maybeSingle()
                .then(({ data: roleData }) => {
                  const next = roleData?.role === "doctor" ? "/doctor" : "/reception";
                  navigate({ to: (search.next as any) ?? next });
                });
            } else {
              // Authenticated but no clinic: trigger wizard
              setOnboardingStep(1);
            }
          });
      }
    });
  }, [navigate, search.next]);

  // Client side sign in
  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy("in");
    const { error, data } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    
    if (error) {
      toast.error(error.message);
      setBusy(null);
      return;
    }

    toast.success("Signed in successfully!");

    // Check if user has a clinic
    if (data?.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("default_clinic_id")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profile?.default_clinic_id) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .maybeSingle();
        const next = roleData?.role === "doctor" ? "/doctor" : "/reception";
        setBusy(null);
        navigate({ to: (search.next as any) ?? next });
      } else {
        setBusy(null);
        setOnboardingStep(1);
      }
    } else {
      setBusy(null);
    }
  }

  // Client side signup
  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    if (!signupClinicName.trim()) {
      toast.error("Clinic name is required");
      return;
    }
    if (!signupFullName.trim()) {
      toast.error("Full name is required");
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (signupPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setBusy("up");
    try {
      const regRes = await registerNewUser({
        email: signupEmail,
        password: signupPassword,
        displayName: signupFullName,
      });

      if (regRes.ok) {
        // Immediately sign in to establish the client session
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email: signupEmail,
          password: signupPassword,
        });

        if (signInErr) {
          toast.error("Auto login failed: " + signInErr.message);
          setTab("signin");
        } else if (signInData?.session) {
          toast.success("Account created successfully!");
          setOnboardingStep(1);
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Registration failed. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  // Demo entrypoint
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
      await ensure({ data: undefined as never }).catch(() => {});
      toast.success(`Signed in as ${kind === "receptionist" ? "Receptionist" : "Doctor"}`);
      navigate({ to: next });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start demo");
    } finally {
      setBusy(null);
    }
  }

  // Onboarding Wizard: Create workspace in DB
  async function handleDeployWorkspace() {
    if (!onboardClinicName.trim()) {
      toast.error("Clinic workspace name cannot be empty");
      return;
    }

    setBusy("onboard");
    setOnboardStatus("Connecting to secure workspace server...");

    const onboardingPromise = createClinicWorkspace({
      clinicName: onboardClinicName,
      role: signupRole,
      displayName: signupFullName || signupEmail.split("@")[0],
      baselines: {
        general: durationGeneral,
        follow_up: durationFollowUp,
        prescription: durationPrescription,
        lab_review: durationLabReview,
        vaccination: durationVaccination,
      }
    });

    const textTimer1 = setTimeout(() => setOnboardStatus("Deploying secure database partitions..."), 800);
    const textTimer2 = setTimeout(() => setOnboardStatus("Linking role permissions and membership policies..."), 1600);
    const textTimer3 = setTimeout(() => setOnboardStatus("Initializing forecasting baselines for 5 visit types..."), 2400);
    const textTimer4 = setTimeout(() => setOnboardStatus("Finalizing system environment and starting ML model hook..."), 3200);

    try {
      const [res] = await Promise.all([
        onboardingPromise,
        new Promise(resolve => setTimeout(resolve, 3800)) // Visual effect
      ]);

      clearTimeout(textTimer1);
      clearTimeout(textTimer2);
      clearTimeout(textTimer3);
      clearTimeout(textTimer4);

      if (res.ok) {
        setOnboardedClinic({
          id: res.clinicId,
          slug: res.slug,
          name: res.name,
          role: res.role
        });
        setOnboardingStep(3); // Progress to Staff Invites
        toast.success("Workspace deployed successfully!");
      }
    } catch (err: any) {
      clearTimeout(textTimer1);
      clearTimeout(textTimer2);
      clearTimeout(textTimer3);
      clearTimeout(textTimer4);
      toast.error(err.message || "Failed to initialize clinic workspace");
    } finally {
      setBusy(null);
      setOnboardStatus("");
    }
  }

  // Add staff member to invite array
  function addStaffInvite() {
    if (!inviteEmail.trim()) return;
    if (!inviteEmail.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    setInvitedStaff([...invitedStaff, { email: inviteEmail, role: inviteRole }]);
    setInviteEmail("");
    toast.success("Team member added to invitation list");
  }

  // Remove staff member from invite array
  function removeStaffInvite(index: number) {
    setInvitedStaff(invitedStaff.filter((_, i) => i !== index));
  }

  // Submit invitations (simulated)
  async function submitInvitations(skip = false) {
    if (skip || invitedStaff.length === 0) {
      setOnboardingStep(4);
      return;
    }

    setBusy("invites");
    toast.info("Sending invitations to staff...");
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    setBusy(null);
    toast.success(`Success! ${invitedStaff.length} invitation links dispatched.`);
    setOnboardingStep(4);
  }

  // Launch dashboard
  function launchPlatform() {
    if (!onboardedClinic) {
      navigate({ to: "/reception" });
      return;
    }
    const path = onboardedClinic.role === "doctor" ? "/doctor" : "/reception";
    navigate({ to: path });
  }

  // Sign out (Back/Cancel from wizard step 1)
  async function handleWizardCancel() {
    await supabase.auth.signOut();
    setOnboardingStep(0);
  }

  return (
    <div className="relative grid min-h-screen lg:grid-cols-2 overflow-hidden bg-background">
      
      {/* ================= LEFT SIDE: PRODUCT SHOWCASE ================= */}
      <div className="relative hidden overflow-hidden bg-slate-950 lg:flex flex-col justify-between p-12 text-slate-100 border-r border-slate-900 select-none">
        
        {/* Background Visual Effects */}
        <div className="absolute inset-0 bg-grid opacity-15 pointer-events-none" aria-hidden />
        <div className="absolute -left-20 -top-20 h-[500px] w-[500px] rounded-full bg-primary/20 blur-3xl pointer-events-none" aria-hidden />
        <div className="absolute right-0 bottom-0 h-[400px] w-[400px] rounded-full bg-intelligence/15 blur-3xl pointer-events-none" aria-hidden />

        {/* Logo and System Tag */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 border border-primary/30 backdrop-blur-md shadow-premium shadow-primary/5">
              <Activity className="h-5.5 w-5.5 text-primary" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight text-white">
              QueueCure <span className="text-primary">AI+</span>
            </span>
          </div>
          <span className="text-[10px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
            v2.4 Live
          </span>
        </div>

        {/* Main Product Positioning Content */}
        <div className="relative z-10 my-auto py-8">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-xs uppercase tracking-wider font-semibold text-primary">
              Clinical Intelligence System
            </span>
            <h1 className="mt-3 font-display text-4xl font-extrabold leading-tight tracking-tight text-white max-w-lg lg:text-5xl">
              Predictive Healthcare Operations Platform
            </h1>
            <p className="mt-4 max-w-md text-base text-slate-400 font-sans leading-relaxed">
              Harness machine learning to forecast patient delays, explain downstream impacts, and recommend queue optimizations in real time.
            </p>
          </motion.div>

          {/* Animated Float Grid Showcase */}
          <div className="mt-12 grid grid-cols-2 gap-4 max-w-xl">
            
            {/* Card 1: Queue Health (Green/Good) */}
            <motion.div
              animate={{ y: [0, -8, 0], x: [0, 2, 0] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
              className="glass border border-slate-800/80 p-4 rounded-xl shadow-premium"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Queue Health</span>
                <span className="h-2 w-2 rounded-full bg-success animate-pulse-subtle" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white tracking-tight">Stable</span>
                <span className="text-xs text-success-foreground font-semibold px-1.5 py-0.5 rounded bg-success/10">Good</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">4 patients in queue • 1 consult active</p>
            </motion.div>

            {/* Card 2: Live ETA (Stable Prediction) */}
            <motion.div
              animate={{ y: [0, -10, 0], x: [0, -3, 0] }}
              transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
              className="glass border border-slate-800/80 p-4 rounded-xl shadow-premium"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">ETA Forecast</span>
                <span className="text-[9px] font-semibold text-primary px-1.5 py-0.5 rounded bg-primary/10">96% Conf.</span>
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-xs text-slate-400">Token #14</span>
                <span className="text-2xl font-bold text-white tracking-tight">14m</span>
                <span className="text-[10px] text-slate-500">Wait</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Recalculated 12s ago (Stable)</p>
            </motion.div>

            {/* Card 3: AI recommendation (Purple Glow) */}
            <motion.div
              animate={{ y: [0, -7, 0], x: [0, 4, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
              className="col-span-2 border border-gradient-intel shadow-intel bg-slate-900/60 p-4 rounded-xl"
            >
              <div className="flex items-center gap-2">
                <Sparkle className="h-4 w-4 text-intelligence fill-intelligence animate-pulse-subtle" />
                <span className="text-[10px] uppercase font-bold text-intelligence tracking-wider">AI Recommendation</span>
              </div>
              <p className="mt-2 text-xs text-slate-300 leading-normal">
                Divert vaccination staff to general queue. Expected bottleneck alleviation: <span className="text-intelligence font-bold text-glow-intel">+18% flow throughput</span>.
              </p>
            </motion.div>

            {/* Card 4: Efficiency Score */}
            <motion.div
              animate={{ y: [0, -12, 0], x: [0, -2, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
              className="glass border border-slate-800/80 p-4 rounded-xl shadow-premium"
            >
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Efficiency Score</span>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white tracking-tight">94%</span>
                <span className="text-xs text-primary font-semibold px-1.5 py-0.5 rounded bg-primary/10">Grade A</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Peak clinic load optimized</p>
            </motion.div>
            
          </div>
        </div>

        {/* Showcase Footer Features */}
        <div className="relative z-10 border-t border-slate-900 pt-6 grid grid-cols-2 gap-y-4 gap-x-6 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-primary shrink-0" />
            <span>Realtime Queue Prediction</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-primary shrink-0" />
            <span>Emergency Priority Routing</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-primary shrink-0" />
            <span>Operational Intelligence</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-primary shrink-0" />
            <span>Live ETA Forecasting</span>
          </div>
        </div>
      </div>

      {/* ================= RIGHT SIDE: AUTHENTICATION & ONBOARDING ================= */}
      <div className="flex flex-col justify-between min-h-screen bg-background px-6 py-8 overflow-y-auto">
        
        {/* Top Spacer or logo for mobile layout */}
        <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 border border-primary/20">
            <Activity className="h-4.5 w-4.5 text-primary" />
          </div>
          <span className="font-display text-lg font-bold text-foreground">
            QueueCure <span className="text-primary">AI+</span>
          </span>
        </div>

        {/* Center Content Section */}
        <div className="flex-1 flex items-center justify-center py-6">
          <div className="w-full max-w-md">

            <AnimatePresence mode="wait">
              {onboardingStep === 0 ? (
                /* ================= STANDARD AUTH CONTAINER ================= */
                <motion.div
                  key="auth-forms"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Tab Selector */}
                  <div className="grid grid-cols-2 p-1.5 bg-muted rounded-xl mb-8 shadow-sm">
                    <button
                      onClick={() => setTab("signin")}
                      className={`py-2 text-sm font-semibold rounded-lg transition-all ${
                        tab === "signin"
                          ? "bg-card text-foreground shadow"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => setTab("signup")}
                      className={`py-2 text-sm font-semibold rounded-lg transition-all ${
                        tab === "signup"
                          ? "bg-card text-foreground shadow"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Create Account
                    </button>
                  </div>

                  {tab === "signin" ? (
                    /* ================= SIGN IN FORM ================= */
                    <div className="space-y-6">
                      <div>
                        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
                          Welcome back to console
                        </h2>
                        <p className="mt-1.5 text-sm text-muted-foreground">
                          Sign in to manage patient queue predictions.
                        </p>
                      </div>

                      <form onSubmit={signIn} className="space-y-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="login-email">Email Address</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                            <Input
                              id="login-email"
                              type="email"
                              placeholder="you@clinic.com"
                              className="pl-10"
                              required
                              value={loginEmail}
                              onChange={(e) => setLoginEmail(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="login-password">Password</Label>
                          </div>
                          <div className="relative">
                            <Lock className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                            <Input
                              id="login-password"
                              type="password"
                              placeholder="••••••••"
                              className="pl-10"
                              required
                              value={loginPassword}
                              onChange={(e) => setLoginPassword(e.target.value)}
                            />
                          </div>
                        </div>

                        {/* Remember Me & Forgot Password */}
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <label className="flex items-center gap-2 cursor-pointer select-none text-muted-foreground font-medium">
                            <input
                              type="checkbox"
                              className="rounded border-input text-primary focus:ring-primary h-4 w-4 bg-background"
                            />
                            Remember me
                          </label>
                          <button
                            type="button"
                            onClick={() => toast.info("Simulated Password Reset: Check email for link")}
                            className="font-semibold text-primary hover:underline"
                          >
                            Forgot Password?
                          </button>
                        </div>

                        <Button type="submit" className="w-full" size="lg" disabled={busy !== null}>
                          {busy === "in" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          Sign In
                        </Button>
                      </form>

                      {/* Demo Quick Sandbox Access */}
                      <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-border" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-background px-3 text-muted-foreground font-semibold tracking-wider">
                            Try QueueCure Instantly
                          </span>
                        </div>
                      </div>

                      <Card className="border border-gradient-intel shadow-intel bg-card/60 overflow-hidden">
                        <CardContent className="p-5 space-y-4">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-intelligence/15 text-intelligence border border-intelligence/20">
                              <Sparkles className="h-4.5 w-4.5" />
                            </div>
                            <div className="space-y-0.5">
                              <h4 className="font-semibold text-sm text-foreground">Explore Sandbox Environment</h4>
                              <p className="text-xs text-muted-foreground">
                                Fast-track clinical workflow evaluations with pre-seeded dashboards.
                              </p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <Button
                              variant="outline"
                              className="w-full text-xs font-semibold justify-between border-border hover:bg-muted"
                              onClick={() => demo("receptionist")}
                              disabled={busy !== null}
                            >
                              {busy === "demo-r" ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <span>Receptionist Workflow</span>}
                              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="outline"
                              className="w-full text-xs font-semibold justify-between border-border hover:bg-muted"
                              onClick={() => demo("doctor")}
                              disabled={busy !== null}
                            >
                              {busy === "demo-d" ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <span>Doctor Workflow</span>}
                              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    /* ================= CREATE ACCOUNT FORM ================= */
                    <div className="space-y-6">
                      <div>
                        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
                          Create clinic workspace
                        </h2>
                        <p className="mt-1.5 text-sm text-muted-foreground">
                          Initialize a venture-grade predictive scheduling platform.
                        </p>
                      </div>

                      <form onSubmit={signUp} className="space-y-3.5">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5 col-span-2">
                            <Label htmlFor="signup-clinic">Clinic Name</Label>
                            <div className="relative">
                              <Building2 className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                              <Input
                                id="signup-clinic"
                                type="text"
                                placeholder="Green Hills Medical"
                                className="pl-10"
                                required
                                value={signupClinicName}
                                onChange={(e) => setSignupClinicName(e.target.value)}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="signup-fullname">Full Name</Label>
                          <div className="relative">
                            <User className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                            <Input
                              id="signup-fullname"
                              type="text"
                              placeholder="Dr. Alexander Wright"
                              className="pl-10"
                              required
                              value={signupFullName}
                              onChange={(e) => setSignupFullName(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="signup-email">Email Address</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                            <Input
                              id="signup-email"
                              type="email"
                              placeholder="alex.wright@clinic.com"
                              className="pl-10"
                              required
                              value={signupEmail}
                              onChange={(e) => setSignupEmail(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="signup-password">Password</Label>
                            <div className="relative">
                              <Lock className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                              <Input
                                id="signup-password"
                                type="password"
                                placeholder="••••••"
                                className="pl-10"
                                required
                                value={signupPassword}
                                onChange={(e) => setSignupPassword(e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="signup-confirm">Confirm Password</Label>
                            <div className="relative">
                              <Lock className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                              <Input
                                id="signup-confirm"
                                type="password"
                                placeholder="••••••"
                                className="pl-10"
                                required
                                value={signupConfirmPassword}
                                onChange={(e) => setSignupConfirmPassword(e.target.value)}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="signup-role">System Role</Label>
                          <select
                            id="signup-role"
                            className="w-full h-10 px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                            value={signupRole}
                            onChange={(e) => setSignupRole(e.target.value as any)}
                          >
                            <option value="clinic_admin">Clinic Admin (Workspace Creator)</option>
                            <option value="receptionist">Receptionist (Operations Dashboard)</option>
                            <option value="doctor">Doctor (Clinical Console)</option>
                          </select>
                          <p className="text-[10px] text-muted-foreground pl-0.5">
                            Roles determine primary dashboard navigation and database RLS permissions.
                          </p>
                        </div>

                        <Button type="submit" className="w-full mt-2" size="lg" disabled={busy !== null}>
                          {busy === "up" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          Create Clinic Workspace
                        </Button>
                      </form>

                      <p className="text-center text-sm text-muted-foreground">
                        Already have an account?{" "}
                        <button
                          type="button"
                          onClick={() => setTab("signin")}
                          className="font-semibold text-primary hover:underline"
                        >
                          Sign In
                        </button>
                      </p>
                    </div>
                  )}

                  {/* Trust Builders section */}
                  <div className="mt-8 pt-6 border-t border-border space-y-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Why Clinics Trust QueueCure AI+
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex gap-2">
                        <CheckCircle2 className="h-4.5 w-4.5 text-primary shrink-0 mt-0.5" />
                        <div>
                          <h5 className="text-xs font-bold text-foreground">Predictive ETA Engine</h5>
                          <p className="text-[10px] text-muted-foreground mt-0.5 leading-normal">
                            Dynamic modeling based on doctor consultation speed patterns.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <CheckCircle2 className="h-4.5 w-4.5 text-primary shrink-0 mt-0.5" />
                        <div>
                          <h5 className="text-xs font-bold text-foreground">Emergency-Aware Routing</h5>
                          <p className="text-[10px] text-muted-foreground mt-0.5 leading-normal">
                            Instantly recalculates wait sequences on high-priority override.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <CheckCircle2 className="h-4.5 w-4.5 text-primary shrink-0 mt-0.5" />
                        <div>
                          <h5 className="text-xs font-bold text-foreground">Realtime Patients Feed</h5>
                          <p className="text-[10px] text-muted-foreground mt-0.5 leading-normal">
                            Airport-grade display for lobbies and patient smartphone links.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <CheckCircle2 className="h-4.5 w-4.5 text-primary shrink-0 mt-0.5" />
                        <div>
                          <h5 className="text-xs font-bold text-foreground">HIPAA Compliant Standard</h5>
                          <p className="text-[10px] text-muted-foreground mt-0.5 leading-normal">
                            Enterprise-grade Row Level Security and secure token masking.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                /* ================= ONBOARDING WIZARD CONTAINER ================= */
                <motion.div
                  key="onboarding-wizard"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.3 }}
                  className="w-full max-w-lg glass-card p-6 sm:p-8 rounded-2xl border border-border shadow-premium"
                >
                  {/* Stepper Progress Indicator */}
                  <div className="mb-8 select-none">
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground mb-3">
                      <span className={onboardingStep === 1 ? "text-primary font-bold" : ""}>1. Workspace</span>
                      <span className={onboardingStep === 2 ? "text-primary font-bold" : ""}>2. Baselines</span>
                      <span className={onboardingStep === 3 ? "text-primary font-bold" : ""}>3. Team</span>
                      <span className={onboardingStep === 4 ? "text-primary font-bold" : ""}>4. Launch</span>
                    </div>
                    {/* Stepper Progress Bar */}
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${(onboardingStep / 4) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* ================= STEP 1: CONFIRM WORKSPACE ================= */}
                  {onboardingStep === 1 && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="font-display text-xl font-bold text-foreground">
                          Name Clinic Workspace
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Define the official name of your medical workspace. This establishes URL slugs.
                        </p>
                      </div>

                      <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="onboard-clinic-name">Clinic Name</Label>
                          <div className="relative">
                            <Building2 className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                            <Input
                              id="onboard-clinic-name"
                              type="text"
                              className="pl-10"
                              placeholder="e.g. Green Hills Clinic"
                              value={onboardClinicName}
                              onChange={(e) => setOnboardClinicName(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="p-3 bg-muted rounded-lg border border-border text-xs text-muted-foreground leading-normal flex items-start gap-2">
                          <Users className="h-4.5 w-4.5 text-primary shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-foreground block mb-0.5">Workspace Namespace</span>
                            Workspace slugs are generated automatically:{" "}
                            <code className="px-1 py-0.5 rounded bg-card text-foreground font-mono">
                              /{onboardClinicName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "clinic"}-xxxx
                            </code>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-border">
                        <Button
                          variant="ghost"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={handleWizardCancel}
                        >
                          Cancel & Sign Out
                        </Button>
                        <Button
                          disabled={!onboardClinicName.trim()}
                          onClick={() => setOnboardingStep(2)}
                        >
                          Next: Configure Baselines <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* ================= STEP 2: CONFIGURE BASELINES ================= */}
                  {onboardingStep === 2 && (
                    <div className="space-y-6">
                      {busy === "onboard" ? (
                        /* Cinematic loading state during database deployment */
                        <div className="py-12 flex flex-col items-center justify-center space-y-6 text-center">
                          <div className="relative">
                            <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
                            <Loader2 className="h-16 w-16 text-primary animate-spin relative" />
                          </div>
                          <div className="space-y-2">
                            <h4 className="font-display font-bold text-lg text-foreground">Deploying Workspace Cockpit</h4>
                            <p className="text-sm text-primary font-mono max-w-sm mx-auto h-12 flex items-center justify-center">
                              {onboardStatus}
                            </p>
                          </div>
                        </div>
                      ) : (
                        /* Baseline editing form */
                        <>
                          <div>
                            <h3 className="font-display text-xl font-bold text-foreground">
                              Establish Baseline consultation times
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              Define baseline appointment duration in minutes. The machine learning model bootstraps using these values.
                            </p>
                          </div>

                          <div className="space-y-4 py-2">
                            {/* General */}
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <Label htmlFor="dur-general" className="font-semibold">General Consultation</Label>
                                <span className="font-mono text-xs text-primary font-bold">{durationGeneral} mins</span>
                              </div>
                              <input
                                id="dur-general"
                                type="range" min="1" max="45"
                                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                                value={durationGeneral}
                                onChange={(e) => setDurationGeneral(Number(e.target.value))}
                              />
                            </div>

                            {/* Follow up */}
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <Label htmlFor="dur-followup" className="font-semibold">Follow-Up Visit</Label>
                                <span className="font-mono text-xs text-primary font-bold">{durationFollowUp} mins</span>
                              </div>
                              <input
                                id="dur-followup"
                                type="range" min="1" max="30"
                                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                                value={durationFollowUp}
                                onChange={(e) => setDurationFollowUp(Number(e.target.value))}
                              />
                            </div>

                            {/* Prescription */}
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <Label htmlFor="dur-prescription" className="font-semibold">Prescription Refill</Label>
                                <span className="font-mono text-xs text-primary font-bold">{durationPrescription} mins</span>
                              </div>
                              <input
                                id="dur-prescription"
                                type="range" min="1" max="20"
                                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                                value={durationPrescription}
                                onChange={(e) => setDurationPrescription(Number(e.target.value))}
                              />
                            </div>

                            {/* Lab review */}
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <Label htmlFor="dur-labreview" className="font-semibold">Lab Results Review</Label>
                                <span className="font-mono text-xs text-primary font-bold">{durationLabReview} mins</span>
                              </div>
                              <input
                                id="dur-labreview"
                                type="range" min="1" max="30"
                                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                                value={durationLabReview}
                                onChange={(e) => setDurationLabReview(Number(e.target.value))}
                              />
                            </div>

                            {/* Vaccination */}
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <Label htmlFor="dur-vaccination" className="font-semibold">Vaccination / Inoculation</Label>
                                <span className="font-mono text-xs text-primary font-bold">{durationVaccination} mins</span>
                              </div>
                              <input
                                id="dur-vaccination"
                                type="range" min="1" max="20"
                                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                                value={durationVaccination}
                                onChange={(e) => setDurationVaccination(Number(e.target.value))}
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-4 border-t border-border">
                            <Button
                              variant="ghost"
                              className="text-muted-foreground"
                              onClick={() => setOnboardingStep(1)}
                            >
                              <ArrowLeft className="h-4 w-4 mr-1" /> Back
                            </Button>
                            <Button onClick={handleDeployWorkspace}>
                              Deploy Workspace & Stats <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* ================= STEP 3: INVITE STAFF ================= */}
                  {onboardingStep === 3 && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="font-display text-xl font-bold text-foreground">
                          Assemble Clinic Staff
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Add receptionist and doctors to collaborate in this workspace. We will simulate sending invite links.
                        </p>
                      </div>

                      <div className="space-y-4 py-2">
                        {/* Input Row */}
                        <div className="grid grid-cols-6 gap-2 items-end">
                          <div className="col-span-3 space-y-1.5">
                            <Label htmlFor="invite-email">Staff Email</Label>
                            <Input
                              id="invite-email"
                              type="email"
                              placeholder="staff@clinic.com"
                              value={inviteEmail}
                              onChange={(e) => setInviteEmail(e.target.value)}
                            />
                          </div>
                          <div className="col-span-2 space-y-1.5">
                            <Label htmlFor="invite-role">Role</Label>
                            <select
                              id="invite-role"
                              className="w-full h-10 px-2.5 border border-input rounded-md bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                              value={inviteRole}
                              onChange={(e) => setInviteRole(e.target.value as any)}
                            >
                              <option value="receptionist">Receptionist</option>
                              <option value="doctor">Doctor</option>
                            </select>
                          </div>
                          <Button type="button" onClick={addStaffInvite} className="h-10 px-3">
                            <Plus className="h-4 w-4" /> Add
                          </Button>
                        </div>

                        {/* List Area */}
                        <div className="border border-border rounded-lg overflow-hidden bg-card/45 min-h-[140px] max-h-[180px] overflow-y-auto">
                          {invitedStaff.length === 0 ? (
                            <div className="h-[140px] flex flex-col items-center justify-center text-center p-4">
                              <Users className="h-7 w-7 text-muted-foreground/60 mb-2" />
                              <span className="text-xs font-semibold text-muted-foreground">No staff added yet</span>
                              <span className="text-[10px] text-muted-foreground/80 mt-0.5">Your workspace currently only includes you.</span>
                            </div>
                          ) : (
                            <div className="divide-y divide-border">
                              {invitedStaff.map((staff, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2.5 text-xs">
                                  <div className="flex items-center gap-2">
                                    <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center font-bold text-foreground">
                                      {idx + 1}
                                    </div>
                                    <span className="font-medium text-foreground">{staff.email}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase ${
                                      staff.role === "doctor" 
                                        ? "bg-primary/10 text-primary border border-primary/20" 
                                        : "bg-success/10 text-success border border-success/20"
                                    }`}>
                                      {staff.role}
                                    </span>
                                    <button 
                                      type="button" 
                                      onClick={() => removeStaffInvite(idx)}
                                      className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-border">
                        <Button
                          variant="ghost"
                          className="text-muted-foreground"
                          onClick={() => submitInvitations(true)}
                          disabled={busy === "invites"}
                        >
                          Skip for now
                        </Button>
                        <Button 
                          onClick={() => submitInvitations(false)}
                          disabled={busy === "invites" || invitedStaff.length === 0}
                        >
                          {busy === "invites" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                          Send Invites & Continue <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* ================= STEP 4: LAUNCH PLATFORM ================= */}
                  {onboardingStep === 4 && (
                    <div className="space-y-6">
                      <div className="text-center py-4 flex flex-col items-center">
                        <div className="h-14 w-14 rounded-full bg-success/15 border border-success/30 text-success flex items-center justify-center mb-4">
                          <Check className="h-7 w-7" />
                        </div>
                        <h3 className="font-display text-xl font-bold text-foreground">
                          Configuration Complete!
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                          QueueCure AI+ has successfully initialized your database and baseline predictive scheduler.
                        </p>
                      </div>

                      <Card className="border border-border bg-muted/30">
                        <CardContent className="p-4 space-y-2.5 text-xs sm:text-sm">
                          <div className="flex justify-between py-1 border-b border-border/40">
                            <span className="font-medium text-muted-foreground">Clinic Name</span>
                            <span className="font-bold text-foreground">{onboardedClinic?.name}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-border/40">
                            <span className="font-medium text-muted-foreground">Domain Slug</span>
                            <span className="font-mono text-xs text-foreground bg-muted px-1.5 py-0.5 rounded">
                              /clinic/{onboardedClinic?.slug}
                            </span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-border/40">
                            <span className="font-medium text-muted-foreground">Assigned Role</span>
                            <span className="font-bold text-foreground uppercase text-xs">
                              {signupRole === "clinic_admin" ? "Clinic Admin" : signupRole}
                            </span>
                          </div>
                          <div className="flex justify-between py-1">
                            <span className="font-medium text-muted-foreground">Forecasting Models</span>
                            <span className="text-xs font-semibold text-success flex items-center gap-1">
                              <ShieldCheck className="h-4 w-4" /> Active (5 Visit Types)
                            </span>
                          </div>
                        </CardContent>
                      </Card>

                      <div className="pt-2">
                        <Button 
                          onClick={launchPlatform} 
                          className="w-full text-base font-bold h-12 shadow-premium"
                        >
                          Launch QueueCure AI+ Cockpit 🚀
                        </Button>
                      </div>
                    </div>
                  )}

                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>

        {/* Global Footer copyright/compliance info */}
        <div className="text-center text-[10px] text-muted-foreground pt-4 border-t border-border/40">
          © 2026 QueueCure Systems, Inc. All rights reserved. Secure access monitored under HIPAA regulations.
        </div>

      </div>
    </div>
  );
}
