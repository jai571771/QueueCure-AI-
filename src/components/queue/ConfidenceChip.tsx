import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const map = {
  high: {
    label: "High Confidence",
    dot: "bg-intelligence shadow-[0_0_6px_var(--intelligence)]",
    text: "text-intelligence border-intelligence/30 bg-intelligence/10",
  },
  medium: {
    label: "Medium Confidence",
    dot: "bg-intelligence/60",
    text: "text-intelligence/80 border-intelligence/20 bg-intelligence/5",
  },
  low: {
    label: "Low Confidence",
    dot: "bg-intelligence/30",
    text: "text-intelligence/60 border-intelligence/10 bg-transparent",
  },
} as const;

export function ConfidenceChip({ tier, sampleCount }: { tier: "high" | "medium" | "low"; sampleCount: number }) {
  const s = map[tier];
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${s.text}`}>
            <span className={`h-2.5 w-2.5 rounded-full ${s.dot} transition-all`} /> {s.label}
          </span>
        </TooltipTrigger>
        <TooltipContent className="border-intelligence-border bg-card text-foreground">
          Based on {sampleCount} similar consultation{sampleCount === 1 ? "" : "s"}.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

