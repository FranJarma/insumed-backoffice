"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { PlusCircle, ImagePlus, X, Loader2, FileText } from "lucide-react";
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
import { uploadFile, validateFile, fileUrl } from "@/lib/upload";

interface CreatePurchaseDialogProps {
  providers: MockProvider[];
  category?: "PROVEEDOR" | "VARIOS";
}

export function CreatePurchaseDialog({ providers, category = "PROVEEDOR" }: CreatePurchaseDialogProps) {
  const [open, setOpen] = useState(false);
  const [remitoKey, setRemitoKey] = useState<string | undefined>();
  const [remitoPreview, setRemitoPreview] = useState<string | undefined>();
  const [remitoName, setRemitoName] = useState<string | undefined>();
  const [remitoError, setRemitoError] = useState<string | undefined>();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const defaultValues = { provider: "", date: new Date().toISOString().split("T")[0], category };

  const {
    register, handleSubmit, reset, setValue, watch,
    formState: { errors, isSubmitting },
  } = useForm<CreatePurchaseInput>({
    resolver: zodResolver(createPurchaseSchema),
    defaultValues,
  });

  const providerValue = watch("provider") ?? "";
  const watchDate = watch("date");

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateFile(file);
    if (err) { setRemitoError(err); e.target.value = ""; return; }

    setRemitoError(undefined);
    setIsUploading(true);
    if (file.type.startsWith("image/")) setRemitoPreview(URL.createObjectURL(file));
    try {
      const key = await uploadFile(file, {
        directory: "remitos",
        date: watchDate || defaultValues.date,
      });
      setRemitoKey(key);
      setRemitoName(file.name);
    } catch {
      setRemitoError("Error al subir el archivo. Intente de nuevo.");
      if (remitoPreview) { URL.revokeObjectURL(remitoPreview); setRemitoPreview(undefined); }
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const clearRemito = () => {
    if (remitoPreview) URL.revokeObjectURL(remitoPreview);
    setRemitoKey(undefined);
    setRemitoPreview(undefined);
    setRemitoName(undefined);
    setRemitoError(undefined);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = async (data: CreatePurchaseInput) => {
    const result = await createPurchase({ ...data, category, remitoUrl: remitoKey });
    if ("success" in result) {
      setOpen(false);
      reset(defaultValues);
      clearRemito();
      router.refresh();
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) { reset(defaultValues); clearRemito(); }
    setOpen(isOpen);
  };

  const hasFile = remitoKey || remitoPreview;
  const isImage = hasFile && !remitoName?.endsWith(".pdf");

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="h-4 w-4" />
          {category === "VARIOS" ? "Nueva Compra Varia" : "Nueva Compra"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{category === "VARIOS" ? "Registrar Compra Varia" : "Registrar Compra"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Proveedor / Comercio <span className="text-destructive">*</span></Label>
            <ProviderAutocomplete
              providers={providers}
              value={providerValue}
              onChange={(v) => setValue("provider", v, { shouldValidate: true })}
              placeholder={category === "VARIOS" ? "Nombre del comercio o proveedor..." : "Buscar o escribir proveedor..."}
              error={errors.provider?.message}
            />
            {errors.provider && <p className="text-xs text-destructive">{errors.provider.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="invoiceNumber">Nº Factura / Ticket</Label>
              <Input id="invoiceNumber" {...register("invoiceNumber")} placeholder="FC-B-10001" />
              {errors.invoiceNumber && <p className="text-xs text-destructive">{errors.invoiceNumber.message}</p>}
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
              <Input id="amount" type="number" step="0.01" min="0" {...register("amount")} placeholder="95000.00" />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="paymentMethod">Medio de Pago <span className="text-destructive">*</span></Label>
              <select id="paymentMethod" {...register("paymentMethod")}
                className={`w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring ${errors.paymentMethod ? "border-destructive" : ""}`}>
                <option value="">Seleccionar...</option>
                {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              {errors.paymentMethod && <p className="text-xs text-destructive">{errors.paymentMethod.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="remito">Nº Remito</Label>
            <Input id="remito" {...register("remito")} placeholder="R-00001 (opcional)" />
          </div>

          {/* Foto / PDF del remito */}
          <div className="space-y-1.5">
            <Label>Foto del remito <span className="text-xs text-muted-foreground">(opcional — imagen o PDF)</span></Label>
            {hasFile ? (
              <div className="relative w-full overflow-hidden rounded-md border">
                {isImage ? (
                  <img src={remitoPreview} alt="Remito" className="max-h-40 w-full object-contain bg-muted" />
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3 bg-muted/50">
                    <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                    {remitoKey ? (
                      <a href={fileUrl(remitoKey)} target="_blank" rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline truncate">{remitoName}</a>
                    ) : (
                      <span className="text-sm text-muted-foreground truncate">{remitoName}</span>
                    )}
                  </div>
                )}
                <button type="button" onClick={clearRemito}
                  className="absolute right-1 top-1 rounded-full bg-background/80 p-1 hover:bg-background">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className={`flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-3 text-sm text-muted-foreground hover:bg-muted/50 transition-colors ${isUploading ? "pointer-events-none opacity-60" : ""}`}>
                {isUploading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <ImagePlus className="h-4 w-4 shrink-0" />}
                <span>{isUploading ? "Subiendo archivo..." : "Imagen (se comprime a 1 MB) · PDF máx. 2 MB"}</span>
                <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} disabled={isUploading} />
              </label>
            )}
            {remitoError && <p className="text-xs text-destructive">{remitoError}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting || isUploading}>
              {isSubmitting ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
