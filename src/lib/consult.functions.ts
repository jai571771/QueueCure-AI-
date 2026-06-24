import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const idInput = z.object({ id: z.string().uuid() });

export const startConsult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: z.infer<typeof idInput>) => idInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isDoc } = await supabase.rpc("has_role", { _user_id: userId, _role: "doctor" });
    if (!isDoc) throw new Error("Only doctors can start consultations.");

    const { data: row, error: e1 } = await supabase
      .from("queue_patients").select("status").eq("id", data.id).single();
    if (e1) throw new Error(e1.message);
    if (row.status !== "called" && row.status !== "waiting") {
      throw new Error(`Cannot start a ${row.status} consultation.`);
    }

    const { error } = await supabase
      .from("queue_patients")
      .update({ status: "in_progress", started_at: new Date().toISOString(), doctor_id: userId })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const completeConsult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: z.infer<typeof idInput>) => idInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isDoc } = await supabase.rpc("has_role", { _user_id: userId, _role: "doctor" });
    if (!isDoc) throw new Error("Only doctors can complete consultations.");

    const { data: p, error: e1 } = await supabase
      .from("queue_patients").select("id, clinic_id, started_at, visit_type, status")
      .eq("id", data.id).single();
    if (e1) throw new Error(e1.message);
    if (p.status !== "in_progress") throw new Error("Patient is not currently in consultation.");
    if (!p.started_at) throw new Error("Missing start time.");

    const completedAt = new Date().toISOString();
    const { error: e2 } = await supabase
      .from("queue_patients")
      .update({ status: "completed", completed_at: completedAt })
      .eq("id", data.id);
    if (e2) throw new Error(e2.message);

    const { error: e3 } = await supabase.from("consultation_events").insert({
      clinic_id: p.clinic_id,
      patient_id: p.id,
      doctor_id: userId,
      visit_type: p.visit_type,
      started_at: p.started_at,
      completed_at: completedAt,
    });
    if (e3) throw new Error(e3.message);

    return { ok: true };
  });
