import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const map = {
  high: { label: "High Confidence", dot: "bg-success", text: "text-success", ring: "ring-success/30" },
  medium: { label: "Medium Confidence", dot: "bg-warning", text: "text-warning", ring: "ring-warning/30" },
  low: { label: "Low Confidence", dot: "bg-destructive", text: "text-destructive", ring: "ring-destructive/30" },
} as const;

export function ConfidenceChip({ tier, sampleCount }: { tier: "high" | "medium" | "low"; sampleCount: number }) {
  const s = map[tier];
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${s.ring} ${s.text}`}>
            <span className={`h-2 w-2 rounded-full ${s.dot}`} /> {s.label}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          Based on {sampleCount} similar consultation{sampleCount === 1 ? "" : "s"}.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
