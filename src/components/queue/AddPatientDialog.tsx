import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { addPatient } from "@/lib/queue.functions";
import { Plus } from "lucide-react";

const VISIT_TYPES = [
  { v: "general", l: "General" },
  { v: "follow_up", l: "Follow-up" },
  { v: "prescription", l: "Prescription" },
  { v: "lab_review", l: "Lab Review" },
  { v: "vaccination", l: "Vaccination" },
  { v: "emergency", l: "Emergency" },
] as const;

export function AddPatientDialog({ onAdded }: { onAdded?: () => void }) {
  const add = useServerFn(addPatient);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [visit, setVisit] = useState<(typeof VISIT_TYPES)[number]["v"]>("general");
  const [emergency, setEmergency] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const priority = emergency || visit === "emergency" ? "emergency" : "normal";
      await add({ data: {
        patientName: name.trim(),
        age: age ? Number(age) : null,
        phone: phone || null,
        visitType: visit,
        priority,
        notes: null,
      }});
      toast.success(`Patient added${priority === "emergency" ? " (Emergency)" : ""}`);
      setName(""); setAge(""); setPhone(""); setVisit("general"); setEmergency(false);
      setOpen(false);
      onAdded?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add patient");
    } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg"><Plus className="mr-1.5 h-4 w-4" /> Add patient</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Register new patient</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="pname">Full name</Label>
              <Input id="pname" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="page">Age</Label>
              <Input id="page" type="number" min={0} max={130} value={age} onChange={(e) => setAge(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pphone">Phone</Label>
              <Input id="pphone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Visit type</Label>
              <Select value={visit} onValueChange={(v) => setVisit(v as typeof visit)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VISIT_TYPES.map((vt) => <SelectItem key={vt.v} value={vt.v}>{vt.l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2">
              <div>
                <p className="text-sm font-medium">Mark as emergency</p>
                <p className="text-xs text-muted-foreground">Jumps to the front of the queue</p>
              </div>
              <Switch checked={emergency} onCheckedChange={setEmergency} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={busy || !name.trim()}>{busy ? "Adding…" : "Add to queue"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
