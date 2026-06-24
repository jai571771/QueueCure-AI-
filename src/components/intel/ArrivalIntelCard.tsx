import { motion } from "framer-motion";
import { Users, MapPin } from "lucide-react";

type Intel = {
  crowd_level: "low" | "moderate" | "high";
  crowd_label: string;
  waiting_now: number;
  minutes_until_recommended_arrival: number;
  expected_queue_length_at_arrival: number;
  confidence_basis_samples: number;
};

const crowdTone = {
  low: { dot: "bg-success", text: "text-success", ring: "ring-success/30", emoji: "🟢" },
  moderate: { dot: "bg-warning", text: "text-warning", ring: "ring-warning/30", emoji: "🟡" },
  high: { dot: "bg-destructive", text: "text-destructive", ring: "ring-destructive/30", emoji: "🔴" },
} as const;

export function ArrivalIntelCard({ intel, sampleCount }: { intel: Intel; sampleCount: number }) {
  const c = crowdTone[intel.crowd_level];
  const confLabel = sampleCount >= 20 ? "high confidence" : sampleCount >= 5 ? "medium confidence" : "low confidence";
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Patient Arrival Intelligence</p>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${c.ring} ${c.text}`}>
          <span className={`h-2 w-2 rounded-full ${c.dot}`} /> {c.emoji} {intel.crowd_label}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Stat icon={MapPin} label="In about" value={`${intel.minutes_until_recommended_arrival}m`} sub="best arrival time" highlight />
        <Stat icon={Users} label="Queue at arrival" value={String(intel.expected_queue_length_at_arrival)} sub={`${intel.waiting_now} waiting now`} />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Recommendation based on <span className="font-medium text-foreground">{sampleCount} similar consultations</span> · {confLabel}.
      </p>
    </motion.div>
  );
}

function Stat({ icon: Icon, label, value, sub, highlight }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${highlight ? "border-secondary/40 bg-secondary/10" : "border-border bg-background"}`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <p className="mt-1 font-display text-2xl font-bold">{value}</p>
      {sub ? <p className="text-[10px] text-muted-foreground">{sub}</p> : null}
    </div>
  );
}
