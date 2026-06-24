import { AlertTriangle, Info, Lightbulb, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";

export type ExplainSeverity = "info" | "mild" | "moderate" | "high";

const STYLES: Record<ExplainSeverity, { ring: string; bg: string; chip: string; label: string }> = {
  info: { ring: "border-border", bg: "bg-card", chip: "bg-muted text-foreground", label: "Insight" },
  mild: { ring: "border-primary/30", bg: "bg-primary/5", chip: "bg-primary/10 text-primary", label: "Notice" },
  moderate: { ring: "border-warning/40", bg: "bg-warning/5", chip: "bg-warning/15 text-warning", label: "Watch" },
  high: { ring: "border-destructive/40", bg: "bg-destructive/5", chip: "bg-destructive/15 text-destructive", label: "Act now" },
};

export function ExplainCard(props: {
  what: string;
  why: string;
  impact: string;
  action: string;
  severity?: ExplainSeverity;
  title?: string;
  eyebrow?: string;
  right?: ReactNode;
  compact?: boolean;
}) {
  const s = STYLES[props.severity ?? "info"];
  return (
    <div className={`rounded-2xl border ${s.ring} ${s.bg} p-4 shadow-sm`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {props.eyebrow ? (
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {props.eyebrow}
            </p>
          ) : null}
          {props.title ? <p className="font-display text-base font-bold leading-tight">{props.title}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${s.chip}`}>
            {s.label}
          </span>
          {props.right}
        </div>
      </div>

      <dl className={`mt-3 grid gap-2 ${props.compact ? "" : "sm:grid-cols-2"}`}>
        <Row icon={Info} label="What" value={props.what} />
        <Row icon={Lightbulb} label="Why" value={props.why} />
        <Row icon={TrendingUp} label="Impact" value={props.impact} />
        <Row icon={AlertTriangle} label="Next" value={props.action} />
      </dl>
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
        <dd className="text-sm text-foreground">{value}</dd>
      </div>
    </div>
  );
}
