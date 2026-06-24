import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Printer, QrCode as QrIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function QrCodeDialog({ token, clinicSlug = "demo", patientName, trigger }: {
  token: number; clinicSlug?: string; patientName?: string; trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const url = typeof window !== "undefined"
    ? `${window.location.origin}/track/${token}`
    : `/track/${token}`;
  const [dataUrl, setDataUrl] = useState<string>("");
  const printRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    QRCode.toDataURL(url, { width: 320, margin: 1 }).then(setDataUrl).catch(() => setDataUrl(""));
  }, [open, url]);

  function print() {
    if (!printRef.current) return;
    const w = window.open("", "qr_slip", "width=420,height=600");
    if (!w) return;
    w.document.write(`<html><head><title>Token #${token}</title>
      <style>body{font-family:system-ui;text-align:center;padding:24px;}h1{font-size:48px;margin:8px 0;}p{margin:4px 0;color:#555}</style>
      </head><body>${printRef.current.innerHTML}</body></html>`);
    w.document.close(); w.focus(); w.print(); w.close();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="icon" aria-label="Show QR for tracking">
            <QrIcon className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Patient tracking QR</DialogTitle>
        </DialogHeader>
        <div ref={printRef} className="rounded-2xl border border-border bg-card p-5 text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">QueueCure AI+</p>
          <h1 className="font-display text-4xl font-extrabold leading-none mt-1">#{token}</h1>
          {patientName ? <p className="mt-1 text-sm text-muted-foreground">{patientName}</p> : null}
          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={dataUrl} alt={`QR for token ${token}`} className="mx-auto my-3 h-56 w-56" />
          ) : (
            <div className="mx-auto my-3 grid h-56 w-56 place-items-center text-xs text-muted-foreground">Generating…</div>
          )}
          <p className="text-[11px] text-muted-foreground break-all">{url}</p>
          <p className="mt-2 text-xs text-muted-foreground">Scan to track your live position, ETA, and recommended arrival.</p>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={print}><Printer className="mr-2 h-4 w-4" /> Print slip</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
