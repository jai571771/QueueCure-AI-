import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const registerNewUser = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; password: string; displayName: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: res, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { display_name: data.displayName },
    });

    if (error) {
      throw new Error(error.message);
    }

    return { ok: true, user: res.user };
  });

export type OnboardingData = {
  clinicName: string;
  role: "receptionist" | "doctor" | "clinic_admin";
  displayName: string;
  baselines: {
    general: number;
    follow_up: number;
    prescription: number;
    lab_review: number;
    vaccination: number;
  };
};

export const createClinicWorkspace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: OnboardingData) => d)
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Generate a URL-friendly unique slug from the clinic name
    const baseSlug = data.clinicName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const uniqueSuffix = Math.random().toString(36).substring(2, 6);
    const slug = `${baseSlug || "clinic"}-${uniqueSuffix}`;

    // 2. Insert new clinic
    const { data: clinic, error: clinicError } = await supabaseAdmin
      .from("clinics")
      .insert({ name: data.clinicName, slug })
      .select("id, name, slug")
      .single();

    if (clinicError || !clinic) {
      throw new Error(clinicError?.message || "Failed to create clinic workspace");
    }

    // 3. Determine database role (clinic_admin is mapped to receptionist)
    const dbRole = data.role === "doctor" ? "doctor" : "receptionist";

    // 4. Assign role in user_roles
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: context.userId, role: dbRole }, { onConflict: "user_id,role" });

    if (roleError) {
      throw new Error(roleError.message || "Failed to assign system role");
    }

    // 5. Join clinic as member
    const { error: memberError } = await supabaseAdmin
      .from("clinic_members")
      .insert({ clinic_id: clinic.id, user_id: context.userId, role: dbRole });

    if (memberError) {
      throw new Error(memberError.message || "Failed to join clinic members list");
    }

    // 6. Update profiles table
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert(
        { id: context.userId, display_name: data.displayName, default_clinic_id: clinic.id },
        { onConflict: "id" }
      );

    if (profileError) {
      throw new Error(profileError.message || "Failed to finalize user profile");
    }

    // 7. Insert baseline visit type durations in duration_stats (in seconds)
    const statsToInsert = [
      { clinic_id: clinic.id, visit_type: "general" as const, ewma_seconds: data.baselines.general * 60, sample_count: 0 },
      { clinic_id: clinic.id, visit_type: "follow_up" as const, ewma_seconds: data.baselines.follow_up * 60, sample_count: 0 },
      { clinic_id: clinic.id, visit_type: "prescription" as const, ewma_seconds: data.baselines.prescription * 60, sample_count: 0 },
      { clinic_id: clinic.id, visit_type: "lab_review" as const, ewma_seconds: data.baselines.lab_review * 60, sample_count: 0 },
      { clinic_id: clinic.id, visit_type: "vaccination" as const, ewma_seconds: data.baselines.vaccination * 60, sample_count: 0 },
      { clinic_id: clinic.id, visit_type: "emergency" as const, ewma_seconds: 900, sample_count: 0 }, // 15 min default emergency baseline
    ];

    const { error: statsError } = await supabaseAdmin
      .from("duration_stats")
      .insert(statsToInsert);

    if (statsError) {
      throw new Error(statsError.message || "Failed to initialize clinic performance statistics");
    }

    return {
      ok: true,
      clinicId: clinic.id,
      slug: clinic.slug,
      name: clinic.name,
      role: dbRole
    };
  });
