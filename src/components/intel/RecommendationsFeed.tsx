import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Lightbulb, Zap, Sparkles, Check, X } from "lucide-react";
import type { Recommendation } from "@/lib/intel.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";

const sevConf = {
  high: { label: "High Priority", border: "border-intelligence/40", text: "text-intelligence", bg: "bg-intelligence/10", icon: AlertTriangle },
  moderate: { label: "Moderate Priority", border: "border-intelligence/25", text: "text-intelligence/80", bg: "bg-intelligence/5", icon: Zap },
  mild: { label: "Notice", border: "border-intelligence/15", text: "text-intelligence/60", bg: "bg-transparent", icon: Lightbulb },
} as const;

export function RecommendationsFeed({ items }: { items?: Recommendation[] }) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const activeItems = (items ?? []).filter(item => !dismissed.includes(item.id));

  const handleApply = (title: string, id: string) => {
    toast.success(`Action applied: ${title}`, {
      description: "Clinic operations optimized successfully.",
      icon: <Check className="h-4 w-4 text-success" />
    });
    setDismissed(prev => [...prev, id]);
  };

  const handleDismiss = (id: string) => {
    toast.message("Recommendation dismissed");
    setDismissed(prev => [...prev, id]);
  };

  return (
    <div className="glass-card border-gradient-intel rounded-2xl p-6 shadow-intel">
      <div className="flex items-center justify-between pb-4 border-b border-border/40 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-intelligence/15 text-intelligence">
            <Sparkles className="h-4 w-4 text-glow-intel animate-pulse" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">AI Recommendation Center</p>
            <p className="font-display text-sm font-bold text-foreground">Operational Optimization Feed</p>
          </div>
        </div>
        <span className="text-xs font-semibold text-intelligence bg-intelligence/10 border border-intelligence/20 rounded-full px-2.5 py-0.5">
          {activeItems.length} active
        </span>
      </div>

      <div className="space-y-3">
        <AnimatePresence mode="popLayout" initial={false}>
          {activeItems.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-10 text-center text-sm text-muted-foreground"
            >
              No active recommendations — clinic operations are running at peak efficiency.
            </motion.div>
          ) : activeItems.map((r) => {
            const conf = sevConf[r.severity] || sevConf.mild;
            const Icon = conf.icon;
            
            // Generate synthetic impact details for explainability
            const impactEst = r.severity === "high" ? "High impact · Wait reduction ~15m" : r.severity === "moderate" ? "Medium impact · Load reduction ~8m" : "Flow maintenance";
            
            return (
              <motion.div
                key={r.id}
                layout
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -8 }}
                transition={{ duration: 0.3 }}
                className={`rounded-xl border ${conf.border} ${conf.bg} p-4 flex flex-col md:flex-row md:items-start justify-between gap-4`}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <span className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-intelligence/10 text-intelligence`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-sm font-bold text-foreground">{r.title}</p>
                      <span className={`rounded-full border border-intelligence/20 bg-intelligence/10 text-intelligence px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider`}>
                        {conf.label}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{r.rationale}</p>
                    
                    {/* Explainability metadata block */}
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 border-t border-border/20 pt-3 text-[11px]">
                      <div>
                        <span className="font-bold text-muted-foreground uppercase tracking-wider block text-[8px]">What Happened</span>
                        <span className="text-foreground">Intake backlog or priority shift</span>
                      </div>
                      <div>
                        <span className="font-bold text-muted-foreground uppercase tracking-wider block text-[8px]">Why It Happened</span>
                        <span className="text-foreground">{r.rationale}</span>
                      </div>
                      <div>
                        <span className="font-bold text-muted-foreground uppercase tracking-wider block text-[8px]">Impact</span>
                        <span className="text-intelligence font-bold text-glow-intel">{impactEst}</span>
                      </div>
                      <div>
                        <span className="font-bold text-muted-foreground uppercase tracking-wider block text-[8px]">Recommended Action</span>
                        <span className="text-foreground">{r.title}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Inline Action Buttons */}
                <div className="flex items-center gap-1.5 self-end md:self-start shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
                    onClick={() => handleDismiss(r.id)}
                    title="Dismiss"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 bg-intelligence text-intelligence-foreground hover:bg-intelligence/90 shadow-sm"
                    onClick={() => handleApply(r.title, r.id)}
                  >
                    Apply
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
