"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { revertSaleInvoice } from "../actions";

interface RevertSaleInvoiceDialogProps {
  saleId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function RevertSaleInvoiceDialog({
  saleId,
  open,
  onOpenChange,
  onSuccess,
}: RevertSaleInvoiceDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!saleId) return;

    setIsSubmitting(true);
    setError(null);
    const result = await revertSaleInvoice(saleId);
    setIsSubmitting(false);

    if (result?.error) {
      const formError = "_form" in result.error ? result.error._form?.[0] : undefined;
      setError(formError ?? "No se pudo revertir la factura");
      return;
    }

    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-blue-700" />
            Revertir factura
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Se borraran el numero, la fecha y el comprobante de factura. Los pagos registrados se conservan.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isSubmitting || !saleId}>
            {isSubmitting ? "Revirtiendo..." : "Revertir factura"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
