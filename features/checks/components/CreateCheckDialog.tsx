"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { PlusCircle, ImagePlus, X } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCheck } from "../actions";
import { createCheckSchema, type CreateCheckInput } from "../types";
import type { MockBank } from "@/db/mock-store";

interface CreateCheckDialogProps {
  banks: MockBank[];
}

export function CreateCheckDialog({ banks }: CreateCheckDialogProps) {
  const [open, setOpen] = useState(false);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>();
  const [photoError, setPhotoError] = useState<string | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateCheckInput>({
    resolver: zodResolver(createCheckSchema),
    defaultValues: { issueDate: today, dueDate: today, kind: "COMUN" },
  });

  const selectedBank = watch("bank");
  const kind = watch("kind");

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setPhotoError(undefined);
    if (!file) { setPhotoDataUrl(undefined); return; }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError("La imagen no puede superar 5 MB");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPhotoDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const clearPhoto = () => {
    setPhotoDataUrl(undefined);
    setPhotoError(undefined);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = async (data: CreateCheckInput) => {
    const result = await createCheck({ ...data, photoUrl: photoDataUrl });
    if ("success" in result) {
      setOpen(false);
      reset({ issueDate: today, dueDate: today, kind: "COMUN" });
      clearPhoto();
      router.refresh();
    }
  };

  const handleClose = (o: boolean) => {
    if (!o) {
      reset({ issueDate: today, dueDate: today, kind: "COMUN" });
      clearPhoto();
    }
    setOpen(o);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="h-4 w-4" />
          Nuevo Cheque
        </Button>
      </DialogTrigger>
      <DialogContent className="flex flex-col sm:max-w-lg max-h-[90vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle>Registrar Cheque</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

            {/* Tipo + Tipo de cheque */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo <span className="text-destructive">*</span></Label>
                <select
                  {...register("type")}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Seleccionar...</option>
                  <option value="RECIBIDO">Recibido (de cliente)</option>
                  <option value="EMITIDO">Emitido (a proveedor)</option>
                </select>
                {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Tipo de cheque <span className="text-destructive">*</span></Label>
                <div className="flex gap-1.5">
                  {(["COMUN", "DIFERIDO"] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setValue("kind", k, { shouldValidate: true })}
                      className={`flex-1 rounded-md border py-1.5 text-sm font-medium transition-colors ${
                        kind === k
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {k === "COMUN" ? "Común" : "Diferido"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Nº Cheque + N° Operación */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="number">Nº Cheque <span className="text-destructive">*</span></Label>
                <Input id="number" {...register("number")} placeholder="12345678" />
                {errors.number && <p className="text-xs text-destructive">{errors.number.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="operationNumber">N° Operación <span className="text-xs text-muted-foreground">(opcional)</span></Label>
                <Input id="operationNumber" {...register("operationNumber")} placeholder="OP-2026-001" />
              </div>
            </div>

            {/* Banco + Monto */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Banco <span className="text-destructive">*</span></Label>
                <Select
                  value={selectedBank}
                  onValueChange={(v) => setValue("bank", v, { shouldValidate: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar banco..." />
                  </SelectTrigger>
                  <SelectContent>
                    {banks.map((b) => (
                      <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.bank && <p className="text-xs text-destructive">{errors.bank.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="amount">Monto ($) <span className="text-destructive">*</span></Label>
                <Input id="amount" type="number" step="0.01" min="0" {...register("amount")} placeholder="150000.00" />
                {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
              </div>
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="issueDate">Fecha de Emisión <span className="text-destructive">*</span></Label>
                <Input id="issueDate" type="date" {...register("issueDate")} />
                {errors.issueDate && <p className="text-xs text-destructive">{errors.issueDate.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dueDate">Fecha de Vencimiento <span className="text-destructive">*</span></Label>
                <Input id="dueDate" type="date" {...register("dueDate")} />
                {errors.dueDate && <p className="text-xs text-destructive">{errors.dueDate.message}</p>}
              </div>
            </div>

            {/* Fecha est. de cobro/pago */}
            <div className="space-y-1.5">
              <Label htmlFor="estimatedPaymentDate">
                Fecha est. de cobro/pago <span className="text-xs text-muted-foreground">(opcional)</span>
              </Label>
              <Input id="estimatedPaymentDate" type="date" {...register("estimatedPaymentDate")} />
            </div>

            {/* Entidad + Notas */}
            <div className="space-y-1.5">
              <Label htmlFor="relatedEntity">Entidad <span className="text-xs text-muted-foreground">(cliente / proveedor)</span></Label>
              <Input id="relatedEntity" {...register("relatedEntity")} placeholder="OSDE / Distribuidora Médica SA" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notas <span className="text-xs text-muted-foreground">(opcional)</span></Label>
              <Input id="notes" {...register("notes")} placeholder="Observaciones opcionales" />
            </div>

            {/* Foto */}
            <div className="space-y-1.5">
              <Label>Foto del cheque <span className="text-xs text-muted-foreground">(opcional)</span></Label>
              {photoDataUrl ? (
                <div className="relative w-full overflow-hidden rounded-md border">
                  <img src={photoDataUrl} alt="Foto del cheque" className="max-h-40 w-full object-contain bg-muted" />
                  <button type="button" onClick={clearPhoto} className="absolute right-1 top-1 rounded-full bg-background/80 p-1 hover:bg-background">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-3 text-sm text-muted-foreground hover:bg-muted/50 transition-colors">
                  <ImagePlus className="h-4 w-4 shrink-0" />
                  <span>Seleccionar imagen (JPG, PNG — máx. 5 MB)</span>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                </label>
              )}
              {photoError && <p className="text-xs text-destructive">{photoError}</p>}
            </div>

          </div>
          <div className="flex justify-end gap-2 px-6 py-4 border-t bg-background shrink-0">
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar Cheque"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
