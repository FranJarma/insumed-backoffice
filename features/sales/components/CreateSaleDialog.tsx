"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { PlusCircle, ImagePlus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSale } from "../actions";
import { createSaleSchema, type CreateSaleInput } from "../types";
import type { Client } from "@/db/schema";
import { ClientAutocomplete } from "./ClientAutocomplete";

interface CreateSaleDialogProps {
  clients: Client[];
}

const INVOICE_TYPES = [
  { value: "A", label: "Factura A" },
  { value: "B", label: "Factura B" },
] as const;

export function CreateSaleDialog({ clients }: CreateSaleDialogProps) {
  const [open, setOpen] = useState(false);
  const [invoiceDataUrl, setInvoiceDataUrl] = useState<string | undefined>();
  const [invoicePhotoError, setInvoicePhotoError] = useState<string | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const defaultValues: Partial<CreateSaleInput> = {
    date: new Date().toISOString().split("T")[0],
    invoiceType: "A",
  };

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateSaleInput>({
    resolver: zodResolver(createSaleSchema),
    defaultValues,
  });

  const clientId = watch("clientId");
  const invoiceType = watch("invoiceType");

  const handleInvoicePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setInvoicePhotoError(undefined);
    if (!file) { setInvoiceDataUrl(undefined); return; }
    if (file.size > 5 * 1024 * 1024) {
      setInvoicePhotoError("La imagen no puede superar 5 MB");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setInvoiceDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const clearPhoto = () => {
    setInvoiceDataUrl(undefined);
    setInvoicePhotoError(undefined);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = async (data: CreateSaleInput) => {
    const result = await createSale({ ...data, documentUrl: invoiceDataUrl });
    if ("success" in result) {
      setOpen(false);
      reset(defaultValues);
      clearPhoto();
      router.refresh();
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      reset(defaultValues);
      clearPhoto();
    }
    setOpen(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="h-4 w-4" />
          Nueva Venta
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar Venta</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Cliente */}
          <div className="space-y-1.5">
            <Label>Cliente <span className="text-destructive">*</span></Label>
            <ClientAutocomplete
              clients={clients}
              value={clientId ?? ""}
              onChange={(id) => setValue("clientId", id, { shouldValidate: true })}
              error={errors.clientId?.message}
            />
            {errors.clientId && (
              <p className="text-xs text-destructive">{errors.clientId.message}</p>
            )}
          </div>

          {/* Tipo de Factura */}
          <div className="space-y-1.5">
            <Label>Tipo de Factura <span className="text-destructive">*</span></Label>
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
              <Label htmlFor="invoiceNumber">Nº Factura <span className="text-destructive">*</span></Label>
              <Input
                id="invoiceNumber"
                {...register("invoiceNumber")}
                placeholder="00001"
              />
              {errors.invoiceNumber && (
                <p className="text-xs text-destructive">{errors.invoiceNumber.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date">Fecha</Label>
              <Input id="date" type="date" {...register("date")} />
              {errors.date && (
                <p className="text-xs text-destructive">{errors.date.message}</p>
              )}
            </div>
          </div>

          {/* OC + Paciente */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="oc">
                OC <span className="text-muted-foreground text-xs">(opcional)</span>
              </Label>
              <Input id="oc" {...register("oc")} placeholder="OC-2025-001" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="patient">
                Paciente <span className="text-muted-foreground text-xs">(opcional)</span>
              </Label>
              <Input id="patient" {...register("patient")} placeholder="García, Juan" />
            </div>
          </div>

          {/* Monto */}
          <div className="space-y-1.5">
            <Label htmlFor="amount">Monto ($) <span className="text-destructive">*</span></Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              {...register("amount")}
              placeholder="150000.00"
            />
            {errors.amount && (
              <p className="text-xs text-destructive">{errors.amount.message}</p>
            )}
          </div>

          {/* Foto de la factura */}
          <div className="space-y-1.5">
            <Label>Foto de la factura <span className="text-muted-foreground text-xs">(opcional)</span></Label>
            {invoiceDataUrl ? (
              <div className="relative w-full overflow-hidden rounded-md border">
                <img
                  src={invoiceDataUrl}
                  alt="Foto de la factura"
                  className="max-h-40 w-full object-contain bg-muted"
                />
                <button
                  type="button"
                  onClick={clearPhoto}
                  className="absolute right-1 top-1 rounded-full bg-background/80 p-1 hover:bg-background"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-3 text-sm text-muted-foreground hover:bg-muted/50 transition-colors">
                <ImagePlus className="h-4 w-4 shrink-0" />
                <span>Seleccionar imagen (JPG, PNG — máx. 5 MB)</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleInvoicePhoto}
                />
              </label>
            )}
            {invoicePhotoError && <p className="text-xs text-destructive">{invoicePhotoError}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar Venta"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
