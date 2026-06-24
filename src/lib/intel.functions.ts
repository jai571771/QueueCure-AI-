import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DEMO_CLINIC_ID = "11111111-1111-1111-1111-111111111111";

export type QueueHealth = {
  status: "healthy" | "moderate" | "critical";
  waiting: number;
  avg_service_seconds: number;
  clearance_minutes: number;
  active_doctors: number;
  recommended_action: string;
};

export type QueueRisk = {
  level: "low" | "moderate" | "high";
  reason: string;
  arrival_rate_per_hour: number;
  service_rate_per_hour: number;
  queue_load: number;
  active_doctors: number;
  clearance_minutes: number;
  expected_clearance_at: string;
};

export type Bottleneck = {
  visit_type: string;
  severity: "mild" | "moderate" | "severe";
  baseline_seconds: number;
  today_avg_seconds: number;
  today_samples: number;
  deviation_pct: number;
  impact_minutes: number;
  trend: "up" | "down" | "flat";
  explanation: string;
};

export type Recommendation = {
  id: string;
  severity: "mild" | "moderate" | "high";
  title: string;
  rationale: string;
};

export type PredictionAccuracy = {
  samples: number;
  accuracy_pct: number | null;
  mae_minutes: number;
  bias_minutes: number;
  weekly: { week_start: string; accuracy_pct: number; samples: number }[];
  per_visit_type: { visit_type: string; samples: number; accuracy_pct: number; mae_minutes: number }[];
  confidence_distribution: { high: number; medium: number; low: number };
};

export type ForecastSlot = {
  slot_start: string;
  slot_end: string;
  expected_arrivals: number;
  expected_waiting: number;
  expected_clearance_minutes: number;
  confidence: "low" | "medium" | "high";
};
export type Forecast = {
  horizon: "next_2h" | "rest_of_day" | "tomorrow";
  slot_minutes: number;
  slots: ForecastSlot[];
  baseline: { waiting_now: number; avg_service_minutes: number; active_doctors: number; arrival_per_min_recent: number };
  staffing_window: string | null;
};

export type EfficiencyScore = {
  score: number;
  grade: "A" | "B" | "C" | "D";
  sub_scores: {
    avg_wait: { score: number; value_minutes: number; weight: number };
    prediction_accuracy: { score: number; value_pct: number; weight: number };
    clearance_speed: { score: number; value_minutes: number; weight: number };
    doctor_utilization: { score: number; value_pct: number; weight: number };
  };
  biggest_lever: string;
  estimated_lift_points?: number;
  what?: string; why?: string; impact?: string; action?: string;
};

export type DoctorProductivity = {
  patients_seen: number;
  avg_minutes: number;
  median_minutes: number;
  on_time_pct: number;
  active_minutes: number;
  per_hour: { hour: number; count: number }[];
  per_visit_type: { visit_type: string; count: number; avg_seconds: number }[];
};

export const getQueueIntel = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [{ data: h, error: he }, { data: r, error: re }] = await Promise.all([
      supabase.rpc("compute_queue_health", { _clinic_id: DEMO_CLINIC_ID }),
      supabase.rpc("compute_queue_risk", { _clinic_id: DEMO_CLINIC_ID }),
    ]);
    if (he) throw new Error(he.message);
    if (re) throw new Error(re.message);
    return { health: h as unknown as QueueHealth, risk: r as unknown as QueueRisk };
  });

export const getBottlenecks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("compute_bottlenecks", { _clinic_id: DEMO_CLINIC_ID });
    if (error) throw new Error(error.message);
    return (data as unknown as Bottleneck[]) ?? [];
  });

export const getRecommendations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("compute_recommendations", { _clinic_id: DEMO_CLINIC_ID });
    if (error) throw new Error(error.message);
    const rows = (data as unknown as (Recommendation & { metric?: unknown })[]) ?? [];
    return rows.map(({ id, severity, title, rationale }) => ({ id, severity, title, rationale })) as Recommendation[];
  });

export const getPredictionAccuracy = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { days?: number } | undefined) => d ?? {})
  .handler(async ({ context, data }) => {
    const { data: res, error } = await context.supabase.rpc("compute_prediction_accuracy", {
      _clinic_id: DEMO_CLINIC_ID, _days: data.days ?? 7,
    });
    if (error) throw new Error(error.message);
    return res as unknown as PredictionAccuracy;
  });

export const getForecast = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { horizon: "next_2h" | "rest_of_day" | "tomorrow" }) => d)
  .handler(async ({ context, data }) => {
    const { data: res, error } = await context.supabase.rpc("compute_forecast", {
      _clinic_id: DEMO_CLINIC_ID, _horizon: data.horizon,
    });
    if (error) throw new Error(error.message);
    return res as unknown as Forecast;
  });

export const getEfficiencyScore = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("compute_efficiency_score", { _clinic_id: DEMO_CLINIC_ID });
    if (error) throw new Error(error.message);
    return data as unknown as EfficiencyScore;
  });

export const getDoctorProductivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { days?: number } | undefined) => d ?? {})
  .handler(async ({ context, data }) => {
    const { data: res, error } = await context.supabase.rpc("compute_doctor_productivity", {
      _clinic_id: DEMO_CLINIC_ID, _doctor_id: context.userId, _days: data.days ?? 1,
    });
    if (error) throw new Error(error.message);
    return res as unknown as DoctorProductivity;
  });
