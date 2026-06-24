import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

const input = z.object({ token: z.coerce.number().int().positive() });

export const getPublicTracking = createServerFn({ method: "GET" })
  .inputValidator((i: z.infer<typeof input>) => input.parse(i))
  .handler(async ({ data }) => {
    const { data: row, error } = await publicClient().rpc("get_public_tracking", {
      _clinic_slug: "demo", _token: data.token,
    });
    if (error) throw new Error(error.message);
    return row;
  });

export const getEtaHistory = createServerFn({ method: "GET" })
  .inputValidator((i: z.infer<typeof input>) => input.parse(i))
  .handler(async ({ data }) => {
    const { data: row, error } = await publicClient().rpc("get_public_eta_history", {
      _clinic_slug: "demo", _token: data.token,
    });
    if (error) throw new Error(error.message);
    return row;
  });
