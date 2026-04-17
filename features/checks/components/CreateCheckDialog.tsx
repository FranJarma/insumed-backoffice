"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { PlusCircle, ImagePlus, X, Loader2, FileText } from "lucide-react";
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
import { deleteUploadedFile, fileUrl, uploadFile, validateFile } from "@/lib/upload";
import { EntityAutocomplete } from "./EntityAutocomplete";

type EntityOption = { id: string; name: string };

interface CreateCheckDialogProps {
  banks: MockBank[];
  clients: EntityOption[];
  providers: EntityOption[];
}

export function CreateCheckDialog({ banks, clients, providers }: CreateCheckDialogProps) {
  const [open, setOpen] = useState(false);
  const [photoKey, setPhotoKey] = useState<string | undefined>();
  const [photoPreview, setPhotoPreview] = useState<string | undefined>();
  const [photoName, setPhotoName] = useState<string | undefined>();
  const [photoError, setPhotoError] = useState<string | undefined>();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];

  const {
    register, handleSubmit, reset, setValue, watch,
    formState: { errors, isSubmitting, isValid },
  } = useForm<CreateCheckInput>({
    resolver: zodResolver(createCheckSchema),
    defaultValues: { issueDate: today, dueDate: today, kind: "COMUN" },
    mode: "onChange",
  });

  const selectedBank = watch("bank");
  const kind = watch("kind");
  const type = watch("type");
  const relatedEntity = watch("relatedEntity");
  const dueDate = watch("dueDate");

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateFile(file);
    if (err) { setPhotoError(err); e.target.value = ""; return; }

    setPhotoError(undefined);
    setIsUploading(true);
    if (file.type.startsWith("image/")) setPhotoPreview(URL.createObjectURL(file));
    try {
      const key = await uploadFile(file, {
        directory: "cheques",
        date: dueDate || today,
      });
      setPhotoKey(key);
      setPhotoName(file.name);
    } catch {
      setPhotoError("Error al subir el archivo. Intente de nuevo.");
      if (photoPreview) { URL.revokeObjectURL(photoPreview); setPhotoPreview(undefined); }
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const clearPhoto = (shouldDelete = true) => {
    if (shouldDelete && photoKey) {
      void deleteUploadedFile(photoKey).catch(() => undefined);
    }
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoKey(undefined);
    setPhotoPreview(undefined);
    setPhotoName(undefined);
    setPhotoError(undefined);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = async (data: CreateCheckInput) => {
    const result = await createCheck({ ...data, photoUrl: photoKey });
    if ("success" in result) {
      setOpen(false);
      reset({ issueDate: today, dueDate: today, kind: "COMUN" });
      clearPhoto(false);
      router.refresh();
    }
  };

  const handleClose = (o: boolean) => {
    if (!o) { reset({ issueDate: today, dueDate: today, kind: "COMUN" }); clearPhoto(); }
    setOpen(o);
  };

  const hasFile = photoKey || photoPreview;
  const isImage = hasFile && !photoName?.endsWith(".pdf");

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button><PlusCircle className="h-4 w-4" />Nuevo Cheque</Button>
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
                <select {...register("type")}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
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
                    <button key={k} type="button"
                      onClick={() => setValue("kind", k, { shouldValidate: true })}
                      className={`flex-1 rounded-md border py-1.5 text-sm font-medium transition-colors ${
                        kind === k ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground hover:bg-muted"
                      }`}>
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
                <Select value={selectedBank} onValueChange={(v) => setValue("bank", v, { shouldValidate: true })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar banco..." /></SelectTrigger>
                  <SelectContent>
                    {banks.map((b) => <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>)}
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
              <Label>
                {type === "EMITIDO" ? "Proveedor" : "Cliente"}
                <span className="ml-1 text-xs text-muted-foreground">(opcional)</span>
              </Label>
              <EntityAutocomplete
                entities={type === "EMITIDO" ? providers : clients}
                value={relatedEntity ?? ""}
                onChange={(v) => setValue("relatedEntity", v, { shouldValidate: true })}
                placeholder={type === "EMITIDO" ? "Buscar proveedor..." : "Buscar cliente..."}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notas <span className="text-xs text-muted-foreground">(opcional)</span></Label>
              <Input id="notes" {...register("notes")} placeholder="Observaciones opcionales" />
            </div>

            {/* Foto / PDF del cheque */}
            <div className="space-y-1.5">
              <Label>Foto del cheque <span className="text-xs text-muted-foreground">(opcional — imagen o PDF)</span></Label>
              {hasFile ? (
                <div className="relative w-full overflow-hidden rounded-md border">
                  {isImage ? (
                    <img src={photoPreview} alt="Cheque" className="max-h-40 w-full object-contain bg-muted" />
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 bg-muted/50">
                      <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                      {photoKey ? (
                        <a href={fileUrl(photoKey)} target="_blank" rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline truncate">{photoName}</a>
                      ) : (
                        <span className="text-sm text-muted-foreground truncate">{photoName}</span>
                      )}
                    </div>
                  )}
                  <button type="button" onClick={() => clearPhoto()}
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
              {photoError && <p className="text-xs text-destructive">{photoError}</p>}
            </div>

          </div>
          <div className="flex justify-end gap-2 px-6 py-4 border-t bg-background shrink-0">
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting || isUploading || !isValid}>
              {isSubmitting ? "Guardando..." : "Guardar Cheque"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
