import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Lightbulb, Zap } from "lucide-react";
import type { Recommendation } from "@/lib/intel.functions";

const sevConf = {
  high: { icon: AlertTriangle, ring: "border-destructive/40 bg-destructive/5", chip: "bg-destructive/15 text-destructive" },
  moderate: { icon: Zap, ring: "border-warning/40 bg-warning/5", chip: "bg-warning/15 text-warning" },
  mild: { icon: Lightbulb, ring: "border-primary/30 bg-primary/5", chip: "bg-primary/15 text-primary" },
} as const;

export function RecommendationsFeed({ items }: { items?: Recommendation[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h2 className="font-display text-lg font-semibold">Operational Recommendations</h2>
        <span className="text-xs text-muted-foreground">{items?.length ?? 0} active</span>
      </div>
      <ul className="divide-y divide-border">
        <AnimatePresence initial={false}>
          {!items || items.length === 0 ? (
            <li className="px-5 py-10 text-center text-sm text-muted-foreground">
              No recommendations right now — operations look healthy.
            </li>
          ) : items.map((r) => {
            const conf = sevConf[r.severity];
            const Icon = conf.icon;
            return (
              <motion.li key={r.id} layout
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="px-5 py-4">
                <div className={`flex items-start gap-3 rounded-xl border p-3 ${conf.ring}`}>
                  <span className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${conf.chip}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{r.title}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${conf.chip}`}>
                        {r.severity}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{r.rationale}</p>
                  </div>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </div>
  );
}
