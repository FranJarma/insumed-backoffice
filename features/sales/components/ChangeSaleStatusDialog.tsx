"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { ArrowRightLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changeSaleStatus } from "../actions";

type SaleStatus = "PENDING_INVOICE" | "PENDING" | "INVOICED" | "PAID" | "INVOICED_PAID" | "CANCELLED";
type ChangeableSaleStatus = "PENDING_INVOICE" | "PAID" | "INVOICED" | "INVOICED_PAID";

type SaleForStatusChange = {
  id: string;
  status: SaleStatus;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  paymentDate: string | null;
};

interface ChangeSaleStatusDialogProps {
  sale: SaleForStatusChange | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const STATUS_LABELS: Record<ChangeableSaleStatus, string> = {
  PENDING_INVOICE: "Pend. Facturar",
  PAID: "Pagada",
  INVOICED: "Facturada",
  INVOICED_PAID: "Facturada y Pagada",
};

const today = () => new Date().toISOString().split("T")[0];

function normalizeStatus(status: SaleStatus | undefined): ChangeableSaleStatus {
  if (status === "PAID" || status === "INVOICED" || status === "INVOICED_PAID") return status;
  if (status === "PENDING") return "INVOICED";
  return "PENDING_INVOICE";
}

function getStatusConsequence(status: ChangeableSaleStatus) {
  if (status === "PENDING_INVOICE") {
    return "Se eliminaran numero, fecha y comprobante de factura, y tambien la fecha de pago.";
  }
  if (status === "PAID") {
    return "Se registrara la fecha de pago y se eliminaran los datos de factura.";
  }
  if (status === "INVOICED") {
    return "Se registraran numero y fecha de factura. Si tenia pago cargado, se eliminara la fecha de pago.";
  }
  return "Se registraran los datos de factura y la fecha de pago.";
}

export function ChangeSaleStatusDialog({
  sale,
  open,
  onOpenChange,
  onSuccess,
}: ChangeSaleStatusDialogProps) {
  const [targetStatus, setTargetStatus] = useState<ChangeableSaleStatus>("PENDING_INVOICE");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(today());
  const [paymentDate, setPaymentDate] = useState(today());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  useEffect(() => {
    if (!open || !sale) return;

    setTargetStatus(normalizeStatus(sale.status));
    setInvoiceNumber(sale.invoiceNumber ?? "");
    setInvoiceDate(sale.invoiceDate ?? today());
    setPaymentDate(sale.paymentDate ?? today());
    setErrors({});
  }, [open, sale]);

  const requiresInvoice = targetStatus === "INVOICED" || targetStatus === "INVOICED_PAID";
  const requiresPayment = targetStatus === "PAID" || targetStatus === "INVOICED_PAID";
  const currentStatus = normalizeStatus(sale?.status);
  const isCurrentStatusSelected = targetStatus === currentStatus;
  const consequence = useMemo(() => getStatusConsequence(targetStatus), [targetStatus]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!sale) return;
    if (isCurrentStatusSelected) {
      setErrors({ _form: "Elegí un estado distinto al actual para confirmar el cambio." });
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    const result = await changeSaleStatus(sale.id, {
      targetStatus,
      invoiceNumber,
      invoiceDate,
      paymentDate,
    });

    setIsSubmitting(false);

    if (result?.error) {
      setErrors({
        _form: "_form" in result.error ? result.error._form?.[0] : undefined,
        invoiceNumber: "invoiceNumber" in result.error ? result.error.invoiceNumber?.[0] : undefined,
        invoiceDate: "invoiceDate" in result.error ? result.error.invoiceDate?.[0] : undefined,
        paymentDate: "paymentDate" in result.error ? result.error.paymentDate?.[0] : undefined,
      });
      return;
    }

    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Cambiar estado
          </DialogTitle>
          <DialogDescription>
            Elegi el nuevo estado de la venta. Antes de confirmar, revisa la aclaracion para saber que datos se conservaran o limpiaran.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            {(Object.keys(STATUS_LABELS) as ChangeableSaleStatus[]).map((status) => {
              const isCurrent = status === currentStatus;
              return (
                <label
                  key={status}
                  className={`cursor-pointer rounded-lg border p-3 text-sm transition-colors ${
                    isCurrent
                      ? "cursor-not-allowed bg-muted/40 text-muted-foreground opacity-60"
                      : targetStatus === status
                      ? "border-primary bg-primary/10 text-primary"
                      : "hover:bg-muted/60"
                  }`}
                >
                  <input
                    type="radio"
                    name="targetStatus"
                    value={status}
                    checked={targetStatus === status}
                    onChange={() => setTargetStatus(status)}
                    disabled={isCurrent}
                    className="sr-only"
                  />
                  <span className="font-medium">{STATUS_LABELS[status]}</span>
                  {isCurrent && <span className="mt-1 block text-xs">Estado actual</span>}
                </label>
              );
            })}
          </div>

          <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
            {consequence}
          </div>

          {requiresInvoice && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="change-invoice-number">
                  Nro Factura <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="change-invoice-number"
                  value={invoiceNumber}
                  onChange={(event) => setInvoiceNumber(event.target.value)}
                  placeholder="00001-00000001"
                />
                {errors.invoiceNumber && <p className="text-xs text-destructive">{errors.invoiceNumber}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="change-invoice-date">
                  Fecha de facturacion <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="change-invoice-date"
                  type="date"
                  value={invoiceDate}
                  onChange={(event) => setInvoiceDate(event.target.value)}
                />
                {errors.invoiceDate && <p className="text-xs text-destructive">{errors.invoiceDate}</p>}
              </div>
            </div>
          )}

          {requiresPayment && (
            <div className="space-y-1.5">
              <Label htmlFor="change-payment-date">
                Fecha de pago <span className="text-destructive">*</span>
              </Label>
              <Input
                id="change-payment-date"
                type="date"
                value={paymentDate}
                onChange={(event) => setPaymentDate(event.target.value)}
              />
              {errors.paymentDate && <p className="text-xs text-destructive">{errors.paymentDate}</p>}
            </div>
          )}

          {errors._form && <p className="text-sm text-destructive">{errors._form}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !sale || sale.status === "CANCELLED" || isCurrentStatusSelected}>
              {isSubmitting ? "Guardando..." : "Confirmar cambio"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
