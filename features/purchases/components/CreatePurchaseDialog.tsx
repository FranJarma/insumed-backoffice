"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { PlusCircle, ImagePlus, X } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPurchase } from "../actions";
import { createPurchaseSchema, PAYMENT_METHODS, type CreatePurchaseInput } from "../types";
import type { MockProvider } from "@/db/mock-store";
import { ProviderAutocomplete } from "./ProviderAutocomplete";

interface CreatePurchaseDialogProps {
  providers: MockProvider[];
  category?: "PROVEEDOR" | "VARIOS";
}

export function CreatePurchaseDialog({ providers, category = "PROVEEDOR" }: CreatePurchaseDialogProps) {
  const [open, setOpen] = useState(false);
  const [remitoDataUrl, setRemitoDataUrl] = useState<string | undefined>();
  const [remitoError, setRemitoError] = useState<string | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const defaultValues = { date: new Date().toISOString().split("T")[0], category };

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreatePurchaseInput>({
    resolver: zodResolver(createPurchaseSchema),
    defaultValues,
  });

  const providerValue = watch("provider") ?? "";

  const handleRemitoPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setRemitoError(undefined);
    if (!file) { setRemitoDataUrl(undefined); return; }
    if (file.size > 5 * 1024 * 1024) {
      setRemitoError("La imagen no puede superar 5 MB");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setRemitoDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const clearRemitoPhoto = () => {
    setRemitoDataUrl(undefined);
    setRemitoError(undefined);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = async (data: CreatePurchaseInput) => {
    const result = await createPurchase({ ...data, category, remitoUrl: remitoDataUrl });
    if ("success" in result) {
      setOpen(false);
      reset(defaultValues);
      clearRemitoPhoto();
      router.refresh();
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      reset(defaultValues);
      clearRemitoPhoto();
    }
    setOpen(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="h-4 w-4" />
          {category === "VARIOS" ? "Nueva Compra Varia" : "Nueva Compra"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{category === "VARIOS" ? "Registrar Compra Varia" : "Registrar Compra"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Proveedor — autocomplete para ambos tipos */}
          <div className="space-y-1.5">
            <Label>Proveedor / Comercio <span className="text-destructive">*</span></Label>
            <ProviderAutocomplete
              providers={providers}
              value={providerValue}
              onChange={(v) => setValue("provider", v, { shouldValidate: true })}
              placeholder={
                category === "VARIOS"
                  ? "Nombre del comercio o proveedor..."
                  : "Buscar o escribir proveedor..."
              }
              error={errors.provider?.message}
            />
            {errors.provider && (
              <p className="text-xs text-destructive">{errors.provider.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="invoiceNumber">Nº Factura / Ticket</Label>
              <Input id="invoiceNumber" {...register("invoiceNumber")} placeholder="FC-B-10001" />
              {errors.invoiceNumber && (
                <p className="text-xs text-destructive">{errors.invoiceNumber.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date">Fecha</Label>
              <Input id="date" type="date" {...register("date")} />
              {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="amount">Monto ($)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                {...register("amount")}
                placeholder="95000.00"
              />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="paymentMethod">Medio de Pago</Label>
              <select
                id="paymentMethod"
                {...register("paymentMethod")}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Sin especificar</option>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Remito */}
          <div className="space-y-1.5">
            <Label htmlFor="remito">Nº Remito</Label>
            <Input id="remito" {...register("remito")} placeholder="R-00001 (opcional)" />
          </div>

          {/* Foto del remito */}
          <div className="space-y-1.5">
            <Label>Foto del remito</Label>
            {remitoDataUrl ? (
              <div className="relative w-full overflow-hidden rounded-md border">
                <img
                  src={remitoDataUrl}
                  alt="Foto del remito"
                  className="max-h-40 w-full object-contain bg-muted"
                />
                <button
                  type="button"
                  onClick={clearRemitoPhoto}
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
                  onChange={handleRemitoPhoto}
                />
              </label>
            )}
            {remitoError && <p className="text-xs text-destructive">{remitoError}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
