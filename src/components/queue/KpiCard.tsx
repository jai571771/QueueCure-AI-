import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Tone = "primary" | "success" | "warning" | "destructive" | "muted";

const toneClass: Record<Tone, string> = {
  primary: "from-primary/10 to-primary/0 text-primary",
  success: "from-success/15 to-success/0 text-success",
  warning: "from-warning/15 to-warning/0 text-warning",
  destructive: "from-destructive/15 to-destructive/0 text-destructive",
  muted: "from-muted to-transparent text-muted-foreground",
};

export function KpiCard({
  label, value, sub, tone = "primary", icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: Tone;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className={cn("relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm")}
    >
      <div className={cn("absolute inset-0 -z-0 bg-gradient-to-br opacity-60", toneClass[tone])} aria-hidden />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">{value}</p>
          {sub ? <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p> : null}
        </div>
        {Icon ? <Icon className={cn("h-5 w-5", toneClass[tone].split(" ").slice(-1)[0])} /> : null}
      </div>
    </motion.div>
  );
}
