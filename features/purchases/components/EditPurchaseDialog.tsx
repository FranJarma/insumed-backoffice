"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePurchase } from "../actions";
import { createPurchaseSchema, PAYMENT_METHODS, type CreatePurchaseInput } from "../types";
import type { MockProvider } from "@/db/mock-store";
import { ProviderAutocomplete } from "./ProviderAutocomplete";

type PurchaseRow = {
  id: string;
  provider: string;
  invoiceNumber: string;
  date: string;
  amount: string;
  paymentMethod: string | null;
  remito: string | null;
  category: "PROVEEDOR" | "VARIOS";
};

interface EditPurchaseDialogProps {
  purchase: PurchaseRow | null;
  providers: MockProvider[];
  onOpenChange: (open: boolean) => void;
}

export function EditPurchaseDialog({ purchase, providers, onOpenChange }: EditPurchaseDialogProps) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreatePurchaseInput>({
    resolver: zodResolver(createPurchaseSchema),
    values: purchase
      ? {
          provider: purchase.provider,
          invoiceNumber: purchase.invoiceNumber,
          date: purchase.date,
          amount: purchase.amount,
          paymentMethod: purchase.paymentMethod ?? "",
          remito: purchase.remito ?? "",
          category: purchase.category,
        }
      : undefined,
  });

  const providerValue = watch("provider") ?? "";

  const onSubmit = async (data: CreatePurchaseInput) => {
    if (!purchase) return;
    const result = await updatePurchase(purchase.id, data);
    if ("success" in result) {
      onOpenChange(false);
      router.refresh();
    }
  };

  return (
    <Dialog open={!!purchase} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Compra</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>
              Proveedor / Comercio <span className="text-destructive">*</span>
            </Label>
            <ProviderAutocomplete
              providers={providers}
              value={providerValue}
              onChange={(v) => setValue("provider", v, { shouldValidate: true })}
              error={errors.provider?.message}
            />
            {errors.provider && (
              <p className="text-xs text-destructive">{errors.provider.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-invoiceNumber">Nº Factura / Ticket</Label>
              <Input id="edit-invoiceNumber" {...register("invoiceNumber")} />
              {errors.invoiceNumber && (
                <p className="text-xs text-destructive">{errors.invoiceNumber.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-date">Fecha</Label>
              <Input id="edit-date" type="date" {...register("date")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-amount">Monto ($)</Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                min="0"
                {...register("amount")}
              />
              {errors.amount && (
                <p className="text-xs text-destructive">{errors.amount.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-paymentMethod">Medio de Pago</Label>
              <select
                id="edit-paymentMethod"
                {...register("paymentMethod")}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Sin especificar</option>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-remito">Nº Remito</Label>
            <Input id="edit-remito" {...register("remito")} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
