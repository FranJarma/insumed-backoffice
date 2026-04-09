"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, FileText, ImagePlus, Loader2, X } from "lucide-react";
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
import { cancelSale } from "../actions";
import { cancelSaleSchema, type CancelSaleInput } from "../types";
import { uploadFile, validateFile, fileUrl } from "@/lib/upload";

interface CancelSaleDialogProps {
  saleId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CancelSaleDialog({
  saleId,
  open,
  onOpenChange,
  onSuccess,
}: CancelSaleDialogProps) {
  const [creditNoteKey, setCreditNoteKey] = useState<string | undefined>();
  const [creditNotePreview, setCreditNotePreview] = useState<string | undefined>();
  const [creditNoteName, setCreditNoteName] = useState<string | undefined>();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CancelSaleInput>({
    resolver: zodResolver(cancelSaleSchema),
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!fileInputRef.current) return;
    fileInputRef.current.value = "";
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setUploadError(validationError);
      return;
    }

    setUploadError(null);
    setCreditNoteName(file.name);

    if (file.type.startsWith("image/")) {
      const preview = URL.createObjectURL(file);
      setCreditNotePreview(preview);
    }

    setIsUploading(true);
    try {
      const key = await uploadFile(file, { directory: "facturas", date: new Date().toISOString().slice(0, 10) });
      setCreditNoteKey(key);
      setValue("creditNoteUrl", key);
    } catch {
      setUploadError("Error al subir el archivo. Intentá de nuevo.");
    } finally {
      setIsUploading(false);
    }
  };

  const clearFile = () => {
    if (creditNotePreview) URL.revokeObjectURL(creditNotePreview);
    setCreditNoteKey(undefined);
    setCreditNotePreview(undefined);
    setCreditNoteName(undefined);
    setValue("creditNoteUrl", undefined);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      clearFile();
      reset();
    }
    onOpenChange(isOpen);
  };

  const onSubmit = async (data: CancelSaleInput) => {
    if (!saleId) return;
    const result = await cancelSale(saleId, data);
    if ("success" in result) {
      clearFile();
      reset();
      onSuccess();
    }
  };

  const isPdf = creditNoteName?.toLowerCase().endsWith(".pdf");

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Anular Factura
          </DialogTitle>
          <DialogDescription>
            Esta acción anulará la factura. Se requiere el número de nota de crédito correspondiente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="creditNoteNumber">Número de Nota de Crédito</Label>
            <Input
              id="creditNoteNumber"
              {...register("creditNoteNumber")}
              placeholder="NC-A-00001"
            />
            {errors.creditNoteNumber && (
              <p className="text-xs text-destructive">{errors.creditNoteNumber.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>
              Archivo de Nota de Crédito{" "}
              <span className="text-xs text-muted-foreground">(opcional)</span>
            </Label>

            {!creditNoteKey && !isUploading && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                <ImagePlus className="h-4 w-4" />
                Adjuntar PDF o imagen
              </button>
            )}

            {isUploading && (
              <div className="flex items-center gap-2 rounded-md border px-4 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Subiendo archivo...
              </div>
            )}

            {creditNoteKey && !isUploading && (
              <div className="relative rounded-md border bg-muted/30 p-2">
                <button
                  type="button"
                  onClick={clearFile}
                  className="absolute right-1 top-1 rounded-full bg-background p-0.5 shadow hover:bg-destructive hover:text-white transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                {isPdf ? (
                  <a
                    href={fileUrl(creditNoteKey)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline px-1"
                  >
                    <FileText className="h-4 w-4 shrink-0" />
                    {creditNoteName}
                  </a>
                ) : creditNotePreview ? (
                  <img src={creditNotePreview} alt="Preview" className="max-h-32 w-full rounded object-contain" />
                ) : null}
              </div>
            )}

            {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={isSubmitting || isUploading}>
              {isSubmitting ? "Anulando..." : "Confirmar Anulación"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
