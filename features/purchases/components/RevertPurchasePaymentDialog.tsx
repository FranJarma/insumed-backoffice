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
import { revertPurchasePayment } from "../actions";

interface RevertPurchasePaymentDialogProps {
  purchaseId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function RevertPurchasePaymentDialog({
  purchaseId,
  open,
  onOpenChange,
  onSuccess,
}: RevertPurchasePaymentDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!purchaseId) return;

    setIsSubmitting(true);
    setError(null);
    const result = await revertPurchasePayment(purchaseId);
    setIsSubmitting(false);

    if (result?.error) {
      const formError = "_form" in result.error ? result.error._form?.[0] : undefined;
      setError(formError ?? "No se pudo revertir el pago");
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
            Revertir pago
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          La compra volvera a quedar pendiente. Se conservan el proveedor, comprobante, remito, monto y medio de pago.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isSubmitting || !purchaseId}>
            {isSubmitting ? "Revirtiendo..." : "Revertir pago"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
