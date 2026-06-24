import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DEMO_CLINIC_ID = "11111111-1111-1111-1111-111111111111";

const addPatientInput = z.object({
  patientName: z.string().min(1).max(120),
  age: z.number().int().min(0).max(130).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  visitType: z.enum(["general","follow_up","prescription","lab_review","vaccination","emergency"]),
  priority: z.enum(["normal","urgent","emergency"]).default("normal"),
  notes: z.string().max(500).optional().nullable(),
});

export const addPatient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.infer<typeof addPatientInput>) => addPatientInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const clinicId = DEMO_CLINIC_ID;

    const { data: isRecep } = await supabase.rpc("has_role", { _user_id: userId, _role: "receptionist" });
    if (!isRecep) throw new Error("Only receptionists can add patients.");

    const { data: tokenData, error: tErr } = await supabase.rpc("generate_token", { _clinic_id: clinicId });
    if (tErr) throw new Error(tErr.message);
    const token = tokenData as unknown as number;

    const { data: predSec } = await supabase.rpc("predicted_seconds", { _clinic_id: clinicId, _vt: data.visitType });
    const predMin = Math.max(1, Math.ceil(((predSec as unknown as number) ?? 480) / 60));

    const { data: row, error } = await supabase.from("queue_patients").insert({
      clinic_id: clinicId,
      token_number: token,
      patient_name: data.patientName,
      age: data.age ?? null,
      phone: data.phone ?? null,
      visit_type: data.visitType,
      priority: data.priority,
      notes: data.notes ?? null,
      predicted_duration_minutes: predMin,
      created_by: userId,
    }).select().single();

    if (error) throw new Error(error.message);
    return row;
  });

export const callNext = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const clinicId = DEMO_CLINIC_ID;
    const { data: isRecep } = await supabase.rpc("has_role", { _user_id: userId, _role: "receptionist" });
    if (!isRecep) throw new Error("Only receptionists can call patients.");

    const { data: next, error: e1 } = await supabase
      .from("queue_patients")
      .select("id")
      .eq("clinic_id", clinicId)
      .eq("status", "waiting")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (e1) throw new Error(e1.message);
    if (!next) throw new Error("No patients waiting.");

    const { error } = await supabase
      .from("queue_patients")
      .update({ status: "called", called_at: new Date().toISOString(), called_by: userId })
      .eq("id", next.id);
    if (error) throw new Error(error.message);
    return { id: next.id };
  });

const idInput = z.object({ id: z.string().uuid() });

export const skipPatient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: z.infer<typeof idInput>) => idInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isRecep } = await supabase.rpc("has_role", { _user_id: userId, _role: "receptionist" });
    if (!isRecep) throw new Error("Only receptionists can skip patients.");
    const { error } = await supabase.from("queue_patients").update({ status: "skipped" }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removePatient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: z.infer<typeof idInput>) => idInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isRecep } = await supabase.rpc("has_role", { _user_id: userId, _role: "receptionist" });
    if (!isRecep) throw new Error("Only receptionists can remove patients.");
    const { error } = await supabase.from("queue_patients").update({ status: "removed" }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markEmergency = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: z.infer<typeof idInput>) => idInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isRecep } = await supabase.rpc("has_role", { _user_id: userId, _role: "receptionist" });
    if (!isRecep) throw new Error("Only receptionists can flag emergencies.");
    const { error } = await supabase.from("queue_patients").update({ priority: "emergency" }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
