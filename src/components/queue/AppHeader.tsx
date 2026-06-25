import { LogOut, Activity, Sparkles } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export function AppHeader({ role, name }: { role: string; name?: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Activity className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <span className="font-display text-base font-bold">QueueCure <span className="text-primary">AI+</span></span>
              <span className="ml-2 hidden text-[10px] uppercase tracking-widest text-primary sm:inline">
                Predictive Healthcare Operations
              </span>
            </div>
          </Link>
          <span className="hidden text-xs text-muted-foreground sm:inline">/ {role}</span>
        </div>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="font-medium"><Link to="/reception">Reception</Link></Button>
          <Button asChild variant="ghost" size="sm" className="font-medium"><Link to="/doctor">Doctor</Link></Button>
          <Button asChild variant="ghost" size="sm" className="font-medium"><Link to="/waiting-room">Waiting Room</Link></Button>
          <span className="mx-1 hidden h-4 w-px bg-border sm:block" />
          <Button asChild variant="ghost" size="sm" className="font-medium"><Link to="/insights/reception">Ops Insights</Link></Button>
          <Button asChild variant="ghost" size="sm" className="font-medium"><Link to="/insights/doctor">My Insights</Link></Button>
          <span className="mx-1 hidden h-4 w-px bg-border sm:block" />
          <Button asChild variant="outline" size="sm" className="border-gradient-intel shadow-intel bg-card hover:bg-muted font-bold text-xs">
            <Link to="/demo">
              <Sparkles className="mr-1.5 h-3.5 w-3.5 text-primary fill-primary animate-pulse-subtle" />
              Judge Demo
            </Link>
          </Button>
          <span className="mx-2 hidden h-5 w-px bg-border sm:block" />
          {name ? <span className="hidden text-xs text-muted-foreground sm:inline font-semibold">{name}</span> : null}
          <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out" className="text-muted-foreground hover:text-foreground"><LogOut className="h-4 w-4" /></Button>
        </nav>
      </div>
    </header>
  );
}
