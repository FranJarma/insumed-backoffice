"use client";

import { useState } from "react";
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
import { updateSale } from "../actions";
import { createSaleSchema, type CreateSaleInput } from "../types";
import type { Client } from "@/db/schema";
import { ClientAutocomplete } from "./ClientAutocomplete";

type PatientOption = { id: string; name: string; clientId: string };

type SaleRow = {
  id: string;
  clientId: string;
  invoiceType: "A" | "B";
  invoiceNumber: string;
  date: string;
  oc: string | null;
  patient: string | null;
  amount: string;
};

interface EditSaleDialogProps {
  sale: SaleRow | null;
  clients: Client[];
  patients: PatientOption[];
  onOpenChange: (open: boolean) => void;
}

const INVOICE_TYPES = [
  { value: "A", label: "Factura A" },
  { value: "B", label: "Factura B" },
] as const;

export function EditSaleDialog({ sale, clients, patients, onOpenChange }: EditSaleDialogProps) {
  const router = useRouter();
  const [localClientId, setLocalClientId] = useState<string>(sale?.clientId ?? "");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateSaleInput>({
    resolver: zodResolver(createSaleSchema),
    values: sale
      ? {
          clientId: sale.clientId,
          invoiceType: sale.invoiceType,
          invoiceNumber: sale.invoiceNumber,
          date: sale.date,
          oc: sale.oc ?? "",
          patient: sale.patient ?? "",
          amount: sale.amount,
        }
      : undefined,
  });

  const clientId = watch("clientId");
  const invoiceType = watch("invoiceType");

  const handleClientChange = (id: string) => {
    setLocalClientId(id);
    setValue("clientId", id, { shouldValidate: true });
    setValue("patient", "");
  };

  const onSubmit = async (data: CreateSaleInput) => {
    if (!sale) return;
    const result = await updateSale(sale.id, data);
    if ("success" in result) {
      onOpenChange(false);
      router.refresh();
    }
  };

  return (
    <Dialog open={!!sale} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Venta</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Cliente */}
          <div className="space-y-1.5">
            <Label>
              Cliente <span className="text-destructive">*</span>
            </Label>
            <ClientAutocomplete
              clients={clients}
              value={clientId ?? ""}
              onChange={handleClientChange}
              error={errors.clientId?.message}
            />
            {errors.clientId && (
              <p className="text-xs text-destructive">{errors.clientId.message}</p>
            )}
          </div>

          {/* Tipo de Factura */}
          <div className="space-y-1.5">
            <Label>
              Tipo de Factura <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
              {INVOICE_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setValue("invoiceType", t.value, { shouldValidate: true })}
                  className={`flex-1 rounded-md border py-2 text-sm font-medium transition-colors ${
                    invoiceType === t.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Nº Factura + Fecha */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-invoiceNumber">
                Nº Factura <span className="text-destructive">*</span>
              </Label>
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

          {/* OC + Paciente */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-oc">
                OC <span className="text-muted-foreground text-xs">(opcional)</span>
              </Label>
              <Input id="edit-oc" {...register("oc")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-patient">
                Paciente <span className="text-muted-foreground text-xs">(opcional)</span>
              </Label>
              <select
                id="edit-patient"
                {...register("patient")}
                disabled={!clientId}
                className="w-full rounded-md border bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">
                  {clientId ? "Seleccionar paciente..." : "Seleccione un cliente primero"}
                </option>
                {patients
                  .filter((p) => p.clientId === (clientId || localClientId))
                  .map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Monto */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-amount">
              Monto ($) <span className="text-destructive">*</span>
            </Label>
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
