import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DEMO_CLINIC_ID = "11111111-1111-1111-1111-111111111111";

const DEMO_USERS = [
  { email: "receptionist@demo.clinic", password: "demo-pass-12345", role: "receptionist" as const, name: "Demo Receptionist" },
  { email: "doctor@demo.clinic", password: "demo-pass-12345", role: "doctor" as const, name: "Dr. Demo" },
];

const FIRST_NAMES = ["Aarav","Priya","Rohan","Anaya","Vikram","Sara","Ishaan","Meera","Kabir","Diya","Arjun","Tara"];
const LAST_NAMES = ["Sharma","Patel","Khan","Singh","Iyer","Reddy","Das","Mehta","Gupta","Bose"];
const VISIT_TYPES = ["general","follow_up","prescription","lab_review","vaccination"] as const;

function pick<T>(a: readonly T[]) { return a[Math.floor(Math.random() * a.length)]; }

export const ensureDemoSetup = createServerFn({ method: "POST" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    for (const u of DEMO_USERS) {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const existing = list.users.find((x) => x.email === u.email);
      let userId = existing?.id;
      if (!existing) {
        const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
          email: u.email, password: u.password, email_confirm: true,
          user_metadata: { display_name: u.name },
        });
        if (error && !error.message.includes("already")) throw new Error(error.message);
        userId = created?.user?.id;
      }
      if (!userId) continue;
      await supabaseAdmin.from("user_roles").upsert({ user_id: userId, role: u.role }, { onConflict: "user_id,role" });
      await supabaseAdmin.from("clinic_members").upsert(
        { clinic_id: DEMO_CLINIC_ID, user_id: userId, role: u.role },
        { onConflict: "clinic_id,user_id" }
      );
      await supabaseAdmin.from("profiles").upsert(
        { id: userId, display_name: u.name, default_clinic_id: DEMO_CLINIC_ID },
        { onConflict: "id" }
      );
    }

    const { count: statsCount } = await supabaseAdmin
      .from("duration_stats").select("*", { count: "exact", head: true }).eq("clinic_id", DEMO_CLINIC_ID);

    if (!statsCount || statsCount === 0) {
      const { data: doctor } = await supabaseAdmin
        .from("user_roles").select("user_id").eq("role", "doctor").limit(1).single();
      const doctorId = doctor?.user_id;
      if (doctorId) {
        const events: Array<{ clinic_id: string; doctor_id: string; visit_type: (typeof VISIT_TYPES)[number]; started_at: string; completed_at: string }> = [];
        const baselines: Record<(typeof VISIT_TYPES)[number], number> = {
          general: 8, follow_up: 4, prescription: 3, lab_review: 5, vaccination: 2,
        };
        for (const vt of VISIT_TYPES) {
          const base = baselines[vt];
          for (let i = 0; i < 22; i++) {
            const dur = (base + (Math.random() * 3 - 1.5)) * 60_000;
            const completedAt = new Date(Date.now() - (i + 1) * 3600_000 - Math.random() * 1800_000);
            const startedAt = new Date(completedAt.getTime() - dur);
            events.push({
              clinic_id: DEMO_CLINIC_ID, doctor_id: doctorId, visit_type: vt,
              started_at: startedAt.toISOString(), completed_at: completedAt.toISOString(),
            });
          }
        }
        await supabaseAdmin.from("consultation_events").insert(events);
      }
    }

    const { count: qCount } = await supabaseAdmin
      .from("queue_patients").select("*", { count: "exact", head: true })
      .eq("clinic_id", DEMO_CLINIC_ID).in("status", ["waiting","called","in_progress"]);

    if (!qCount || qCount === 0) {
      type NewPatient = {
        clinic_id: string; token_number: number; patient_name: string; age: number;
        visit_type: (typeof VISIT_TYPES)[number]; priority: "normal"; predicted_duration_minutes: number;
      };
      const patients: NewPatient[] = [];
      for (let i = 0; i < 8; i++) {
        const { data: tok } = await supabaseAdmin.rpc("generate_token", { _clinic_id: DEMO_CLINIC_ID });
        const vt = pick(VISIT_TYPES);
        const baselines: Record<(typeof VISIT_TYPES)[number], number> = { general: 8, follow_up: 4, prescription: 3, lab_review: 5, vaccination: 2 };
        patients.push({
          clinic_id: DEMO_CLINIC_ID, token_number: tok as unknown as number,
          patient_name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
          age: 18 + Math.floor(Math.random() * 60),
          visit_type: vt, priority: "normal", predicted_duration_minutes: baselines[vt],
        });
      }
      await supabaseAdmin.from("queue_patients").insert(patients);
    }

    return { ok: true };
  });

export type DemoScenario = "normal" | "emergency" | "doctor_delay" | "rush_hour";

export const runScenario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { scenario: DemoScenario }) => d)
  .handler(async ({ context, data }) => {
    const { data: res, error } = await context.supabase.rpc("seed_scenario", {
      _clinic_id: DEMO_CLINIC_ID, _scenario: data.scenario,
    });
    if (error) throw new Error(error.message);
    return res as { ok: boolean; scenario?: string; token?: number };
  });

export const resetDemoData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("reset_demo_data", { _clinic_id: DEMO_CLINIC_ID });
    if (error) throw new Error(error.message);
    return data as { ok: boolean };
  });

export type DemoHealth = {
  eta_accuracy_pct: number;
  eta_mae_minutes: number;
  confidence_label: "High" | "Medium" | "Low";
  confidence_samples: number;
  queue_active: number;
  queue_overdue: number;
  queue_health: "Good" | "Moderate" | "Strained";
  events_per_min: number;
};

export const getDemoHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("compute_demo_health", { _clinic_id: DEMO_CLINIC_ID });
    if (error) throw new Error(error.message);
    return data as unknown as DemoHealth;
  });

export type DemoPatient = { token_number: number; patient_name: string; status: string };

export const getDemoFirstWaitingToken = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("queue_patients").select("token_number")
      .eq("clinic_id", DEMO_CLINIC_ID).in("status", ["waiting","called"])
      .order("created_at", { ascending: true }).limit(1).maybeSingle();
    if (error) throw new Error(error.message);
    return data?.token_number ?? null;
  });
