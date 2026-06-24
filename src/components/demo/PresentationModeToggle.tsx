import { Presentation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePresentationMode } from "@/hooks/use-presentation-mode";

export function PresentationModeToggle() {
  const { on, toggle } = usePresentationMode();
  return (
    <Button
      variant={on ? "default" : "ghost"}
      size="sm"
      onClick={toggle}
      title={on ? "Exit presentation mode" : "Enter presentation mode"}
      aria-pressed={on}
    >
      <Presentation className="mr-1.5 h-4 w-4" />
      {on ? "Presenting" : "Present"}
    </Button>
  );
}
