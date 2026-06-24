import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const DEMO_CLINIC_ID = "11111111-1111-1111-1111-111111111111";

export function useRealtimeQueue(onAudit?: (row: Record<string, unknown>) => void) {
  const qc = useQueryClient();
  useEffect(() => {
    const ch = supabase
      .channel(`clinic:${DEMO_CLINIC_ID}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "queue_patients", filter: `clinic_id=eq.${DEMO_CLINIC_ID}` },
        () => {
          qc.invalidateQueries({ queryKey: ["queue"] });
          qc.invalidateQueries({ queryKey: ["intel"] });
        })
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "queue_audit_log", filter: `clinic_id=eq.${DEMO_CLINIC_ID}` },
        (payload) => {
          qc.invalidateQueries({ queryKey: ["intel"] });
          if (onAudit) onAudit(payload.new as Record<string, unknown>);
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc, onAudit]);
}
