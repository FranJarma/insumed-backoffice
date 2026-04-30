"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { CircleDollarSign, Trash2 } from "lucide-react";
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
import { createSalePayment, deleteSalePayment } from "../actions";
import { formatCurrency, formatDate } from "@/lib/utils";

type SalePayment = {
  id: string;
  amount: string;
  paymentDate: string;
  paymentMethod: string | null;
  reference: string | null;
  notes: string | null;
};

type SaleForPayments = {
  id: string;
  amount: string;
  paidAmount?: string;
  balance?: string;
  payments?: SalePayment[];
  status: string;
};

interface SalePaymentsDialogProps {
  sale: SaleForPayments | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const PAYMENT_METHODS = ["TRANSFERENCIA", "CHEQUE", "EFECTIVO", "TARJETA", "OTRO"];

const today = () => new Date().toISOString().split("T")[0];

export function SalePaymentsDialog({ sale, open, onOpenChange, onSuccess }: SalePaymentsDialogProps) {
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(today());
  const [paymentMethod, setPaymentMethod] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [visiblePayments, setVisiblePayments] = useState<SalePayment[]>([]);

  useEffect(() => {
    if (!open) return;
    setVisiblePayments(sale?.payments ?? []);
  }, [open, sale]);

  const resetForm = () => {
    setAmount("");
    setPaymentDate(today());
    setPaymentMethod("");
    setReference("");
    setNotes("");
    setErrors({});
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!sale) return;

    setIsSubmitting(true);
    setErrors({});
    const result = await createSalePayment(sale.id, {
      amount,
      paymentDate,
      paymentMethod,
      reference,
      notes,
    });
    setIsSubmitting(false);

    if (result?.error) {
      setErrors({
        _form: "_form" in result.error ? result.error._form?.[0] : undefined,
        amount: "amount" in result.error ? result.error.amount?.[0] : undefined,
        paymentDate: "paymentDate" in result.error ? result.error.paymentDate?.[0] : undefined,
      });
      return;
    }

    resetForm();
    handleOpenChange(false);
    onSuccess();
  };

  const handleDelete = async (paymentId: string) => {
    setDeletingId(paymentId);
    await deleteSalePayment(paymentId);
    setVisiblePayments((current) => current.filter((payment) => payment.id !== paymentId));
    setDeletingId(null);
    onSuccess();
  };

  const payments = visiblePayments;
  const balance = parseFloat(sale?.balance ?? sale?.amount ?? "0");
  const canAddPayment = !!sale && sale.status !== "CANCELLED" && balance > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CircleDollarSign className="h-5 w-5 text-green-700" />
            Pagos de la venta
          </DialogTitle>
          <DialogDescription>
            Registrá pagos parciales o totales. El estado de pago se recalcula según el total abonado.
          </DialogDescription>
        </DialogHeader>

        {sale && (
          <div className="grid gap-3 rounded-md border bg-muted/20 p-3 text-sm sm:grid-cols-3">
            <div>
              <span className="block text-muted-foreground">Total</span>
              <strong>{formatCurrency(sale.amount)}</strong>
            </div>
            <div>
              <span className="block text-muted-foreground">Pagado</span>
              <strong className="text-green-700">{formatCurrency(sale.paidAmount ?? "0")}</strong>
            </div>
            <div>
              <span className="block text-muted-foreground">Saldo</span>
              <strong className="text-orange-700">{formatCurrency(sale.balance ?? sale.amount)}</strong>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Pagos registrados</h3>
          {payments.length === 0 ? (
            <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">Todavía no hay pagos registrados.</p>
          ) : (
            <div className="space-y-2">
              {payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
                  <div>
                    <div className="font-semibold">{formatCurrency(payment.amount)}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(payment.paymentDate)}
                      {payment.paymentMethod ? ` · ${payment.paymentMethod}` : ""}
                      {payment.reference ? ` · ${payment.reference}` : ""}
                    </div>
                    {payment.notes && <div className="mt-1 text-xs text-muted-foreground">{payment.notes}</div>}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(payment.id)}
                    disabled={deletingId === payment.id}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {canAddPayment && (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-md border p-4">
            <h3 className="text-sm font-semibold">Agregar pago</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="sale-payment-amount">Monto <span className="text-destructive">*</span></Label>
                <Input
                  id="sale-payment-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder={sale?.balance ?? "0.00"}
                />
                {errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sale-payment-date">Fecha <span className="text-destructive">*</span></Label>
                <Input
                  id="sale-payment-date"
                  type="date"
                  value={paymentDate}
                  onChange={(event) => setPaymentDate(event.target.value)}
                />
                {errors.paymentDate && <p className="text-xs text-destructive">{errors.paymentDate}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sale-payment-method">Medio</Label>
                <select
                  id="sale-payment-method"
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Sin especificar</option>
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>{method}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sale-payment-reference">Referencia</Label>
                <Input
                  id="sale-payment-reference"
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  placeholder="Nro transferencia, cheque, etc."
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sale-payment-notes">Notas</Label>
              <Input
                id="sale-payment-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Observaciones internas"
              />
            </div>
            {errors._form && <p className="text-sm text-destructive">{errors._form}</p>}
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Guardando..." : "Agregar pago"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
